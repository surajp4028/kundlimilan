import "server-only";
import { z } from "zod";
import { exec, query, queryOne } from "./db";
import { birthSchema, birthTz, splitBirth, type BirthInput } from "@/lib/astro";
import { userKey } from "./storage";

/* =====================================================================
 * Report catalogue (table `services`) — every field editable in Admin → Services.
 * ===================================================================== */

export type ServiceRow = {
  id: number; slug: string; title: string; title_hi: string | null; tagline: string | null; description: string | null; features: string | string[] | null;
  category: "kundli" | "matching" | "yearly" | "numerology" | "remedies" | "western" | "palmistry"; input_kind: "single" | "couple" | "single_year" | "palm";
  provider_endpoint: string; languages: string; pages_hint: string | null; price_paise: number; mrp_paise: number | null; icon: string; accent: string;
  status: "active" | "hidden" | "disabled"; featured: number; sort_order: number; created_at: Date; updated_at: Date;
};

export function toService(r: ServiceRow) {
  const features = typeof r.features === "string" ? (JSON.parse(r.features || "[]") as string[]) : r.features || [];
  return {
    id: r.id, slug: r.slug, title: r.title, titleHi: r.title_hi, tagline: r.tagline, description: r.description, features,
    category: r.category, inputKind: r.input_kind, endpoint: r.provider_endpoint, languages: r.languages.split(",").filter(Boolean), pagesHint: r.pages_hint,
    price: r.price_paise, mrp: r.mrp_paise, icon: r.icon, accent: r.accent, status: r.status, featured: !!r.featured, sortOrder: r.sort_order, updatedAt: r.updated_at,
  };
}
export type Service = ReturnType<typeof toService>;
/** What visitors may see (no provider endpoint). */
export const publicService = ({ endpoint: _e, status: _s, updatedAt: _u, ...s }: Service) => s;
export type PublicService = ReturnType<typeof publicService>;

export async function listActiveServices() {
  const rows = await query<ServiceRow>("SELECT * FROM services WHERE status = 'active' ORDER BY featured DESC, sort_order, id");
  return rows.map(toService);
}
export async function listAllServices() {
  return (await query<ServiceRow>("SELECT * FROM services ORDER BY sort_order, id")).map(toService);
}
export async function getService(slug: string) {
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) return null;
  const r = await queryOne<ServiceRow>("SELECT * FROM services WHERE slug = ?", [slug]);
  return r ? toService(r) : null;
}
export async function getServiceById(id: number) {
  const r = await queryOne<ServiceRow>("SELECT * FROM services WHERE id = ?", [id]);
  return r ? toService(r) : null;
}

export const serviceInput = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,48}$/, "Slug: lowercase letters, numbers and - only"),
  title: z.string().trim().min(2).max(80),
  titleHi: z.string().trim().max(80).optional().nullable(),
  tagline: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  features: z.array(z.string().trim().min(1).max(120)).max(16).default([]),
  category: z.enum(["kundli", "matching", "yearly", "numerology", "remedies", "western", "palmistry"]),
  inputKind: z.enum(["single", "couple", "single_year", "palm"]),
  endpoint: z.string().trim().regex(/^[a-z_]+(\/[a-z_]+)?$/, "Provider endpoint, e.g. match_making_pdf"),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1).max(8),
  pagesHint: z.string().trim().max(24).optional().nullable(),
  price: z.number().int().min(100, "Minimum ₹1").max(10_000_000),
  mrp: z.number().int().min(0).max(10_000_000).optional().nullable(),
  icon: z.string().trim().max(24).default("sparkles"),
  accent: z.enum(["gold", "rose", "violet", "sky", "emerald", "amber"]).default("gold"),
  status: z.enum(["active", "hidden", "disabled"]),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(100),
});
export type ServiceInput = z.infer<typeof serviceInput>;

