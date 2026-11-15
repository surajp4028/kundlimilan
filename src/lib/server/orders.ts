import "server-only";
import crypto from "node:crypto";
import { exec, query, queryOne, sqlDate, transaction } from "./db";
import { decrypt, encrypt, signRef } from "./crypto";
import { ApiError } from "./http";
import { audit } from "./audit";
import { getAllSettings, getNumberSetting, getSetting } from "./settings";
import { getServiceById, buildPdfForm, palmPhotoKey, subjectOf, type OrderInput, type Service } from "./services";
import { createOrder as rzpCreateOrder, type RzpPayment } from "./payments/razorpay";
import { recordAttempt } from "./payments/attempts";
import { logProvider } from "./payments/log";
import { autoRefundFailedOrder } from "./payments/refunds";
import { markCouponUsed, releaseCoupon, reserveCoupon } from "./coupons";
import { astroPdf, downloadProviderPdf } from "./astro/client";
import { palmReport, palmScan } from "./astro/palm";
import { getObject, putObject, userKey } from "./storage";
import { sendResendEmail } from "./notify";
import { env, siteUrl } from "./env";
import { after } from "next/server";

/* ---- background work that must survive the response (Vercel keeps the function alive via after()) ---- */
declare global {
  var __kmBg: Set<Promise<unknown>> | undefined;
}
const pending = (globalThis.__kmBg ??= new Set());
export function background(label: string, task: () => Promise<unknown>) {
  const run = () => {
    const p = task().catch((e) => console.error(`[${label}] failed`, (e as Error).message));
    pending.add(p);
    return p.finally(() => pending.delete(p));
  };
  try {
    after(run); // inside a request: runs after the response, function stays alive until done
  } catch {
    void run(); // scripts / outside a request
  }
}
/** Scripts call this before exiting so report generation + emails finish. */
export async function drainBackground() {
  while (pending.size) await Promise.allSettled([...pending]);
}

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
  report_status: "not_started" | "generating" | "waiting" | "ready" | "failed"; report_attempts: number; report_error: string | null; report_started_at: Date | null;
  report_request_id: string | null;
  completed_at: Date | null; notified_at: Date | null; hold_expires_at: Date | null; created_at: Date; updated_at: Date;
};

/* ------------------------------- Create ------------------------------- */

export async function createOrder(p: { user: { id: number; uid: string }; service: Service; input: OrderInput; language: string; couponCode?: string | null; ip: string; prefill: { name?: string; email?: string; contact?: string } }) {
  const s = p.service;
  if (s.status !== "active") throw new ApiError(404, "SERVICE_UNAVAILABLE", "This report is not available right now.");
  if (s.inputKind !== p.input.kind) throw new ApiError(422, "INPUT_KIND", "Please fill in the details this report needs.");
  if (!s.languages.includes(p.language)) throw new ApiError(422, "LANGUAGE", "This language isn't available for this report.");
  if (p.input.kind === "palm" && !(await getObject(palmPhotoKey(p.user.uid, p.input.photo)).catch(() => null)))
    throw new ApiError(422, "PALM_PHOTO", "Please upload the photo of your palm again.");
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
    background("report", () => generateReport(o.order_ref, "payment"));
  }
  return { ok: true as const, ref: o.order_ref, firstConfirmation: upd.affectedRows === 1 };
}

/* ------------------------------- Report ------------------------------- */

