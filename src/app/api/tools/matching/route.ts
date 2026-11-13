import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { assertTool, chargeRun, matchScore } from "@/lib/server/astro/tools";
import { birthSchema } from "@/lib/astro";

export const POST = route(async (req: NextRequest) => {
  await assertTool("tool_matching", "Kundli Milan");
  const body = await readJson(req, z.object({ boy: birthSchema, girl: birthSchema, lang: z.enum(["en", "hi"]).default("en") }));
  const user = await getSessionUser();
  const who = { userId: user?.id ?? null, ip: getClientIp(req.headers) };
  await chargeRun(who);
  return ok({ match: await matchScore(body.boy, body.girl, body.lang, who) });
});
