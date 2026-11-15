import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/ratelimit";
import { assertTool, panchang } from "@/lib/server/astro/tools";
import { placeSchema } from "@/lib/astro";

function withinAYear(v: string) {
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v && Math.abs(t - Date.now()) <= 400 * 86400_000;
}

const DELHI = { name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, tzId: "Asia/Kolkata" };

/** Panchang for a place and date (today by default; up to a year either side). Cached per place per day for everyone. */
export const POST = route(async (req: NextRequest) => {
  await assertTool("tool_panchang", "Panchang");
  const body = await readJson(
    req,
    z.object({
      place: placeSchema.optional(),
      lang: z.enum(["en", "hi"]).default("hi"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(withinAYear, "Choose a date within a year of today").optional(),
    }),
  );
  const rl = await rateLimit(`panchang:${getClientIp(req.headers)}`, 30, 3600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.", { retryAfter: rl.retryAfter });
  const user = await getSessionUser();
  return ok({ panchang: await panchang(body.place ?? DELHI, body.lang, user?.id ?? null, body.date) });
});
