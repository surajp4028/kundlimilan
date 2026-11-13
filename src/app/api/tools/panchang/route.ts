import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/ratelimit";
import { assertTool, panchang } from "@/lib/server/astro/tools";
import { placeSchema } from "@/lib/astro";

const DELHI = { name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, tzId: "Asia/Kolkata" };

/** Today's Panchang for a place (cached per place per day for everyone). */
export const POST = route(async (req: NextRequest) => {
  await assertTool("tool_panchang", "Panchang");
  const body = await readJson(req, z.object({ place: placeSchema.optional(), lang: z.enum(["en", "hi"]).default("en") }));
  const rl = await rateLimit(`panchang:${getClientIp(req.headers)}`, 30, 3600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.", { retryAfter: rl.retryAfter });
  const user = await getSessionUser();
  return ok({ panchang: await panchang(body.place ?? DELHI, body.lang, user?.id ?? null) });
});
