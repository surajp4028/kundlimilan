import "server-only";
import crypto from "node:crypto";
import { exec, query, queryOne, sqlDate, transaction } from "./db";
import { decrypt, encrypt } from "./crypto";
import { ApiError } from "./http";
import { audit } from "./audit";
import { getAllSettings, getNumberSetting, getSetting } from "./settings";
import { getServiceById, buildPdfForm, subjectOf, type OrderInput, type Service } from "./services";
import { createOrder as rzpCreateOrder, type RzpPayment } from "./payments/razorpay";
import { recordAttempt } from "./payments/attempts";
import { logProvider } from "./payments/log";
import { autoRefundFailedOrder } from "./payments/refunds";
import { markCouponUsed, releaseCoupon, reserveCoupon } from "./coupons";
import { astroPdf, downloadProviderPdf } from "./astro/client";
import { putObject, userKey } from "./storage";
import { sendResendEmail } from "./notify";
import { env } from "./env";

/* =====================================================================
 * Order lifecycle
 *
 *  POST /api/orders              price from OUR catalogue (never the browser) → coupon reserved
 *                                → INSERT order (ASTR…, hold) → Razorpay order → checkout options
 *  POST /api/orders/verify       HMAC(order_id|payment_id) with OUR stored order id + GET /v1/payments/{id}
 *  POST /api/payments/razorpay/webhook   signed + re-fetched (source of truth in production)
 *        → confirmPayment() is idempotent: the first caller marks it paid and starts the report
 *  generateReport()              claim → AstrologyAPI PDF → download + verify → S3 → reports row
 *                                → email; retries with back-off; auto-refund after the last failure
 * ===================================================================== */

export const ORDER_REF_RE = /^ASTR[A-F0-9]{10}$/;
export const newOrderRef = () => "ASTR" + crypto.randomBytes(5).toString("hex").toUpperCase();

export type OrderRow = {
  id: number; order_ref: string; user_uid: string; service_id: number; service_slug: string; title: string; subject_enc: string | null; input_enc: string;
  language: string; price_paise: number; discount_paise: number; amount_paise: number; coupon_code: string | null; currency: string;
  status: "pending" | "paid" | "completed" | "failed" | "refunded" | "cancelled"; payment_status: "unpaid" | "paid" | "refunded" | "failed";
  pay_order_id: string | null; pay_payment_id: string | null; pay_method: string | null; paid_at: Date | null;
  report_status: "not_started" | "generating" | "ready" | "failed"; report_attempts: number; report_error: string | null; report_started_at: Date | null;
  completed_at: Date | null; notified_at: Date | null; hold_expires_at: Date | null; created_at: Date; updated_at: Date;
};

/* ------------------------------- Create ------------------------------- */

export async function createOrder(p: { user: { id: number; uid: string }; service: Service; input: OrderInput; language: string; couponCode?: string | null; ip: string; prefill: { name?: string; email?: string; contact?: string } }) {
  const s = p.service;
  if (s.status !== "active") throw new ApiError(404, "SERVICE_UNAVAILABLE", "This report is not available right now.");
  if (s.inputKind !== p.input.kind) throw new ApiError(422, "INPUT_KIND", "Please fill in the details this report needs.");
  if (!s.languages.includes(p.language)) throw new ApiError(422, "LANGUAGE", "This language isn't available for this report.");
  await expireStaleOrders();

  const ref = newOrderRef();
  const hold = await getNumberSetting("order_hold_minutes", 30);
  const subject = subjectOf(p.input);
  const priced = await transaction(async (conn) => {
    let discount = 0;
    let code: string | null = null;
    if (p.couponCode) {
      const c = await reserveCoupon(conn, { code: p.couponCode, uid: p.user.uid, slug: s.slug, pricePaise: s.price, orderRef: ref });
      discount = c.discountPaise;
      code = c.code;
    }
    const amount = s.price - discount;
    await conn.query(
      `INSERT INTO orders (order_ref, user_uid, service_id, service_slug, title, subject_enc, input_enc, language, price_paise, discount_paise, amount_paise, coupon_code, hold_expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, UTC_TIMESTAMP() + INTERVAL ? MINUTE)`,
      [ref, p.user.uid, s.id, s.slug, s.title, await encrypt(subject), await encrypt(JSON.stringify(p.input)), p.language, s.price, discount, amount, code, hold],
    );
    return { amount, discount, code };
  });

  let rzp;
  try {
    rzp = await rzpCreateOrder({ amountPaise: priced.amount, receipt: ref, orderRef: ref, notes: { order_ref: ref, service: s.slug, uid: p.user.uid } });
  } catch (e) {
    await exec("UPDATE orders SET status = 'cancelled', payment_status = 'failed' WHERE order_ref = ?", [ref]);
    await releaseCoupon(ref);
    throw e;
  }
  await exec("UPDATE orders SET pay_order_id = ? WHERE order_ref = ?", [rzp.id, ref]);
  await audit({ actorType: "user", actorId: p.user.id, action: "order.created", targetType: "order", targetId: ref, ip: p.ip, meta: { service: s.slug, amount: priced.amount, coupon: priced.code } });
  return { ref, rzpOrderId: rzp.id, amount: rzp.amount, currency: rzp.currency, discount: priced.discount, coupon: priced.code, subject, holdMinutes: hold };
}

