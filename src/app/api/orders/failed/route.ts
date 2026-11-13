import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { recordAttempt } from "@/lib/server/payments/attempts";
import { orderForUser, ORDER_REF_RE } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/ratelimit";

/** Browser-reported checkout failure — log only (unverified); never changes the order. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await rateLimit(`payfail:${user.id}`, 30, 600);
  if (!rl.ok) return ok({});
  const body = await readJson(
    req,
    z.object({
      orderRef: z.string().regex(ORDER_REF_RE),
      error: z.object({ code: z.string().max(64).optional(), description: z.string().max(300).optional(), reason: z.string().max(64).optional(), metadata: z.object({ payment_id: z.string().max(64).optional(), order_id: z.string().max(64).optional() }).partial().optional() }).passthrough(),
    }),
  );
  const o = await orderForUser(body.orderRef, user.uid);
  const pid = body.error.metadata?.payment_id;
  if (o && pid && /^pay_[A-Za-z0-9]+$/.test(pid)) {
    await recordAttempt({ orderRef: o.order_ref, userUid: user.uid, source: "client", verified: false, payment: { id: pid, order_id: o.pay_order_id ?? undefined, status: "failed", error_code: body.error.code ?? null, error_description: body.error.description ?? null } });
  }
  return ok({});
});
