import "server-only";
import { z } from "zod";
import { ApiError } from "../http";
import { getObject } from "../storage";
import { palmPhotoKey } from "../services";
import { astroJson } from "./client";
import { birthSchema, placeSchema, splitBirth, tzOffsetHours, isSign } from "@/lib/astro";
import { TOOLS, VASTU_AGENCY, VASTU_CONCERNS, VASTU_DIRECTIONS, VASTU_ROOMS, type ToolDef } from "@/lib/tools-catalog";

/* =====================================================================
 * Runs a catalogue tool: validates the input for its kind, builds the AstrologyAPI body,
 * calls ONLY the endpoints listed in the catalogue (never a client-supplied path) and
 * returns one section per call. Identical requests are served from the encrypted cache.
 * ===================================================================== */

const vals = (o: { v: string }[]) => o.map((x) => x.v) as [string, ...string[]];
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ymd = (d: string) => d.split("-").map(Number) as [number, number, number];

export const INPUTS = {
  birth: z.object({ person: birthSchema }),
  birth_year: z.object({ person: birthSchema, year: z.number().int().min(1900).max(2100) }),
  name_dob: z.object({ name: birthSchema.shape.name, date: dateStr }),
  month_place: z.object({ month: z.number().int().min(1).max(12), year: z.number().int().min(1950).max(2100), place: placeSchema }),
  date_place: z.object({ date: dateStr, place: placeSchema }),
  sign: z.object({ sign: z.string().refine(isSign, "Choose a zodiac sign") }),
  vastu_rooms: z.object({
    entrance: z.enum(vals(VASTU_DIRECTIONS)),
    rooms: z.array(z.object({ type: z.enum(vals(VASTU_ROOMS)), direction: z.enum(vals(VASTU_DIRECTIONS)) })).min(1, "Add at least one room").max(40),
    agency: z.enum(vals(VASTU_AGENCY)).default("UNKNOWN"),
    concern: z.enum(vals(VASTU_CONCERNS)).default("NONE"),
  }),
  vastu_plan: z.object({ photo: z.string().regex(/^[a-f0-9]{32}$/, "Upload your floor plan"), entranceDegree: z.number().min(0).max(360) }),
} as const;

function baseBody(tool: ToolDef, input: Record<string, unknown>): Record<string, unknown> {
  switch (tool.input) {
    case "birth":
    case "birth_year": {
      const s = splitBirth((input as z.infer<typeof INPUTS.birth>).person);
      const b: Record<string, unknown> = { day: s.day, month: s.month, year: s.year, hour: s.hour, min: s.min, lat: s.lat, lon: s.lon, tzone: s.tzone };
      if (tool.input === "birth_year") b.varshaphal_year = (input as z.infer<typeof INPUTS.birth_year>).year;
      return b;
    }
    case "name_dob": {
      const i = input as z.infer<typeof INPUTS.name_dob>;
      const [year, month, day] = ymd(i.date);
      return { day, month, year, name: i.name };
    }
    case "month_place": {
      const i = input as z.infer<typeof INPUTS.month_place>;
      const tz = (i.place.tzId && tzOffsetHours(i.place.tzId, i.year, i.month, 15)) ?? 5.5;
      return { month: i.month, year: i.year, lat: round2(i.place.lat), lon: round2(i.place.lon), tzone: tz };
    }
    case "date_place": {
      const i = input as z.infer<typeof INPUTS.date_place>;
      const [year, month, day] = ymd(i.date);
      const tz = (i.place.tzId && tzOffsetHours(i.place.tzId, year, month, day, 6, 0)) ?? 5.5;
      return { day, month, year, hour: 6, min: 0, lat: round2(i.place.lat), lon: round2(i.place.lon), tzone: tz };
    }
    case "vastu_rooms": {
      const i = input as z.infer<typeof INPUTS.vastu_rooms>;
      return { main_entrance: i.entrance, rooms: i.rooms, context: { agency: i.agency, concern: i.concern } };
    }
    default:
      return {};
  }
}
const round2 = (n: number) => Math.round(n * 100) / 100;

export type ToolSection = { endpoint: string; en: string; hi: string; data?: unknown; error?: string };

export async function runTool(tool: ToolDef, rawInput: unknown, param: string | null, lang: string, userId: number | null) {
  const schema = INPUTS[tool.input];
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) throw new ApiError(422, "VALIDATION", parsed.error.issues[0]?.message || "Please check the details.");
  const input = parsed.data as Record<string, unknown>;
  let p = tool.param?.default ?? "";
  if (tool.param) {
    if (param && tool.param.options.some((o) => o.v === param)) p = param;
    else if (param) throw new ApiError(422, "VALIDATION", "Please choose an option from the list.");
  }
  const language = tool.englishOnly ? "en" : lang === "en" ? "en" : "hi";
  let body = baseBody(tool, input);

  if (tool.input === "vastu_plan") {
    if (!userId) throw new ApiError(401, "LOGIN_REQUIRED", "Please log in to upload your floor plan.");
    const i = input as z.infer<typeof INPUTS.vastu_plan>;
    body = { vastu_id: await vastuId(i.photo, i.entranceDegree, userId) };
  }

  const sign = tool.input === "sign" ? (input as { sign: string }).sign : "";
  const sections = await Promise.all(
    tool.calls.map(async (c): Promise<ToolSection> => {
      const endpoint = c.endpoint.replace("{p}", p).replace("{sign}", sign);
      try {
        const data = await astroJson<unknown>(endpoint, { ...body, ...(c.extra || {}) }, {
          feature: `tool:${tool.slug}`.slice(0, 32),
          userId,
          lang: language,
          host: c.host,
          ...(c.daily ? { ttl: 86400 } : {}),
        });
        return { endpoint, en: c.en, hi: c.hi, data };
      } catch (e) {
        return { endpoint, en: c.en, hi: c.hi, error: e instanceof ApiError ? e.message : "Couldn't calculate this part." };
      }
    }),
  );
  if (sections.every((s) => s.error)) throw new ApiError(502, "ASTRO_PROVIDER", sections[0].error || "The astrology engine couldn't calculate this right now.");
  return { tool: tool.slug, param: p || null, lang: language, sections };
}

/** Floor plan (uploaded earlier, private S3) → vastu_id. */
async function vastuId(photo: string, entranceDegree: number, userId: number): Promise<string> {
  const { queryOne } = await import("../db");
  const u = await queryOne<{ uid: string }>("SELECT uid FROM users WHERE id = ?", [userId]);
  const img = u ? await getObject(palmPhotoKey(u.uid, photo)).catch(() => null) : null;
  if (!img) throw new ApiError(422, "PHOTO", "Please upload the floor plan again.");
  const dataUrl = `data:${img.contentType};base64,${Buffer.from(img.body).toString("base64")}`;
  const r = await astroJson<{ vastu_id?: string; data?: { vastu_id?: string }; status?: string }>(
    "get-vastu-id",
    { layout_url: dataUrl, entrance_degree: Math.round(entranceDegree * 10) / 10 },
    { feature: "tool:vastu-floor-plan", userId, lang: "en", host: "vastu" },
  );
  const id = r.vastu_id || r.data?.vastu_id;
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw new ApiError(502, "VASTU", "We couldn't read this floor plan. Please upload a clearer image.");
  return id;
}

export const PERSONAL_INPUTS = new Set(["birth", "birth_year", "name_dob", "vastu_rooms", "vastu_plan"]);
export { TOOLS };
