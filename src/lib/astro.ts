import { z } from "zod";

/* =====================================================================
 * Shared (client + server) astrology helpers: zodiac signs, birth-detail
 * validation and timezone maths. No secrets, no network.
 * ===================================================================== */

export const SIGNS = [
  { key: "aries", en: "Aries", hi: "मेष", symbol: "♈", dates: "Mar 21 – Apr 19", element: "Fire", lord: "Mars" },
  { key: "taurus", en: "Taurus", hi: "वृषभ", symbol: "♉", dates: "Apr 20 – May 20", element: "Earth", lord: "Venus" },
  { key: "gemini", en: "Gemini", hi: "मिथुन", symbol: "♊", dates: "May 21 – Jun 20", element: "Air", lord: "Mercury" },
  { key: "cancer", en: "Cancer", hi: "कर्क", symbol: "♋", dates: "Jun 21 – Jul 22", element: "Water", lord: "Moon" },
  { key: "leo", en: "Leo", hi: "सिंह", symbol: "♌", dates: "Jul 23 – Aug 22", element: "Fire", lord: "Sun" },
  { key: "virgo", en: "Virgo", hi: "कन्या", symbol: "♍", dates: "Aug 23 – Sep 22", element: "Earth", lord: "Mercury" },
  { key: "libra", en: "Libra", hi: "तुला", symbol: "♎", dates: "Sep 23 – Oct 22", element: "Air", lord: "Venus" },
  { key: "scorpio", en: "Scorpio", hi: "वृश्चिक", symbol: "♏", dates: "Oct 23 – Nov 21", element: "Water", lord: "Mars" },
  { key: "sagittarius", en: "Sagittarius", hi: "धनु", symbol: "♐", dates: "Nov 22 – Dec 21", element: "Fire", lord: "Jupiter" },
  { key: "capricorn", en: "Capricorn", hi: "मकर", symbol: "♑", dates: "Dec 22 – Jan 19", element: "Earth", lord: "Saturn" },
  { key: "aquarius", en: "Aquarius", hi: "कुंभ", symbol: "♒", dates: "Jan 20 – Feb 18", element: "Air", lord: "Saturn" },
  { key: "pisces", en: "Pisces", hi: "मीन", symbol: "♓", dates: "Feb 19 – Mar 20", element: "Water", lord: "Jupiter" },
] as const;
export type SignKey = (typeof SIGNS)[number]["key"];
export const isSign = (s: string): s is SignKey => SIGNS.some((x) => x.key === s);

export const LANGUAGES: Record<string, string> = { en: "English", hi: "हिन्दी (Hindi)", ta: "Tamil", te: "Telugu", ka: "Kannada", ml: "Malayalam", be: "Bengali", ma: "Marathi" };

export const placeSchema = z.object({
  name: z.string().trim().min(2, "Choose the birth place from the list").max(140),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tzId: z.string().max(64).regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/, "Invalid timezone").optional().nullable(),
});

export const birthSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the full name")
    .max(60, "Name is too long")
    .regex(/^[\p{L}][\p{L} .'-]*$/u, "Name can only contain letters, spaces, . ' -"),
  gender: z.enum(["male", "female", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth").refine(validDate, "Enter a valid date of birth"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter the time of birth (HH:MM)"),
  place: placeSchema,
  tz: z.number().min(-12).max(14).optional(),
});
export type BirthInput = z.infer<typeof birthSchema>;

function validDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return y >= 1900 && dt.getTime() <= Date.now() + 86400_000;
}

/**
 * UTC offset in hours for an IANA zone at a given local wall-clock time (handles historical DST).
 * Uses the platform's tz database through Intl — no network call.
 */
export function tzOffsetHours(tzId: string, y: number, m: number, d: number, h = 12, mi = 0): number | null {
  try {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const off = (t: number) => {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tzId, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
      const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
      return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")) - t) / 60000;
    };
    // two passes so the offset matches the local time itself (not the UTC instant)
    let o = off(guess);
    o = off(guess - o * 60000);
    return Math.round((o / 60) * 100) / 100;
  } catch {
    return null;
  }
}

/** Resolves the timezone (hours) for a birth record: explicit tz, else from tzId, else IST. */
export function birthTz(b: Pick<BirthInput, "date" | "time" | "place" | "tz">): number {
  if (typeof b.tz === "number") return b.tz;
  const [y, m, d] = b.date.split("-").map(Number);
  const [h, mi] = b.time.split(":").map(Number);
  return (b.place.tzId ? tzOffsetHours(b.place.tzId, y, m, d, h, mi) : null) ?? 5.5;
}

export function splitBirth(b: BirthInput) {
  const [year, month, day] = b.date.split("-").map(Number);
  const [hour, min] = b.time.split(":").map(Number);
  return { day, month, year, hour, min, lat: round4(b.place.lat), lon: round4(b.place.lon), tzone: birthTz(b) };
}
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export const inr = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

export function fmtBirth(b: Pick<BirthInput, "date" | "time" | "place">) {
  const [y, m, d] = b.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const [h, mi] = b.time.split(":").map(Number);
  const t = `${((h + 11) % 12) + 1}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return `${date} · ${t} · ${b.place.name}`;
}

export const SERVICE_ICONS = ["sparkles", "heart", "sun", "moon", "star", "orbit", "gem", "calendar", "hash", "scroll", "crown", "flame", "hand"] as const;
