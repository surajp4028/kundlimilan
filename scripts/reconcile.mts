/**
 * Reconcile orders with Razorpay (safety net for missed checkout callbacks / webhooks):
 *   npm run reconcile                 → every unpaid order created in the last 24 h
 *   npm run reconcile -- ASTRXXXXXXXXXX  → one order
 * Confirms captured payments (idempotent) and generates any paid-but-missing reports.
 * Suitable for a cron job every 10 minutes.
 */
import "./_env.mjs";

const { query } = await import("../src/lib/server/db.ts");
const { fetchOrderPayments } = await import("../src/lib/server/payments/razorpay.ts");
const { confirmPayment, generateReport, drainBackground } = await import("../src/lib/server/orders.ts");

const ref = process.argv[2];
const rows = ref
  ? await query<{ order_ref: string; pay_order_id: string | null; payment_status: string; report_status: string }>("SELECT order_ref, pay_order_id, payment_status, report_status FROM orders WHERE order_ref = ?", [ref])
  : await query<{ order_ref: string; pay_order_id: string | null; payment_status: string; report_status: string }>(
      `SELECT order_ref, pay_order_id, payment_status, report_status FROM orders
        WHERE (payment_status = 'unpaid' AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY)
           OR (payment_status = 'paid' AND report_status IN ('not_started','failed') AND status <> 'refunded')`,
    );
for (const o of rows) {
  if (o.payment_status === "unpaid" && o.pay_order_id) {
    const list = await fetchOrderPayments(o.pay_order_id, o.order_ref);
    for (const p of list.items) {
      const r = await confirmPayment(o.pay_order_id, p, "reconcile");
      console.log(`${o.order_ref} · ${p.id} · ${p.status} → ${r.ok ? "confirmed" : r.reason}`);
    }
    if (!list.count) console.log(`${o.order_ref} · no payment yet`);
  }
  const g = await generateReport(o.order_ref, "reconcile");
  console.log(`${o.order_ref} · report: ${g.ok ? "ready" : g.error}`);
}
// background generations started by confirmPayment() run in this process — wait for them
const refs = rows.map((r) => r.order_ref);
for (let i = 0; refs.length && i < 90; i++) {
  const busy = await query<{ n: number }>(`SELECT COUNT(*) n FROM orders WHERE report_status = 'generating' AND order_ref IN (${refs.map(() => "?").join(",")})`, refs);
  if (!Number(busy[0]?.n)) break;
  await new Promise((r) => setTimeout(r, 2000));
}
await drainBackground(); // report generation + emails started in this process
const done = refs.length ? await query<{ order_ref: string; report_status: string; report_error: string | null }>(`SELECT order_ref, report_status, report_error FROM orders WHERE order_ref IN (${refs.map(() => "?").join(",")})`, refs) : [];
for (const d of done) console.log(`${d.order_ref} · final report status: ${d.report_status}${d.report_error ? ` (${d.report_error})` : ""}`);
console.log(`✓ checked ${rows.length} order(s)`);
process.exit(0);