/** Unpaid orders past their hold (+ grace) become cancelled and give their coupon back. */
export async function expireStaleOrders() {
  const stale = await query<{ order_ref: string }>(
    "SELECT order_ref FROM orders WHERE status = 'pending' AND payment_status = 'unpaid' AND hold_expires_at < UTC_TIMESTAMP() - INTERVAL 30 MINUTE LIMIT 50",
  );
  for (const o of stale) {
    const r = await exec("UPDATE orders SET status = 'cancelled' WHERE order_ref = ? AND status = 'pending' AND payment_status = 'unpaid'", [o.order_ref]);
    if (r.affectedRows) await releaseCoupon(o.order_ref);
  }
}

/* ------------------------------- Payment ------------------------------- */

/**
 * Idempotent: called from checkout verify AND the webhook with a payment fetched from Razorpay's API.
 * Late payments for cancelled orders are still honoured (the customer paid) — the report is generated.
 */
export async function confirmPayment(rzpOrderId: string, payment: RzpPayment, source: "checkout" | "webhook" | "reconcile") {
  const o = await queryOne<OrderRow>("SELECT * FROM orders WHERE pay_order_id = ?", [rzpOrderId]);
  if (!o) return { ok: false as const, reason: "not_found" };
  await recordAttempt({ orderRef: o.order_ref, userUid: o.user_uid, payment, source, verified: true });
  if (payment.order_id !== rzpOrderId) return { ok: false as const, reason: "order_mismatch" };
  if (payment.status !== "captured") return { ok: false as const, reason: `payment_${payment.status}` };

  if (payment.amount !== Number(o.amount_paise) || payment.currency !== "INR") {
    const upd = await exec("UPDATE orders SET status = 'failed', payment_status = 'paid', pay_payment_id = ?, paid_at = UTC_TIMESTAMP(), report_error = 'Amount mismatch' WHERE order_ref = ? AND payment_status = 'unpaid'", [payment.id, o.order_ref]);
    if (upd.affectedRows) {
      await logProvider({ orderRef: o.order_ref, provider: "kundlimilan", direction: "inbound", action: "payment.amount_mismatch", outcome: "error", amountPaise: payment.amount, request: { expected: o.amount_paise }, response: { got: payment.amount, currency: payment.currency } });
      void autoRefundFailedOrder(o.order_ref, "amount mismatch");
    }
    return { ok: false as const, reason: "amount_mismatch" };
  }

  const upd = await exec(
    "UPDATE orders SET status = 'paid', payment_status = 'paid', pay_payment_id = ?, pay_method = ?, paid_at = UTC_TIMESTAMP() WHERE order_ref = ? AND payment_status = 'unpaid'",
    [payment.id, payment.method?.slice(0, 24) ?? null, o.order_ref],
  );
  if (upd.affectedRows) {
    await markCouponUsed(o.order_ref);
    await audit({ actorType: "system", action: "order.paid", targetType: "order", targetId: o.order_ref, meta: { source, paymentId: payment.id, amount: payment.amount } });
    void generateReport(o.order_ref, "payment").catch((e) => console.error("[report] generate failed", (e as Error).message));
  }
  return { ok: true as const, ref: o.order_ref, firstConfirmation: upd.affectedRows === 1 };
}

/* ------------------------------- Report ------------------------------- */

async function branding() {
  const s = await getAllSettings();
  const base = (process.env.PUBLIC_BASE_URL || env.appUrl).replace(/\/+$/, "");
  const autoLogo = s.logo_mode === "upload" && s.logo_key && base.startsWith("https://") ? `${base}/api/public/logo?v=${s.logo_version}` : "";
  return {
    company_name: s.pdf_company_name || s.site_name, company_info: s.pdf_company_info, domain_url: s.pdf_domain_url, footer_link: s.pdf_footer_link,
    company_email: s.pdf_company_email || s.support_email, company_landline: s.pdf_company_landline, company_mobile: s.pdf_company_mobile || s.support_phone,
    logo_url: s.pdf_logo_url || autoLogo, chart_style: s.pdf_chart_style || "NORTH_INDIAN",
  };
}

const retryTimers = new Map<string, NodeJS.Timeout>();

