import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";
import { getClientIp } from "@/lib/server/request";
import { getService, orderInputSchema } from "@/lib/server/services";
import { createOrder, listUserOrders } from "@/lib/server/orders";
import { razorpayKeyId } from "@/lib/server/payments/razorpay";
import { loadMe } from "@/lib/server/me";
import { getAllSettings } from "@/lib/server/settings";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ orders: await listUserOrders(user.uid) });
});

/** The browser sends WHAT to prepare — never the price. Amount comes from our catalogue (+ coupon). */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await rateLimit(`order:${user.id}`, 10, 600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes.", { retryAfter: rl.retryAfter });
  const body = await readJson(
    req,
    z.object({
      service: z.string().regex(/^[a-z0-9-]{2,48}$/),
      input: orderInputSchema,
      language: z.string().regex(/^[a-z]{2}$/).default("en"),
      coupon: z.string().trim().max(32).optional().nullable(),
    }),
  );
  const service = await getService(body.service);
  if (!service) throw new ApiError(404, "NOT_FOUND", "This report is not available.");
  const me = await loadMe(user.id);
  const o = await createOrder({
    user, service, input: body.input, language: body.language, couponCode: body.coupon || null, ip: getClientIp(req.headers),
    prefill: { name: me?.name || undefined, email: me?.email || undefined, contact: me?.phone?.replace(/\D/g, "").slice(-10) || undefined },
  });
  const s = await getAllSettings();
  return ok({
    orderRef: o.ref,
    amount: o.amount,
    discount: o.discount,
    checkout: {
      key: razorpayKeyId(), amount: o.amount, currency: o.currency, order_id: o.rzpOrderId, name: s.site_name, description: `${service.title} · ${o.subject}`.slice(0, 250),
      prefill: { name: me?.name || "", email: me?.email || "", contact: me?.phone?.replace(/\D/g, "").slice(-10) || "" },
      notes: { order_ref: o.ref, service: service.slug }, theme: { color: s.brand_color || "#e8b65a" }, timeout: o.holdMinutes * 60,
    },
  });
});
