import { ApiError, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { STALE_GENERATING_SECONDS, confirmPayment, background, generateReport, orderForUser, publicOrder } from "@/lib/server/orders";
import { fetchOrderPayments } from "@/lib/server/payments/razorpay";
import { rateLimit } from "@/lib/server/ratelimit";

// report generation (AstrologyAPI can take ~60 s) runs after the response — give it time to finish on Vercel
export const maxDuration = 300;

type Ctx = { params: Promise<{ ref: string }> };

/**
 * Order status (polled by the order page). Self-healing:
 *  - unpaid > 20 s old → ask Razorpay for the order's payments (max once / 20 s per order),
 *    so a missed checkout callback or webhook never leaves a paid customer waiting;
 *  - paid but the report never started (e.g. server restart) → start it.
 */
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  let o = await orderForUser((await params).ref, user.uid);
  if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  const age = Date.now() - new Date(o.created_at).getTime();
  if (o.payment_status === "unpaid" && o.pay_order_id && o.status !== "cancelled" && age > 20_000 && age < 48 * 3600_000) {
    const rl = await rateLimit(`reconcile:${o.order_ref}`, 1, 20);
    if (rl.ok) {
      try {
        const list = await fetchOrderPayments(o.pay_order_id, o.order_ref);
        for (const p of list.items) if (p.status === "captured") await confirmPayment(o.pay_order_id, p, "reconcile");
      } catch {
        /* provider hiccup — the next poll retries */
      }
      o = (await orderForUser(o.order_ref, user.uid))!;
    }
  } else if (
    o.payment_status === "paid" &&
    ((o.report_status === "not_started" && age > 30_000) ||
      (o.report_status === "generating" && o.report_started_at && Date.now() - new Date(o.report_started_at).getTime() > STALE_GENERATING_SECONDS * 1000))
  ) {
    const ref = o.order_ref;
    background("report", () => generateReport(ref, "status-poll"));
  }
  return ok({ order: await publicOrder(o) });
});