/**
 * Generates (or re-generates) the report for a PAID order. Safe to call repeatedly:
 * an atomic claim makes sure only one worker generates at a time.
 */
export async function generateReport(ref: string, by: string): Promise<{ ok: boolean; error?: string }> {
  const claim = await exec(
    `UPDATE orders SET report_status = 'generating', report_attempts = report_attempts + 1, report_started_at = UTC_TIMESTAMP(), report_error = NULL
      WHERE order_ref = ? AND payment_status = 'paid' AND status <> 'refunded'
        AND (report_status IN ('not_started','failed') OR (report_status = 'generating' AND report_started_at < UTC_TIMESTAMP() - INTERVAL 10 MINUTE))`,
    [ref],
  );
  if (claim.affectedRows !== 1) return { ok: false, error: "Report is already being generated or isn't due." };
  const o = (await queryOne<OrderRow>("SELECT * FROM orders WHERE order_ref = ?", [ref]))!;
  const service = await getServiceById(o.service_id);
  const fail = async (error: string, retryable: boolean) => {
    const max = await getNumberSetting("report_max_attempts", 3);
    const final = !retryable || o.report_attempts >= max;
    await exec("UPDATE orders SET report_status = 'failed', report_error = ?, status = IF(?, 'failed', status) WHERE order_ref = ?", [error.slice(0, 300), final ? 1 : 0, ref]);
    await audit({ actorType: "system", action: final ? "report.failed" : "report.retry_scheduled", targetType: "order", targetId: ref, meta: { by, error, attempt: o.report_attempts } });
    if (!final) {
      clearTimeout(retryTimers.get(ref));
      retryTimers.set(ref, setTimeout(() => void generateReport(ref, "auto-retry").catch(() => {}), 20_000 * o.report_attempts));
    } else if ((await getSetting("auto_refund_failed")) === "on" && by !== "admin") {
      await autoRefundFailedOrder(ref, error);
    }
    return { ok: false, error };
  };
  if (!service) return fail("Service no longer exists", false);

  let input: OrderInput;
  try {
    input = JSON.parse(await decrypt(o.input_enc)) as OrderInput;
  } catch {
    return fail("Birth details could not be read", false);
  }

  const user = await queryOne<{ id: number }>("SELECT id FROM users WHERE uid = ?", [o.user_uid]);
  const form = buildPdfForm(service.endpoint, input, o.language, await branding());
  const pdf = await astroPdf(service.endpoint, form, { orderRef: ref, userId: user?.id });
  if (!pdf.ok) return fail(pdf.error, pdf.retryable);

  let bytes: Uint8Array;
  try {
    bytes = await downloadProviderPdf(pdf.url);
  } catch (e) {
    return fail((e as Error).message, true);
  }
  const key = userKey(o.user_uid, "reports", `${ref}_${service.slug}.pdf`);
  try {
    await putObject(key, bytes, "application/pdf");
  } catch (e) {
    return fail(`Storage: ${(e as Error).message}`, true);
  }
  const subject = (await decrypt(o.subject_enc)) || service.title;
  await exec(
    `INSERT INTO reports (order_ref, user_uid, service_slug, title, file_key_enc, size_bytes, sha256) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE file_key_enc = VALUES(file_key_enc), size_bytes = VALUES(size_bytes), sha256 = VALUES(sha256), title = VALUES(title), created_at = CURRENT_TIMESTAMP`,
    [ref, o.user_uid, service.slug, `${service.title} — ${subject}`.slice(0, 120), await encrypt(key), bytes.length, crypto.createHash("sha256").update(bytes).digest("hex")],
  );
  await exec("UPDATE orders SET report_status = 'ready', report_error = NULL, status = IF(status = 'refunded', status, 'completed'), completed_at = UTC_TIMESTAMP() WHERE order_ref = ?", [ref]);
  await audit({ actorType: "system", action: "report.ready", targetType: "order", targetId: ref, meta: { by, bytes: bytes.length } });
  void notifyReportReady(ref, bytes).catch(() => {});
  return { ok: true };
}

