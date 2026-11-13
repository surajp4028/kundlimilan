import type { NextRequest } from "next/server";
import { ApiError, ok, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/ratelimit";
import { searchPlaces } from "@/lib/server/astro/tools";

/** Birth-place autocomplete: built-in Indian cities first, AstrologyAPI geo_details (cached) for the rest. */
export const GET = route(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get("q") || "").replace(/[^\p{L}\p{N} ,.'-]/gu, "").trim().slice(0, 60);
  if (q.length < 2) return ok({ places: [] });
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`places:${ip}`, 120, 600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many searches. Please wait a moment.", { retryAfter: rl.retryAfter });
  const user = await getSessionUser();
  return ok({ places: await searchPlaces(q, { userId: user?.id ?? null, ip }) });
});