async function branding() {
  const s = await getAllSettings();
  const base = siteUrl();
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
/** A 'generating' claim older than this is treated as abandoned (the function running it died). Keep > route maxDuration. */
export const STALE_GENERATING_SECONDS = 330;

/** PDF URL from an earlier successful AstrologyAPI call for this order (last 24 h), if any. */
async function previousPdfUrl(ref: string, endpoint: string): Promise<string | null> {
  const rows = await query<{ response_enc: string | null }>(
    "SELECT response_enc FROM payment_logs WHERE order_ref = ? AND provider = 'astrologyapi' AND action = ? AND outcome = 'ok' AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY ORDER BY id DESC LIMIT 1",
    [ref, `pdf.${endpoint}`.slice(0, 48)],
  );
  if (!rows[0]?.response_enc) return null;
  try {
    const j = JSON.parse(await decrypt(rows[0].response_enc)) as { pdf_url?: string; response?: { pdf_url?: string } };
    return j.pdf_url || j.response?.pdf_url || null;
  } catch {
    return null;
  }
}

/** Palm reports are delivered by webhook; if nothing arrives within this window the order is retried. */
export const PALM_WAIT_SECONDS = 20 * 60;

/** Marks a generation attempt as failed: schedules a retry, or (final) fails the order and optionally refunds. */
async function reportFailed(ref: string, attempts: number, error: string, retryable: boolean, by: string) {
  const max = await getNumberSetting("report_max_attempts", 3);
  const final = !retryable || attempts >= max;
  await exec("UPDATE orders SET report_status = 'failed', report_error = ?, status = IF(?, 'failed', status) WHERE order_ref = ?", [error.slice(0, 300), final ? 1 : 0, ref]);
  await audit({ actorType: "system", action: final ? "report.failed" : "report.retry_scheduled", targetType: "order", targetId: ref, meta: { by, error, attempt: attempts } });
  if (!final) {
    clearTimeout(retryTimers.get(ref));
    retryTimers.set(ref, setTimeout(() => void generateReport(ref, "auto-retry").catch(() => {}), 20_000 * attempts));
  } else if ((await getSetting("auto_refund_failed")) === "on" && by !== "admin") {
    await autoRefundFailedOrder(ref, error);
  }
  return { ok: false as const, error };
}

export async function generateReport(ref: string, by: string): Promise<{ ok: boolean; error?: string; waiting?: boolean }> {
  const claim = await exec(
    `UPDATE orders SET report_status = 'generating', report_attempts = report_attempts + 1, report_started_at = UTC_TIMESTAMP(), report_error = NULL
      WHERE order_ref = ? AND payment_status = 'paid' AND status <> 'refunded'
        AND (report_status IN ('not_started','failed')
             OR (report_status = 'generating' AND report_started_at < UTC_TIMESTAMP() - INTERVAL ${STALE_GENERATING_SECONDS} SECOND)
             OR (report_status = 'waiting' AND report_started_at < UTC_TIMESTAMP() - INTERVAL ${PALM_WAIT_SECONDS} SECOND))`,
    [ref],
  );
  if (claim.affectedRows !== 1) return { ok: false, error: "Report is already being generated or isn't due." };
  const o = (await queryOne<OrderRow>("SELECT * FROM orders WHERE order_ref = ?", [ref]))!;
  const service = await getServiceById(o.service_id);
  const fail = (error: string, retryable: boolean) => reportFailed(ref, o.report_attempts, error, retryable, by);
  if (!service) return fail("Service no longer exists", false);

  let input: OrderInput;
  try {
    input = JSON.parse(await decrypt(o.input_enc)) as OrderInput;
  } catch {
    return fail("Birth details could not be read", false);
  }

  const user = await queryOne<{ id: number }>("SELECT id FROM users WHERE uid = ?", [o.user_uid]);
  if (input.kind === "palm") return generatePalmReport(o, input, user?.id ?? null, fail);

  const form = buildPdfForm(service.endpoint, input, o.language, await branding());
  // A previous attempt may have got the PDF from AstrologyAPI and then been cut off (e.g. serverless time limit):
  // reuse that file instead of paying for — and waiting on — a second generation.
  const reused = await previousPdfUrl(ref, service.endpoint);
  const pdf = reused ? ({ ok: true, url: reused } as const) : await astroPdf(service.endpoint, form, { orderRef: ref, userId: user?.id });
  if (!pdf.ok) return fail(pdf.error, pdf.retryable);
  return deliverPdf(o, pdf.url, by, fail);
}

/** Downloads the provider PDF → private S3 → reports row → order ready → email. */
async function deliverPdf(o: OrderRow, url: string, by: string, fail: (e: string, r: boolean) => Promise<{ ok: false; error: string }>) {
  const ref = o.order_ref;
  const service = await getServiceById(o.service_id);
  if (!service) return fail("Service no longer exists", false);
  let bytes: Uint8Array;
  try {
    bytes = await downloadProviderPdf(url);
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
  await notifyReportReady(ref, bytes).catch((e) => console.error("[email] report-ready failed", (e as Error).message));
  return { ok: true };
}

/* ------------------------------- Palm reading ------------------------------- */

/** palm_id from an earlier successful scan of this order (saves a second paid scan on retries). */
async function previousPalmId(ref: string): Promise<string | null> {
  const rows = await query<{ response_enc: string | null }>(
    "SELECT response_enc FROM payment_logs WHERE order_ref = ? AND provider = 'astrologyapi' AND action = 'palm.get-palm-id' AND outcome = 'ok' ORDER BY id DESC LIMIT 1",
    [ref],
  );
  if (!rows[0]?.response_enc) return null;
  try {
    const id = (JSON.parse(await decrypt(rows[0].response_enc)) as { data?: { palm_id?: string } }).data?.palm_id;
    return id && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function palmWebhookUrl(ref: string) {
  const base = siteUrl();
  return `${base}/api/palm/webhook?ref=${ref}&sig=${signRef("palm-webhook", ref)}`;
}

async function generatePalmReport(o: OrderRow, input: Extract<OrderInput, { kind: "palm" }>, userId: number | null, fail: (e: string, r: boolean) => Promise<{ ok: false; error: string }>) {
  const ref = o.order_ref;
  const webhookUrl = palmWebhookUrl(ref);
  if (!webhookUrl.startsWith("https://")) return fail("Palm reports need the site on a public https address (they work on the live site, not on localhost)", false);

  let palmId = await previousPalmId(ref);
  if (!palmId) {
    const photo = await getObject(palmPhotoKey(o.user_uid, input.photo)).catch(() => null);
    if (!photo) return fail("The palm photo could not be found", false);
    const [year, month, day] = input.person.date.split("-").map(Number);
    const scan = await palmScan(
      { image: photo.body, contentType: photo.contentType, day, month, year, gender: input.person.gender === "female" ? "female" : "male" },
      { orderRef: ref, userId },
    );
    if (!scan.ok) return fail(scan.error, scan.retryable);
    palmId = scan.value;
  }
  const job = await palmReport({ palmId, webhookUrl, name: input.person.name, language: o.language }, { orderRef: ref, userId });
  if (!job.ok) return fail(job.error, job.retryable);
  await exec("UPDATE orders SET report_status = 'waiting', report_request_id = ?, report_started_at = UTC_TIMESTAMP() WHERE order_ref = ?", [job.value, ref]);
  await audit({ actorType: "system", action: "report.requested", targetType: "order", targetId: ref, meta: { provider: "palm", requestId: job.value } });
  return { ok: true, waiting: true };
}

/** Webhook from AstrologyAPI: the palm PDF is ready (or failed). Idempotent. */
export async function completePalmReport(ref: string, p: { requestId: string; status: boolean; pdfUrl: string | null }) {
  const o = await queryOne<OrderRow>("SELECT * FROM orders WHERE order_ref = ?", [ref]);
  if (!o || o.report_request_id !== p.requestId) return { ok: false as const, error: "unknown request" };
  if (o.report_status !== "waiting") return { ok: true as const, ignored: true };
  // claim the delivery so a duplicate webhook can't run it twice
  const claim = await exec("UPDATE orders SET report_status = 'generating', report_started_at = UTC_TIMESTAMP() WHERE order_ref = ? AND report_status = 'waiting'", [ref]);
  if (claim.affectedRows !== 1) return { ok: true as const, ignored: true };
  const fail = (error: string, retryable: boolean) => reportFailed(ref, o.report_attempts, error, retryable, "palm-webhook");
  if (!p.status || !p.pdfUrl) return fail("The palm report could not be generated by the provider", true);
  return deliverPdf(o, p.pdfUrl, "palm-webhook", fail);
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
  const base = siteUrl();
  const link = `${base}/account?tab=reports`;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const attach = !!bytes && bytes.length < 7_000_000;
  const html = `<div style="background:#fbf5ea;padding:24px 12px;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:560px;margin:auto;background:#fffdf8;border:1px solid #ecd9b0;border-radius:18px;overflow:hidden">
    <div style="background:#6e122a;padding:22px 28px;text-align:center">
      <div style="letter-spacing:.32em;color:#f7d27a;font-size:13px;font-weight:600">✦ ${esc(s.site_name)} ✦</div>
      <div style="color:#fbe7b8;font-size:13px;margin-top:6px">॥ श्री गणेशाय नमः ॥</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#f7d27a,${esc(s.brand_color)},#f7d27a)"></div>
    <div style="padding:30px 28px;color:#3b0d1a">
      <h1 style="font-weight:400;font-size:26px;margin:0 0 12px;color:#5a0f22">Your ${esc(o.title)} is ready</h1>
      <p style="line-height:1.7;font-size:15px;color:#5c3a40;margin:0">Namaste ${esc(name)},<br>your report for <b style="color:#3b0d1a">${esc(subject)}</b> has been prepared.${attach ? " The PDF is attached to this email and is" : " It is"} always available in your account.</p>
      <table style="margin:20px 0;font-family:Arial,sans-serif;font-size:13px;color:#7a5a5f"><tr><td style="padding:2px 14px 2px 0">Order</td><td style="color:#3b0d1a;font-weight:600">${esc(ref)}</td></tr></table>
      <a href="${esc(link)}" style="display:inline-block;background:linear-gradient(180deg,#ffe7a8,${esc(s.brand_color)});border:1px solid #c58b1d;color:#4a0d1c;padding:13px 26px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px">Open my reports →</a>
      <p style="color:#9a7f84;font-size:12px;line-height:1.6;margin:30px 0 0;font-family:Arial,sans-serif">${esc(s.footer_note)}</p>
    </div>
  </div></div>`;
  const res = await sendResendEmail({
    to: email, subject: `Your ${o.title} is ready · ${s.site_name}`, html, text: `Your ${o.title} (${ref}) is ready: ${link}`,
    attachments: attach && bytes ? [{ filename: `${o.service_slug}-${ref}.pdf`, content: bytes }] : undefined,
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