/** Emails the customer (with the PDF attached when small enough). Logged in provider logs. */
export async function notifyReportReady(ref: string, bytes?: Uint8Array) {
  if ((await getSetting("notify_email")) !== "on") return;
  const o = await queryOne<OrderRow & { email_enc: string | null; name_enc: string | null }>(
    "SELECT o.*, u.email_enc, u.name_enc FROM orders o JOIN users u ON u.uid = o.user_uid WHERE o.order_ref = ?",
    [ref],
  );
  if (!o) return;
  const email = await decrypt(o.email_enc);
  if (!email) return;
  const s = await getAllSettings();
  const name = (await decrypt(o.name_enc)) || "there";
  const subject = (await decrypt(o.subject_enc)) || "";
  const base = (process.env.PUBLIC_BASE_URL || env.appUrl).replace(/\/+$/, "");
  const link = `${base}/account?tab=reports`;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<div style="font-family:Georgia,serif;background:#0b0820;color:#f4ead2;padding:32px;border-radius:16px;max-width:560px;margin:auto">
    <div style="letter-spacing:.3em;color:${esc(s.brand_color)};font-size:12px">✦ ${esc(s.site_name)} ✦</div>
    <h1 style="font-weight:400;font-size:26px;margin:16px 0 8px">Your ${esc(o.title)} is ready</h1>
    <p style="color:#cfc4ad;line-height:1.6">Namaste ${esc(name)}, your report for <b>${esc(subject)}</b> (order ${esc(ref)}) has been prepared.${bytes && bytes.length < 7_000_000 ? " It is attached to this email and" : " It is"} always available in your account.</p>
    <a href="${esc(link)}" style="display:inline-block;margin-top:12px;background:${esc(s.brand_color)};color:#1a1206;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:600">Open my reports</a>
    <p style="color:#8f86a8;font-size:12px;margin-top:28px">${esc(s.footer_note)}</p></div>`;
  const res = await sendResendEmail({
    to: email, subject: `Your ${o.title} is ready · ${s.site_name}`, html, text: `Your ${o.title} (${ref}) is ready: ${link}`,
    attachments: bytes && bytes.length < 7_000_000 ? [{ filename: `${o.service_slug}-${ref}.pdf`, content: bytes }] : undefined,
  });
  await logProvider({ orderRef: ref, provider: "resend", direction: "outbound", action: "email.report_ready", httpStatus: res.status, outcome: res.ok ? "ok" : "error", request: res.request, response: res.response });
  if (res.ok) await exec("UPDATE orders SET notified_at = UTC_TIMESTAMP() WHERE order_ref = ?", [ref]);
}

/* ------------------------------- Reads ------------------------------- */

export async function orderForUser(ref: string, uid: string) {
  if (!ORDER_REF_RE.test(ref)) return null;
  return queryOne<OrderRow>("SELECT * FROM orders WHERE order_ref = ? AND user_uid = ?", [ref, uid]);
}

export async function publicOrder(o: OrderRow) {
  const r = await queryOne<{ size_bytes: number; download_count: number; created_at: Date }>("SELECT size_bytes, download_count, created_at FROM reports WHERE order_ref = ?", [o.order_ref]);
  return {
    ref: o.order_ref, service: o.service_slug, title: o.title, subject: (await decrypt(o.subject_enc)) || null, language: o.language,
    price: o.price_paise, discount: o.discount_paise, amount: o.amount_paise, coupon: o.coupon_code,
    status: o.status, paymentStatus: o.payment_status, reportStatus: o.report_status, method: o.pay_method, paymentId: o.pay_payment_id,
    paidAt: o.paid_at, completedAt: o.completed_at, createdAt: o.created_at,
    report: r ? { size: r.size_bytes, downloads: r.download_count, at: r.created_at, url: `/api/reports/${o.order_ref}` } : null,
    invoiceUrl: o.payment_status !== "unpaid" ? `/api/orders/${o.order_ref}/invoice` : null,
  };
}

export async function listUserOrders(uid: string) {
  const rows = await query<OrderRow>("SELECT * FROM orders WHERE user_uid = ? AND NOT (status = 'cancelled' AND payment_status = 'unpaid' AND created_at < UTC_TIMESTAMP() - INTERVAL 2 DAY) ORDER BY id DESC LIMIT 200", [uid]);
  return Promise.all(rows.map(publicOrder));
}

export async function listUserReports(uid: string) {
  const rows = await query<{ order_ref: string; service_slug: string; title: string; size_bytes: number; download_count: number; last_downloaded_at: Date | null; created_at: Date; language: string; status: string }>(
    `SELECT r.order_ref, r.service_slug, r.title, r.size_bytes, r.download_count, r.last_downloaded_at, r.created_at, o.language, o.status
       FROM reports r JOIN orders o ON o.order_ref = r.order_ref WHERE r.user_uid = ? ORDER BY r.id DESC LIMIT 200`,
    [uid],
  );
  return rows.map((r) => ({ ref: r.order_ref, service: r.service_slug, title: r.title, size: r.size_bytes, downloads: r.download_count, lastDownloadedAt: r.last_downloaded_at, at: r.created_at, language: r.language, url: `/api/reports/${r.order_ref}` }));
}

export const decryptInput = async (o: Pick<OrderRow, "input_enc">) => {
  try {
    return JSON.parse(await decrypt(o.input_enc)) as OrderInput;
  } catch {
    return null;
  }
};

export { sqlDate };
