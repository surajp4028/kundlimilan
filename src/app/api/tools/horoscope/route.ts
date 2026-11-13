import type { NextRequest } from "next/server";
import { ApiError, ok, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { getClientIp } from "@/lib/server/request";
import { assertTool, dailyHoroscope, HORO_PERIODS, type HoroPeriod } from "@/lib/server/astro/tools";
import { isSign } from "@/lib/astro";

/** Shared daily prediction per sign (cached for everyone until IST midnight). */
export const GET = route(async (req: NextRequest) => {
  await assertTool("tool_horoscope", "Daily horoscope");
  const sp = req.nextUrl.searchParams;
  const sign = (sp.get("sign") || "").toLowerCase();
  const period = (sp.get("period") || "today") as HoroPeriod;
  const lang = sp.get("lang") === "en" ? "en" : "hi";
  if (!isSign(sign)) throw new ApiError(422, "VALIDATION", "Choose a zodiac sign");
  if (!HORO_PERIODS.includes(period)) throw new ApiError(422, "VALIDATION", "Invalid period");
  const rl = await rateLimit(`horo:${getClientIp(req.headers)}`, 120, 3600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.", { retryAfter: rl.retryAfter });
  return ok({ horoscope: await dailyHoroscope(sign, lang, period) });
});
