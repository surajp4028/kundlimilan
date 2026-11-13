import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { verifyCheckoutSignature, fetchPayment, capturePayment } from "@/lib/server/payments/razorpay";
import { logProvider } from "@/lib/server/payments/log";
import { confirmPayment, orderForUser, ORDER_REF_RE } from "@/lib/server/orders";

/** Checkout success: signature over OUR stored order id, then Razorpay's own record decides. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson(
    req,
    z.object({
      orderRef: z.string().regex(ORDER_REF_RE),
      razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
      razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
      razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  );
  const o = await orderForUser(body.orderRef, user.uid);
  if (!o || !o.pay_order_id) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  const valid = o.pay_order_id === body.razorpay_order_id && verifyCheckoutSignature(o.pay_order_id, body.razorpay_payment_id, body.razorpay_signature);
  await logProvider({ orderRef: o.order_ref, provider: "razorpay", direction: "inbound", action: "checkout.verify", outcome: valid ? "ok" : "error", externalId: body.razorpay_payment_id, request: { orderId: body.razorpay_order_id, paymentId: body.razorpay_payment_id }, response: { signature_valid: valid } });
  if (!valid) throw new ApiError(400, "BAD_SIGNATURE", "Payment could not be verified. If money was debited, contact support with your order number.");
  let payment = await fetchPayment(body.razorpay_payment_id, o.order_ref);
  if (payment.order_id !== o.pay_order_id) throw new ApiError(400, "ORDER_MISMATCH", "Payment does not match this order.");
  if (payment.status === "authorized") payment = await capturePayment(payment.id, Number(o.amount_paise), o.order_ref);
  const r = await confirmPayment(o.pay_order_id, payment, "checkout");
  if (!r.ok && r.reason === "amount_mismatch") throw new ApiError(409, "AMOUNT_MISMATCH", "The paid amount didn't match — a full refund has been started.");
  if (!r.ok) throw new ApiError(409, "PAYMENT_NOT_CAPTURED", "Payment is not complete yet. We'll update your order automatically.");
  return ok({ orderRef: o.order_ref });
});
