import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { exec, queryOne } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { confirmPayment, generateReport, notifyReportReady, ORDER_REF_RE } from "@/lib/server/orders";
import { createRefund, syncRefundsForOrder } from "@/lib/server/payments/refunds";
import { fetchOrderPayments } from "@/lib/server/payments/razorpay";
import { releaseCoupon } from "@/lib/server/coupons";

// report generation (AstrologyAPI can take ~60 s) runs after the response — give it time to finish on Vercel
export const maxDuration = 300;

type Ctx = { params: Promise<{ ref: string }> };
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("regenerate") }),
  z.object({ action: z.literal("resend_email") }),
  z.object({ action: z.literal("reconcile") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("refund"), amount: z.number().int().min(100).optional(), reason: z.string().trim().min(3).max(200) }),
]);

export const POST = route<Ctx>(async (req: NextRequest, { params }) => {
  const ref = (await params).ref;
  if (!ORDER_REF_RE.test(ref)) throw new ApiError(404, "NOT_FOUND", "Order not found");
  const b = await readJson(req, body);
  const a = await requireAdmin(b.action === "refund" ? "payments.refund" : "orders.manage");
  const o = await queryOne<{ status: string; payment_status: string; report_status: string; pay_order_id: string | null }>("SELECT status, payment_status, report_status, pay_order_id FROM orders WHERE order_ref = ?", [ref]);
  if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found");
  const ip = getClientIp(req.headers);
  let result: Record<string, unknown> = {};

  if (b.action === "regenerate") {
    if (o.payment_status !== "paid") throw new ApiError(409, "NOT_PAID", "Only paid orders can generate a report.");
    // allow a fresh run even after "ready" (e.g. branding changed)
    await exec("UPDATE orders SET report_status = 'failed', report_attempts = 0, status = IF(status IN ('failed','completed'), 'paid', status) WHERE order_ref = ? AND report_status <> 'generating'", [ref]);
    const r = await generateReport(ref, "admin");
    if (!r.ok) throw new ApiError(502, "REPORT_FAILED", r.error || "Report could not be generated.");
    result = { generated: true };
  } else if (b.action === "resend_email") {
    if (o.report_status !== "ready") throw new ApiError(409, "NOT_READY", "The report isn't ready yet.");
    await notifyReportReady(ref);
  } else if (b.action === "reconcile") {
    if (!o.pay_order_id) throw new ApiError(409, "NO_ORDER", "No Razorpay order for this order.");
    const list = await fetchOrderPayments(o.pay_order_id, ref);
    let confirmed = false;
    for (const p of list.items) {
      const r = await confirmPayment(o.pay_order_id, p, "reconcile");
      if (r.ok) confirmed = true;
    }
    const refunds = await syncRefundsForOrder(ref).catch(() => 0);
    result = { payments: list.count, confirmed, refunds };
  } else if (b.action === "cancel") {
    if (o.payment_status !== "unpaid") throw new ApiError(409, "PAID", "Paid orders can't be cancelled — refund instead.");
    await exec("UPDATE orders SET status = 'cancelled' WHERE order_ref = ? AND payment_status = 'unpaid'", [ref]);
    await releaseCoupon(ref);
  } else if (b.action === "refund") {
    const r = await createRefund(ref, { amountPaise: b.amount, reason: b.reason, by: `admin:${a.id}` });
    result = { refund: { id: r.id, status: r.status, amount: r.amount } };
  }
  await audit({ actorType: "admin", actorId: a.id, action: `order.${b.action}`, targetType: "order", targetId: ref, ip, meta: b.action === "refund" ? { amount: b.amount ?? "full", reason: b.reason } : undefined });
  return ok(result);
});
