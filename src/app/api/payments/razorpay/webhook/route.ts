import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchPayment, verifyWebhookSignature, type RzpPayment, type RzpRefund } from "@/lib/server/payments/razorpay";
import { recordAttempt } from "@/lib/server/payments/attempts";
import { queryOne } from "@/lib/server/db";
import { updateRefundFromWebhook } from "@/lib/server/payments/refunds";
import { logProvider } from "@/lib/server/payments/log";
import { confirmPayment } from "@/lib/server/orders";

/**
 * Razorpay webhook — Dashboard → Webhooks:
 *   URL     https://<domain>/api/payments/razorpay/webhook   Secret: RAZORPAY_WEBHOOK_SECRET
 *   Events  payment.captured, payment.failed, order.paid, refund.processed, refund.failed
 * Double validation: signature over the RAW body, then the payment is re-fetched from Razorpay's API;
 * only that record confirms an order. De-duplicated by x-razorpay-event-id. 5xx → Razorpay retries.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 256 * 1024) return NextResponse.json({ ok: false }, { status: 413 });
  const sig = req.headers.get("x-razorpay-signature");
  const eventId = req.headers.get("x-razorpay-event-id");
  const valid = verifyWebhookSignature(raw, sig);
  let payload: { event?: string; payload?: { payment?: { entity?: RzpPayment }; order?: { entity?: { id?: string; receipt?: string } }; refund?: { entity?: RzpRefund } } } = {};
  try {
    payload = JSON.parse(raw);
  } catch {}
  const pay = payload.payload?.payment?.entity;
  const ref = (pay?.notes?.order_ref || payload.payload?.order?.entity?.receipt || "").slice(0, 20) || null;

  const fresh = await logProvider({
    orderRef: ref, provider: "razorpay", direction: "inbound", action: `webhook.${payload.event || "unknown"}`.slice(0, 48), httpStatus: valid ? 200 : 401,
    outcome: valid ? "ok" : "error", externalId: pay?.id ?? null, eventId: valid ? eventId : null, amountPaise: pay?.amount ?? null,
    request: { headers: { "x-razorpay-event-id": eventId, "x-razorpay-signature": sig ? "present" : "missing" }, body: valid ? payload : "(unsigned body not stored)" }, response: { signature_valid: valid },
  });
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 });
  if (!fresh) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const refund = payload.payload?.refund?.entity;
    if (payload.event?.startsWith("refund.") && refund?.id) await updateRefundFromWebhook(refund);
    if (payload.event && ["payment.captured", "order.paid", "payment.authorized", "payment.failed"].includes(payload.event) && pay?.id && pay.order_id) {
      const order = await queryOne<{ order_ref: string; user_uid: string }>("SELECT order_ref, user_uid FROM orders WHERE pay_order_id = ?", [pay.order_id]);
      if (order) {
        const live = await fetchPayment(pay.id, order.order_ref);
        if (live.order_id !== pay.order_id) throw new Error("order mismatch between webhook and API");
        if (live.status === "failed") await recordAttempt({ orderRef: order.order_ref, userUid: order.user_uid, payment: live, source: "webhook", verified: true });
        else await confirmPayment(pay.order_id, live, "webhook");
      }
    }
  } catch (e) {
    console.error("[razorpay-webhook] processing error", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
