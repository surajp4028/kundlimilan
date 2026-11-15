import "server-only";
import { astroJson } from "./client";
import { searchLocal, type Place } from "./cities";
import { ApiError } from "../http";
import { getNumberSetting, getSetting, type SettingKey } from "../settings";
import { rateLimit } from "../ratelimit";
import { splitBirth, tzOffsetHours, type BirthInput, type SignKey } from "@/lib/astro";

/* =====================================================================
 * Free tools built on AstrologyAPI JSON (wallet token = pay-as-you-go).
 * Every tool: on/off switch, per-visitor / per-user daily runs, cache.
 * Shared results (daily horoscope, panchang) are cached for everyone.
 * ===================================================================== */

type Who = { userId: number | null; ip: string };

export async function assertTool(key: SettingKey, label: string) {
  if ((await getSetting(key)) !== "on") throw new ApiError(404, "TOOL_OFF", `${label} is currently unavailable.`);
}

/** Counts one "run" of a personal tool against the visitor's / user's daily allowance. */
export async function chargeRun(who: Who) {
  if ((await getSetting("tools_login_required")) === "on" && !who.userId) throw new ApiError(401, "LOGIN_REQUIRED", "Please log in to use this free tool.");
  const limit = who.userId ? await getNumberSetting("tools_user_daily", 15) : await getNumberSetting("tools_guest_daily", 3);
  const rl = await rateLimit(who.userId ? `tools:u:${who.userId}` : `tools:ip:${who.ip}`, Math.max(1, limit), 86400);
  if (!rl.ok)
    throw new ApiError(429, "DAILY_LIMIT", who.userId ? "You've used today's free calculations. Please come back tomorrow." : "Free limit reached for today. Log in for more free calculations.", {
      retryAfter: rl.retryAfter,
    });
}

/* ------------------------------- Places ------------------------------- */

type OmPlace = { name: string; latitude: number; longitude: number; timezone?: string; country_code?: string; country?: string; admin1?: string; admin2?: string; admin3?: string; population?: number };
const geoCache = new Map<string, { at: number; places: Place[] }>();

