import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { assertTool, chargeRun, numerology } from "@/lib/server/astro/tools";
import { birthSchema } from "@/lib/astro";

export const POST = route(async (req: NextRequest) => {
  await assertTool("tool_numerology", "Numerology");
  const body = await readJson(req, z.object({ name: birthSchema.shape.name, date: birthSchema.shape.date, lang: z.enum(["en", "hi"]).default("en") }));
  const user = await getSessionUser();
  const who = { userId: user?.id ?? null, ip: getClientIp(req.headers) };
  await chargeRun(who);
  return ok({ numerology: await numerology(body.name, body.date, body.lang, who) });
});
