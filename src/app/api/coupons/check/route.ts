import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";
import { previewCoupon } from "@/lib/server/coupons";
import { getService } from "@/lib/server/services";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await rateLimit(`coupon:${user.id}`, 20, 600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes.", { retryAfter: rl.retryAfter });
  const body = await readJson(req, z.object({ code: z.string().trim().min(2).max(32), service: z.string().regex(/^[a-z0-9-]{2,48}$/) }));
  const s = await getService(body.service);
  if (!s || s.status !== "active") throw new ApiError(404, "NOT_FOUND", "This report is not available.");
  const c = await previewCoupon(body.code, user.uid, s.slug, s.price);
  return ok({ coupon: { ...c, amount: s.price - c.discountPaise } });
});
