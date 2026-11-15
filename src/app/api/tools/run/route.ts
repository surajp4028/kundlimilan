import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSetting } from "@/lib/server/settings";
import { chargeRun } from "@/lib/server/astro/tools";
import { PERSONAL_INPUTS, runTool } from "@/lib/server/astro/extra-tools";
import { toolBySlug, toolsOff } from "@/lib/tools-catalog";

export const maxDuration = 120;

/** Runs one catalogue tool. Personal tools count against the visitor's daily free runs. */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(
    req,
    z.object({ tool: z.string().regex(/^[a-z0-9-]{2,48}$/), input: z.unknown(), param: z.string().max(40).nullable().optional(), lang: z.enum(["en", "hi"]).default("hi") }),
  );
  const tool = toolBySlug(body.tool);
  if (!tool || toolsOff(await getSetting("tools_off")).has(tool.slug)) throw new ApiError(404, "TOOL_OFF", "This tool is not available right now.");
  const user = await getSessionUser();
  const ip = getClientIp(req.headers);
  if (PERSONAL_INPUTS.has(tool.input)) await chargeRun({ userId: user?.id ?? null, ip });
  else {
    const rl = await rateLimit(`tools-shared:${ip}`, 40, 3600);
    if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a little.", { retryAfter: rl.retryAfter });
  }
  return ok({ result: await runTool(tool, body.input, body.param ?? null, body.lang, user?.id ?? null) });
});
