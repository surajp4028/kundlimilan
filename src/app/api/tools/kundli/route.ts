import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { assertTool, chargeRun, freeKundli } from "@/lib/server/astro/tools";
import { birthSchema } from "@/lib/astro";

export const POST = route(async (req: NextRequest) => {
  await assertTool("tool_kundli", "Free Kundli");
  const body = await readJson(req, z.object({ person: birthSchema, lang: z.enum(["en", "hi"]).default("en") }));
  const user = await getSessionUser();
  const who = { userId: user?.id ?? null, ip: getClientIp(req.headers) };
  await chargeRun(who);
  return ok({ kundli: await freeKundli(body.person, body.lang, who) });
});
