import "server-only";
import { exec, query, queryOne } from "../db";
import { decrypt, encrypt } from "../crypto";
import { ApiError } from "../http";
import { logProvider } from "./log";
import { fetchPaymentRefunds, fetchRefund, refundPayment, type RzpRefund } from "./razorpay";
import { releaseCoupon } from "../coupons";

/* =====================================================================
 * Refunds (Razorpay POST /v1/payments/{id}/refund).
 *  - automatic, full amount, when a paid report can't be generated (setting)
 *  - by an admin (full or partial) from the order panel
 *  - status kept in sync from refund.processed / refund.failed webhooks
 * Total refunded can never exceed what was paid.
 * ===================================================================== */

type O = { order_ref: string; status: string; payment_status: string; amount_paise: number; pay_payment_id: string | null };

export async function refundedSoFar(ref: string) {
  const r = await queryOne<{ n: number | null }>("SELECT SUM(amount_paise) n FROM refunds WHERE order_ref = ? AND status <> 'failed'", [ref]);
  return Number(r?.n || 0);
}

export async function createRefund(ref: string, opts: { amountPaise?: number; reason: string; by: string }) {
  const o = await queryOne<O>("SELECT order_ref, status, payment_status, amount_paise, pay_payment_id FROM orders WHERE order_ref = ?", [ref]);
  if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found");
  if (!o.pay_payment_id || (o.payment_status !== "paid" && o.payment_status !== "refunded")) throw new ApiError(409, "NOT_PAID", "Only paid orders can be refunded.");
  const done = await refundedSoFar(ref);
  const left = o.amount_paise - done;
  const amount = opts.amountPaise ?? left;
  if (!Number.isInteger(amount) || amount < 100) throw new ApiError(422, "BAD_AMOUNT", "Refund at least ₹1.");
  if (amount > left) throw new ApiError(409, "OVER_REFUND", `Only ₹${(left / 100).toFixed(2)} is left to refund on this order.`);

  let r: RzpRefund;
  try {
    r = await refundPayment(o.pay_payment_id, amount, { orderRef: ref, reason: opts.reason, receipt: `RF_${ref}_${done ? "P" : "F"}${Date.now() % 100000}` });
  } catch (e) {
    await exec("INSERT INTO refunds (order_ref, payment_id, amount_paise, status, reason, initiated_by, data_enc) VALUES (?,?,?,?,?,?,?)", [
      ref, o.pay_payment_id, amount, "failed", opts.reason.slice(0, 200), opts.by.slice(0, 32), await encrypt(JSON.stringify({ error: (e as Error).message })),
    ]);
    throw e;
  }
  await exec("INSERT INTO refunds (order_ref, payment_id, refund_id, amount_paise, status, reason, initiated_by, data_enc) VALUES (?,?,?,?,?,?,?,?)", [
    ref, o.pay_payment_id, r.id, r.amount, r.status, opts.reason.slice(0, 200), opts.by.slice(0, 32), await encrypt(JSON.stringify(r)),
  ]);
  await syncOrderRefundState(ref);
  return r;
}

/** Order state follows what Razorpay has actually PROCESSED (full → "refunded", coupon released). */
export async function syncOrderRefundState(ref: string) {
  const o = await queryOne<{ amount_paise: number; status: string; report_status: string }>("SELECT amount_paise, status, report_status FROM orders WHERE order_ref = ?", [ref]);
  if (!o) return;
  const processed = Number((await queryOne<{ n: number | null }>("SELECT SUM(amount_paise) n FROM refunds WHERE order_ref = ? AND status = 'processed'", [ref]))?.n || 0);
  if (processed >= o.amount_paise) {
    await exec("UPDATE orders SET status = 'refunded', payment_status = 'refunded' WHERE order_ref = ?", [ref]);
    await releaseCoupon(ref);
  } else if (o.status === "refunded") {
    await exec("UPDATE orders SET status = ?, payment_status = 'paid' WHERE order_ref = ?", [o.report_status === "ready" ? "completed" : "failed", ref]);
  }
}

async function upsertRefund(r: RzpRefund, by: string) {
  const order = await queryOne<{ order_ref: string }>("SELECT order_ref FROM orders WHERE pay_payment_id = ?", [r.payment_id]);
  if (!order) return null; // not an ASTRO payment
  const existing = await queryOne<{ id: number }>("SELECT id FROM refunds WHERE refund_id = ?", [r.id]);
  if (existing) await exec("UPDATE refunds SET status = ?, amount_paise = ?, data_enc = ? WHERE id = ?", [r.status, r.amount, await encrypt(JSON.stringify(r)), existing.id]);
  else
    await exec("INSERT INTO refunds (order_ref, payment_id, refund_id, amount_paise, status, reason, initiated_by, data_enc) VALUES (?,?,?,?,?,?,?,?)", [
      order.order_ref, r.payment_id, r.id, r.amount, r.status, (r.notes?.reason || "Refunded from the Razorpay Dashboard").slice(0, 200), by, await encrypt(JSON.stringify(r)),
    ]);
  await syncOrderRefundState(order.order_ref);
  return order.order_ref;
}

/** Webhook refund.* — the refund is re-read from Razorpay before its status is trusted. */
export async function updateRefundFromWebhook(r: RzpRefund) {
  if (!r?.id || !r.payment_id) return false;
  const fresh = await fetchRefund(r.payment_id, r.id).catch(() => null);
  if (!fresh || fresh.payment_id !== r.payment_id) return false;
  return !!(await upsertRefund(fresh, "razorpay"));
}

/** Pull every refund Razorpay has for this order's payment (dashboard refunds included). */
export async function syncRefundsForOrder(ref: string) {
  const o = await queryOne<{ pay_payment_id: string | null }>("SELECT pay_payment_id FROM orders WHERE order_ref = ?", [ref]);
  if (!o?.pay_payment_id) return 0;
  const list = await fetchPaymentRefunds(o.pay_payment_id, ref);
  for (const r of list.items) await upsertRefund(r, "razorpay");
  return list.count;
}

export function refundState(paidPaise: number, processed: number, pending: number) {
  if (processed >= paidPaise && paidPaise > 0) return "refunded" as const;
  if (pending > 0) return "pending" as const;
  if (processed > 0) return "partial" as const;
  return "none" as const;
}

/** Called when a paid report couldn't be generated. Never throws — failures are logged for the team. */
export async function autoRefundFailedOrder(ref: string, reason: string) {
  try {
    await createRefund(ref, { reason: `Report not generated: ${reason}`.slice(0, 200), by: "system" });
  } catch (e) {
    await logProvider({ orderRef: ref, provider: "kundlimilan", direction: "outbound", action: "refund.auto_failed", outcome: "error", request: { reason }, response: { error: (e as Error).message } });
  }
}

export async function listRefunds(ref: string) {
  const rows = await query<{ id: number; refund_id: string | null; amount_paise: number; status: string; reason: string | null; initiated_by: string; created_at: Date; updated_at: Date; data_enc: string | null }>(
    "SELECT id, refund_id, amount_paise, status, reason, initiated_by, created_at, updated_at, data_enc FROM refunds WHERE order_ref = ? ORDER BY id",
    [ref],
  );
  return Promise.all(
    rows.map(async ({ data_enc, ...r }) => {
      let data: unknown = null;
      try {
        data = data_enc ? JSON.parse(await decrypt(data_enc)) : null;
      } catch {}
      return { ...r, data };
    }),
  );
}