export async function saveService(input: ServiceInput, adminId: number, id?: number) {
  const vals = [
    input.slug, input.title, input.titleHi || null, input.tagline || null, input.description || null, JSON.stringify(input.features), input.category, input.inputKind,
    input.endpoint, input.languages.join(","), input.pagesHint || null, input.price, input.mrp || null, input.icon, input.accent, input.status, input.featured ? 1 : 0, input.sortOrder, adminId,
  ];
  if (id) {
    await exec(
      `UPDATE services SET slug=?, title=?, title_hi=?, tagline=?, description=?, features=?, category=?, input_kind=?, provider_endpoint=?, languages=?, pages_hint=?,
              price_paise=?, mrp_paise=?, icon=?, accent=?, status=?, featured=?, sort_order=?, updated_by=? WHERE id = ?`,
      [...vals, id],
    );
    return id;
  }
  const r = await exec(
    `INSERT INTO services (slug, title, title_hi, tagline, description, features, category, input_kind, provider_endpoint, languages, pages_hint,
                           price_paise, mrp_paise, icon, accent, status, featured, sort_order, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    vals,
  );
  return r.insertId;
}

/* ------------------------- Order input per service ------------------------- */

export const orderInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single"), person: birthSchema }),
  z.object({ kind: z.literal("couple"), boy: birthSchema, girl: birthSchema }),
  z.object({ kind: z.literal("single_year"), person: birthSchema, year: z.number().int().min(1950).max(2100) }),
  z.object({
    kind: z.literal("palm"),
    person: birthSchema.pick({ name: true, gender: true, date: true }),
    /** id of the palm photo uploaded via /api/palm/photo (stored in the customer's private S3 folder) */
    photo: z.string().regex(/^[a-f0-9]{32}$/, "Upload a photo of your palm"),
  }),
]);
export type OrderInput = z.infer<typeof orderInputSchema>;

export function subjectOf(i: OrderInput) {
  return i.kind === "couple" ? `${i.boy.name} & ${i.girl.name}` : i.kind === "single_year" ? `${i.person.name} · ${i.year}` : i.person.name;
}

/** S3 key of a customer's uploaded palm photo. */
export function palmPhotoKey(uid: string, photoId: string) {
  return userKey(uid, "palm", `${photoId}.img`);
}

/** Branding block every AstrologyAPI PDF needs (from Admin → Settings → PDF reports). */
export type PdfBranding = { company_name: string; company_info: string; domain_url: string; footer_link: string; company_email: string; company_landline: string; company_mobile: string; logo_url: string; chart_style: string };

const firstLast = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") || "-" };
};

/**
 * Builds the exact form body each AstrologyAPI PDF endpoint expects.
 * (Parameter names differ between endpoints — see docs links in README.)
 */
export function buildPdfForm(endpoint: string, input: OrderInput, language: string, brand: PdfBranding): Record<string, string | number | boolean> {
  if (input.kind === "palm") throw new Error("Palm reports are generated by generatePalmReport()");
  const b = { ...brand } as Record<string, string | number | boolean>;
  if (!b.logo_url) delete b.logo_url;

  if (input.kind === "couple") {
    const side = (pfx: string, p: BirthInput) => {
      const s = splitBirth(p);
      const n = firstLast(p.name);
      return {
        [`${pfx}_first_name`]: n.first, [`${pfx}_last_name`]: n.last, [`${pfx}_day`]: s.day, [`${pfx}_month`]: s.month, [`${pfx}_year`]: s.year,
        [`${pfx}_hour`]: s.hour, [`${pfx}_minute`]: s.min, [`${pfx}_latitude`]: s.lat, [`${pfx}_longitude`]: s.lon, [`${pfx}_timezone`]: s.tzone, [`${pfx}_place`]: p.place.name.slice(0, 100),
      };
    };
    if (endpoint.startsWith("synastry")) return { ...side("p", input.boy), ...side("s", input.girl), language, ...b };
    return { ...side("m", input.boy), ...side("f", input.girl), language, ashtakoot: true, dashakoot: true, papasamyam: true, ...b };
  }

  const p = input.person;
  const s = splitBirth(p);
  const gender = p.gender === "other" ? "male" : p.gender;
  const common = { name: p.name, gender, day: s.day, month: s.month, year: s.year, hour: s.hour, place: p.place.name.slice(0, 100) };

  if (endpoint === "star_sign_compatibility_report") {
    const w: Record<string, string | number | boolean> = { name: p.name, day: s.day, month: s.month, year: s.year, hour: s.hour, minute: s.min, latitude: s.lat, longitude: s.lon, timezone: s.tzone, place: p.place.name.slice(0, 100), language, ...b };
    delete w.chart_style;
    return w;
  }
  if (endpoint.endsWith("/tropical")) {
    const w: Record<string, string | number | boolean> = { ...common, minute: s.min, latitude: s.lat, longitude: s.lon, timezone: s.tzone, language, ...b };
    delete w.chart_style;
    if (endpoint.startsWith("solar_return")) w.solar_year = input.kind === "single_year" ? input.year : new Date().getFullYear();
    return w;
  }
  if (endpoint === "premium_kundli_report") return { ...common, min: s.min, latitude: s.lat, longitude: s.lon, timezone: s.tzone, language, ...b };
  if (endpoint === "varshphal_horoscope_pdf")
    return { ...common, min: s.min, latitude: s.lat, longitude: s.lon, tzone: s.tzone, language, varshaphal_year: input.kind === "single_year" ? input.year : new Date().getFullYear(), ...b };
  return { ...common, min: s.min, lat: s.lat, lon: s.lon, tzone: birthTz(p), language, ...b };
}

/** Default catalogue seeded on first setup (prices editable later). */
export const DEFAULT_SERVICES: ServiceInput[] = [
  {
    slug: "palm-reading", title: "Palm Reading Report", titleHi: "हस्तरेखा रिपोर्ट", category: "palmistry", inputKind: "palm", endpoint: "palm_report",
    tagline: "Click a photo of your palm — get a detailed reading of your hand lines.",
    description: "Take a photo of your palm with your phone camera or pick one from your gallery. Our AI palmist reads your hand shape, fingers, heart, head, life and fate lines, mounts and special marks, and prepares a beautifully designed PDF covering personality, career, money, love, marriage, health and luck — in Hindi or English.",
    features: ["Hand shape & element", "Heart, head, life & fate lines", "Mounts & special marks", "Career, money & luck", "Love & marriage", "Health & practical guidance", "Your palm photo with the lines marked"],
    languages: ["hi", "en"], pagesHint: "15+ pages", price: 9900, mrp: 59900, icon: "hand", accent: "amber", status: "active", featured: true, sortOrder: 0,
  },
  {
    slug: "kundli-milan-report", title: "Kundli Milan Report", titleHi: "कुंडली मिलान रिपोर्ट", category: "matching", inputKind: "couple", endpoint: "match_making_pdf",
    tagline: "Complete marriage compatibility — Ashtakoot, Dashakoot, Manglik & doshas.",
    description: "A detailed 25+ page matchmaking report for the bride and groom: Ashtakoot Guna Milan (36 points), Dashakoot (10 kootas), Manglik analysis for both, Bhakoot, Nadi, Vedha and Rajju dosha checks, Papasamyam, both birth charts, Vimshottari dasha and a clear final recommendation.",
    features: ["Ashtakoot Guna Milan · 36 points", "Dashakoot · 10 kootas", "Manglik analysis for both", "Nadi, Bhakoot, Vedha & Rajju dosha", "Papasamyam comparison", "Birth, Moon & Navamsa charts", "Clear final conclusion"],
    languages: ["en", "hi"], pagesHint: "25+ pages", price: 49900, mrp: 99900, icon: "heart", accent: "rose", status: "active", featured: true, sortOrder: 1,
  },
  {
    slug: "pro-kundli", title: "Pro Kundli", titleHi: "प्रो कुंडली", category: "kundli", inputKind: "single", endpoint: "pro_horoscope_pdf",
    tagline: "Our most detailed birth-chart report with predictions and remedies.",
    description: "Your complete Vedic birth chart: Lagna, Navamsa and divisional charts, planetary positions and strengths, Vimshottari dasha periods with predictions, yogas, doshas (Manglik, Kaal Sarp, Sade Sati) and personalised remedies.",
    features: ["Lagna, Navamsa & divisional charts", "Planet-by-planet analysis", "Vimshottari dasha predictions", "Yogas & doshas", "Sade Sati & Kaal Sarp check", "Gemstone & remedy suggestions"],
    languages: ["en", "hi"], pagesHint: "60+ pages", price: 99900, mrp: 199900, icon: "crown", accent: "gold", status: "active", featured: true, sortOrder: 2,
  },
  {
    slug: "basic-kundli", title: "Basic Kundli", titleHi: "बेसिक कुंडली", category: "kundli", inputKind: "single", endpoint: "basic_horoscope_pdf",
    tagline: "Your essential birth chart, planets and dasha in one clean report.",
    description: "Everything you need to understand your birth chart: basic and Panchang details, Lagna and Navamsa charts, planetary positions, Vimshottari dasha and Manglik status.",
    features: ["Birth & Panchang details", "Lagna & Navamsa charts", "Planetary positions", "Vimshottari dasha", "Manglik analysis"],
    languages: ["en", "hi"], pagesHint: "20+ pages", price: 39900, mrp: 79900, icon: "sun", accent: "amber", status: "active", featured: false, sortOrder: 3,
  },
  {
    slug: "mini-kundli", title: "Mini Kundli", titleHi: "मिनी कुंडली", category: "kundli", inputKind: "single", endpoint: "mini_horoscope_pdf",
    tagline: "A quick, beautiful summary of your birth chart.",
    description: "A compact report with your birth details, Lagna chart, planetary positions and current dasha — perfect as a first look at your Kundli.",
    features: ["Birth details", "Lagna chart", "Planetary positions", "Current dasha"],
    languages: ["en", "hi"], pagesHint: "8+ pages", price: 19900, mrp: 39900, icon: "moon", accent: "violet", status: "active", featured: false, sortOrder: 4,
  },
  {
    slug: "premium-kundli", title: "Premium Kundli", titleHi: "प्रीमियम कुंडली", category: "kundli", inputKind: "single", endpoint: "premium_kundli_report",
    tagline: "The ultimate life report — career, wealth, health and relationships.",
    description: "A premium, in-depth life report covering every house and planet with detailed predictions for career, finance, marriage and health, plus remedies. (Enable once your AstrologyAPI plan includes it.)",
    features: ["Every house & planet analysed", "Career, wealth & health predictions", "Marriage & relationships", "Detailed remedies"],
    languages: ["en", "hi"], pagesHint: "100+ pages", price: 199900, mrp: 349900, icon: "gem", accent: "gold", status: "disabled", featured: false, sortOrder: 5,
  },
  {
    slug: "varshphal", title: "Varshphal · Yearly Report", titleHi: "वर्षफल", category: "yearly", inputKind: "single_year", endpoint: "varshphal_horoscope_pdf",
    tagline: "What the coming year holds — month by month.",
    description: "Your Varshphal (annual solar return) chart with Muntha, Varsheshwar, Mudda dasha and month-wise predictions for the chosen year. (Enable once your plan includes it.)",
    features: ["Varshphal chart", "Muntha & year lord", "Mudda dasha", "Month-wise predictions"],
    languages: ["en", "hi"], pagesHint: "30+ pages", price: 59900, mrp: 99900, icon: "calendar", accent: "sky", status: "disabled", featured: false, sortOrder: 6,
  },
  {
    slug: "numerology-report", title: "Numerology Report", titleHi: "अंक ज्योतिष रिपोर्ट", category: "numerology", inputKind: "single", endpoint: "pro_numerology_report",
    tagline: "Your numbers, lucky days, colours and name analysis.",
    description: "Radical, destiny and name numbers explained with lucky numbers, days, colours, gemstones and guidance. (Enable once your plan includes it.)",
    features: ["Radical, destiny & name numbers", "Lucky days, colours & stones", "Name analysis", "Yearly guidance"],
    languages: ["en", "hi"], pagesHint: "20+ pages", price: 29900, mrp: 59900, icon: "hash", accent: "emerald", status: "disabled", featured: false, sortOrder: 7,
  },
  {
    slug: "gemstone-report", title: "Gemstone Report", titleHi: "रत्न रिपोर्ट", category: "remedies", inputKind: "single", endpoint: "basic_gemstone_report_pdf",
    tagline: "Which gemstones suit your chart — and which to avoid.",
    description: "Life stone, lucky stone and benefic stone from your birth chart, with wearing method, metal, finger and day. (Enable once your plan includes it.)",
    features: ["Life, lucky & benefic stones", "How & when to wear", "Stones to avoid"],
    languages: ["en", "hi"], pagesHint: "10+ pages", price: 24900, mrp: 49900, icon: "gem", accent: "emerald", status: "disabled", featured: false, sortOrder: 8,
  },
  {
    slug: "western-natal-report", title: "Western Natal Report", titleHi: "पाश्चात्य जन्म कुंडली", category: "western", inputKind: "single", endpoint: "natal_horoscope_report/tropical",
    tagline: "Your tropical (Western) birth chart, planet by planet.", description: "A 50-page Western astrology natal report: Sun, Moon and rising sign, every planet in its sign and house, major aspects and what they mean for personality, love and career. (Enable once your plan includes it.)",
    features: ["Sun, Moon & Rising sign", "Planets in signs & houses", "Major aspects", "Personality, love & career"], languages: ["en"], pagesHint: "50+ pages",
    price: 49900, mrp: 99900, icon: "star", accent: "sky", status: "disabled", featured: false, sortOrder: 20,
  },
  {
    slug: "solar-return-report", title: "Solar Return (Western Yearly)", titleHi: "सोलर रिटर्न", category: "western", inputKind: "single_year", endpoint: "solar_return_report/tropical",
    tagline: "Your year ahead from the Western solar return chart.", description: "The solar return chart for your chosen year with themes for career, money, love and health. (Enable once your plan includes it.)",
    features: ["Solar return chart", "Year themes", "Career, money & love", "Health"], languages: ["en"], pagesHint: "30+ pages",
    price: 39900, mrp: 79900, icon: "sun", accent: "amber", status: "disabled", featured: false, sortOrder: 21,
  },
  {
    slug: "life-forecast-report", title: "Life Forecast (Western)", titleHi: "जीवन पूर्वानुमान", category: "western", inputKind: "single", endpoint: "life_forecast_report/tropical",
    tagline: "Upcoming transits and what they bring.", description: "A Western forecast of the important planetary transits coming up in your life and how to use them. (Enable once your plan includes it.)",
    features: ["Major upcoming transits", "Timing of opportunities", "Challenges to prepare for"], languages: ["en"], pagesHint: "20+ pages",
    price: 39900, mrp: 79900, icon: "orbit", accent: "violet", status: "disabled", featured: false, sortOrder: 22,
  },
  {
    slug: "synastry-couple-report", title: "Couple Synastry (Western)", titleHi: "युगल अनुकूलता (पाश्चात्य)", category: "western", inputKind: "couple", endpoint: "synastry_couple_report/tropical",
    tagline: "Western relationship compatibility for two people.", description: "How two birth charts interact — attraction, communication, emotional and long-term compatibility. (Enable once your plan includes it.)",
    features: ["Chart-to-chart aspects", "Attraction & chemistry", "Communication", "Long-term potential"], languages: ["en"], pagesHint: "40+ pages",
    price: 49900, mrp: 99900, icon: "heart", accent: "rose", status: "disabled", featured: false, sortOrder: 23,
  },
  {
    slug: "star-sign-compatibility", title: "Star Sign Compatibility", titleHi: "राशि अनुकूलता", category: "western", inputKind: "single", endpoint: "star_sign_compatibility_report",
    tagline: "Which signs match yours best — love, friendship and work.", description: "A 60-page guide to how your sign gets along with all twelve signs. (Enable once your plan includes it.)",
    features: ["All 12 signs compared", "Love & friendship", "Work relationships"], languages: ["en"], pagesHint: "60+ pages",
    price: 29900, mrp: 59900, icon: "star", accent: "gold", status: "disabled", featured: false, sortOrder: 24,
  },
];