/** Open-Meteo geocoding (free, no key): returns district (admin2) + state (admin1) + IANA timezone. */
async function openMeteo(q: string): Promise<Place[]> {
  const key = q.toLowerCase();
  const hit = geoCache.get(key);
  if (hit && Date.now() - hit.at < 7 * 86400_000) return hit.places;
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=20&language=en&format=json`, {
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
    headers: { "User-Agent": "astro-web/1.0" },
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const j = (await res.json()) as { results?: OmPlace[] };
  const places: Place[] = (j.results || [])
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.timezone)
    .map((r) => {
      const district = (r.admin2 || "").replace(/ district$/i, "");
      const tehsil = r.admin3 && r.admin3 !== r.name && r.admin3 !== district ? r.admin3 : "";
      const parts = [r.name, tehsil, district, r.admin1, r.country].filter((x, i, arr) => x && arr.indexOf(x) === i);
      return { name: parts.join(", "), lat: r.latitude, lon: r.longitude, tzId: r.timezone!, country: r.country_code || "", source: "api" as const, pop: r.population || 0 };
    })
    // India first, then by population
    .sort((x, y) => Number(y.country === "IN") - Number(x.country === "IN") || (y as { pop: number }).pop - (x as { pop: number }).pop)
    .map(({ pop: _p, ...p }) => p as Place);
  if (geoCache.size > 2000) geoCache.delete(geoCache.keys().next().value as string);
  geoCache.set(key, { at: Date.now(), places });
  return places;
}

export async function searchPlaces(q: string, who: Who): Promise<Place[]> {
  const local = searchLocal(q, 6);
  if (q.trim().length < 3) return local;
  const rl = await rateLimit(`geo:${who.userId ? `u${who.userId}` : who.ip}`, 60, 3600);
  if (!rl.ok) return local;
  let remote: Place[] = [];
  try {
    remote = await openMeteo(q.trim().slice(0, 60));
  } catch {
    // fallback: AstrologyAPI geo_details (no state / district information)
    try {
      const r = await astroJson<{ geonames?: { place_name: string; latitude: string; longitude: string; country_code: string; timezone_id: string }[] }>(
        "geo_details",
        { place: q.trim().toLowerCase().slice(0, 60), maxRows: 8 },
        { feature: "places", userId: who.userId, ttl: 90 * 86400 },
      );
      remote = (r.geonames || [])
        .map((g) => ({ name: `${g.place_name}, ${g.country_code}`, lat: Number(g.latitude), lon: Number(g.longitude), tzId: g.timezone_id, country: g.country_code, source: "api" as const }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    } catch {}
  }
  const near = (a: Place, b: Place) => Math.abs(a.lat - b.lat) < 0.15 && Math.abs(a.lon - b.lon) < 0.15;
  return [...local, ...remote.filter((r) => !local.some((l) => near(l, r)))].slice(0, 12);
}

/* ------------------------------- Free Kundli ------------------------------- */

type Planet = { name: string; fullDegree: number; normDegree: number; isRetro: string; sign: string; signLord: string; nakshatra: string; nakshatraLord: string; nakshatra_pad: number; house: number };

export async function freeKundli(b: BirthInput, lang: string, who: Who) {
  const body = splitBirth(b);
  const o = { feature: "kundli", userId: who.userId, lang };
  const [astro, planets, d1, d9, dasha, manglik, birth] = await Promise.all([
    astroJson<Record<string, string | number>>("astro_details", body, o),
    astroJson<Planet[]>("planets", body, o),
    astroJson<{ svg: string }>("horo_chart_image/D1", body, o),
    astroJson<{ svg: string }>("horo_chart_image/D9", body, o),
    astroJson<Record<string, { planet: string; start: string; end: string }>>("current_vdasha", body, o),
    astroJson<{ manglik_status?: string; percentage_manglik_after_cancellation?: number; manglik_report?: string; is_present?: boolean }>("manglik", body, o),
    astroJson<{ sunrise?: string; sunset?: string; ayanamsha?: number }>("birth_details", body, o),
  ]);
  return {
    input: { name: b.name, gender: b.gender, date: b.date, time: b.time, place: b.place.name, tz: body.tzone },
    astro,
    birth: { sunrise: birth.sunrise ?? null, sunset: birth.sunset ?? null, ayanamsha: birth.ayanamsha ?? null },
    planets: (Array.isArray(planets) ? planets : []).map((p) => ({
      name: p.name, sign: p.sign, signLord: p.signLord, degree: p.normDegree, fullDegree: p.fullDegree, retro: String(p.isRetro) === "true",
      nakshatra: p.nakshatra, nakshatraLord: p.nakshatraLord, pada: p.nakshatra_pad, house: p.house,
    })),
    charts: { d1: sanitizeSvg(d1?.svg), d9: sanitizeSvg(d9?.svg) },
    dasha: ["major", "minor", "sub_minor"].map((k) => dasha?.[k] && { level: k, planet: dasha[k].planet, start: dasha[k].start, end: dasha[k].end }).filter(Boolean),
    manglik: { present: !!manglik?.is_present, status: manglik?.manglik_status ?? null, percent: manglik?.percentage_manglik_after_cancellation ?? null, report: manglik?.manglik_report ?? null },
  };
}

/** The chart SVG is rendered as an <img> data URI (no script execution); still strip anything active. */
function sanitizeSvg(svg: string | undefined) {
  if (!svg || !svg.trim().startsWith("<svg")) return null;
  const clean = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
  return "data:image/svg+xml;base64," + Buffer.from(clean).toString("base64");
}

/* ------------------------------- Matching ------------------------------- */

type Koot = { description: string; male_koot_attribute: string; female_koot_attribute: string; total_points: number; received_points: number };

export async function matchScore(boy: BirthInput, girl: BirthInput, lang: string, who: Who) {
  const m = splitBirth(boy);
  const f = splitBirth(girl);
  const body = {
    m_day: m.day, m_month: m.month, m_year: m.year, m_hour: m.hour, m_min: m.min, m_lat: m.lat, m_lon: m.lon, m_tzone: m.tzone,
    f_day: f.day, f_month: f.month, f_year: f.year, f_hour: f.hour, f_min: f.min, f_lat: f.lat, f_lon: f.lon, f_tzone: f.tzone,
  };
  const o = { feature: "matching", userId: who.userId, lang };
  const [points, manglik] = await Promise.all([
    astroJson<Record<string, Koot> & { total: { total_points: number; received_points: number; minimum_required: number }; conclusion: { status: boolean; report: string } }>("match_ashtakoot_points", body, o),
    astroJson<{ male?: { is_present?: boolean; percentage_manglik_after_cancellation?: number }; female?: { is_present?: boolean; percentage_manglik_after_cancellation?: number }; conclusion?: { match?: boolean; report?: string } }>(
      "match_manglik_report", body, o,
    ).catch(() => null),
  ]);
  const order = ["varna", "vashya", "tara", "yoni", "maitri", "gan", "bhakut", "nadi"];
  return {
    boy: { name: boy.name, place: boy.place.name, date: boy.date, time: boy.time },
    girl: { name: girl.name, place: girl.place.name, date: girl.date, time: girl.time },
    koots: order.filter((k) => points[k]).map((k) => ({ key: k, description: points[k].description, boy: points[k].male_koot_attribute, girl: points[k].female_koot_attribute, max: points[k].total_points, got: points[k].received_points })),
    total: points.total?.received_points ?? 0,
    outOf: points.total?.total_points ?? 36,
    minimum: points.total?.minimum_required ?? 18,
    conclusion: points.conclusion?.report ?? null,
    favourable: !!points.conclusion?.status,
    manglik: manglik
      ? {
          boy: { present: !!manglik.male?.is_present, percent: manglik.male?.percentage_manglik_after_cancellation ?? null },
          girl: { present: !!manglik.female?.is_present, percent: manglik.female?.percentage_manglik_after_cancellation ?? null },
          match: manglik.conclusion?.match ?? null,
          report: manglik.conclusion?.report ?? null,
        }
      : null,
  };
}

/* ------------------------------- Daily horoscope ------------------------------- */

const istDate = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
const secondsToIstMidnight = () => {
  const now = Date.now() + 5.5 * 3600_000;
  return Math.max(300, 86400 - Math.floor((now % 86400_000) / 1000));
};

export type HoroPeriod = "today" | "tomorrow" | "yesterday" | "weekly";
export const HORO_PERIODS: HoroPeriod[] = ["yesterday", "today", "tomorrow", "weekly"];

/** Sun-sign horoscope; one shared, cached call per sign + period + day for everyone. */
export async function dailyHoroscope(sign: SignKey, lang: string, period: HoroPeriod = "today") {
  const path =
    period === "weekly" ? `horoscope_prediction/weekly/${sign}`
    : period === "tomorrow" ? `sun_sign_prediction/daily/next/${sign}`
    : period === "yesterday" ? `sun_sign_prediction/daily/previous/${sign}`
    : `sun_sign_prediction/daily/${sign}`;
  const r = await astroJson<{ sun_sign: string; prediction_date?: string; week_start_date?: string; prediction: Record<string, string> | string[] }>(
    path,
    { timezone: 5.5, date: istDate() },
    { feature: "horoscope", lang, ttl: secondsToIstMidnight() },
  );
  const pred = r.prediction || {};
  return {
    sign,
    period,
    date: r.prediction_date || (r.week_start_date ? `Week of ${r.week_start_date}` : istDate()),
    prediction: Array.isArray(pred) ? Object.fromEntries(pred.map((p, i) => [["overview", "work", "love", "health", "advice"][i] || `part_${i + 1}`, p])) : pred,
  };
}

/* ------------------------------- Panchang ------------------------------- */

export async function panchang(place: { name: string; lat: number; lon: number; tzId?: string | null }, lang: string, userId: number | null, date?: string) {
  const today = istDate();
  const day = date || today;
  const [y, m, d] = day.split("-").map(Number);
  const tz = (place.tzId && tzOffsetHours(place.tzId, y, m, d, 6, 0)) ?? 5.5;
  const body = { day: d, month: m, year: y, hour: 6, min: 0, lat: Math.round(place.lat * 100) / 100, lon: Math.round(place.lon * 100) / 100, tzone: tz };
  // a given date's Panchang never changes — cache other days for 30 days, today until midnight
  const ttl = day === today ? secondsToIstMidnight() : 30 * 86400;
  const r = await astroJson<Record<string, unknown>>("advanced_panchang", body, { feature: "panchang", userId, lang, ttl });
  return { date: day, today, place: place.name, data: r };
}

/* ------------------------------- Numerology ------------------------------- */

export async function numerology(name: string, date: string, lang: string, who: Who) {
  const [year, month, day] = date.split("-").map(Number);
  const body = { day, month, year, name };
  const o = { feature: "numerology", userId: who.userId, lang };
  const [table, report] = await Promise.all([
    astroJson<Record<string, string | number>>("numero_table", body, o),
    astroJson<{ title?: string; description?: string }>("numero_report", body, o).catch(() => null),
  ]);
  return { table, report };
}
