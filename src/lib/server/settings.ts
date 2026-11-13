import "server-only";
import { query, exec } from "./db";
import { env } from "./env";

/**
 * Admin-managed settings (Admin → Settings / Branding). Secrets NEVER live here — they stay in .env.
 * Every key must be declared below; unknown keys are rejected by the API.
 * `public: true` values are readable by any visitor through /api/public/settings.
 */
type Def = { label: string; default: string; max: number; public: boolean; group: string; kind?: "text" | "textarea" | "toggle" | "number" | "color" | "select" | "url" | "email"; options?: string[]; help?: string };

const d = (group: string, label: string, def: string, max: number, pub: boolean, kind: Def["kind"] = "text", extra: Partial<Def> = {}): Def => ({ group, label, default: def, max, public: pub, kind, ...extra });

export const SETTING_DEFS = {
  // ---------------- Branding (shown everywhere on the site) ----------------
  site_name: d("Branding", "Website name", env.appNameDefault, 40, true),
  site_tagline: d("Branding", "Tagline", "Vedic astrology, decoded for modern life.", 120, true),
  site_description: d("Branding", "SEO description", "Premium Vedic astrology — Kundli, Kundli Milan, horoscopes and detailed PDF reports prepared from your exact birth details.", 300, true, "textarea"),
  brand_color: d("Branding", "Accent colour", "#e0a12a", 7, true, "color", { help: "Gold by default. Used for buttons, highlights and the logo glow." }),
  logo_mode: d("Branding", "Logo", "photo", 8, true, "select", { options: ["photo", "painting", "ganesh", "simha", "kumbh", "monogram", "upload"], help: "Pick a built-in ASTRO emblem, or 'upload' to use your own PNG / SVG / WebP (upload it below)." }),
  logo_key: d("Branding", "Uploaded logo (internal)", "", 255, false),
  logo_version: d("Branding", "Logo version", "0", 16, true),
  hero_mode: d("Branding", "Home · Ganesh image", "photo", 8, true, "select", { options: ["photo", "painting", "art", "upload"], help: "'photo' = your Ganesh ji photo with zodiac wheel. 'painting' = Ravi Varma Press Ganesh ji (public domain). 'art' = drawn colour Ganesh ji. 'upload' = your own image (upload it below; PNG with transparent background looks best)." }),
  hero_key: d("Branding", "Uploaded hero image (internal)", "", 255, false),
  hero_version: d("Branding", "Hero image version", "0", 16, true),
  hero_badge: d("Branding", "Home · badge", "Trusted Vedic calculations · Lahiri ayanamsha", 80, true),
  hero_title: d("Branding", "Home · headline", "Your stars, read with precision.", 90, true),
  hero_subtitle: d("Branding", "Home · sub-headline", "Kundli, Kundli Milan and life reports prepared from your exact birth time and place — delivered as beautiful PDFs you keep forever.", 240, true, "textarea"),
  footer_note: d("Branding", "Footer note", "Astrology offers guidance, not guarantees. Please use your own judgement for important decisions.", 240, true, "textarea"),
  company_legal_name: d("Branding", "Legal / company name", "ASTRO", 100, true),
  company_address: d("Branding", "Address", "India", 200, true, "textarea"),
  support_email: d("Branding", "Support email", "support@astro.in", 120, true, "email"),
  support_phone: d("Branding", "Support phone", "+91 90000 00000", 20, true),
  whatsapp: d("Branding", "WhatsApp number (digits)", "", 15, true),
  social_instagram: d("Branding", "Instagram URL", "", 200, true, "url"),
  social_youtube: d("Branding", "YouTube URL", "", 200, true, "url"),
  social_facebook: d("Branding", "Facebook URL", "", 200, true, "url"),
  social_x: d("Branding", "X / Twitter URL", "", 200, true, "url"),

  // ---------------- PDF report branding (sent to AstrologyAPI) ----------------
  pdf_company_name: d("PDF reports", "Company name on PDFs", "ASTRO", 60, false),
  pdf_company_info: d("PDF reports", "Company info on PDFs", "Personalised Vedic astrology reports", 200, false, "textarea"),
  pdf_domain_url: d("PDF reports", "Website on PDFs", "https://astro.in", 120, false, "url"),
  pdf_footer_link: d("PDF reports", "Footer link on PDFs", "https://astro.in", 120, false, "url"),
  pdf_company_email: d("PDF reports", "Email on PDFs", "support@astro.in", 120, false, "email"),
  pdf_company_landline: d("PDF reports", "Landline on PDFs", "", 20, false),
  pdf_company_mobile: d("PDF reports", "Mobile on PDFs", "+91 90000 00000", 20, false),
  pdf_logo_url: d("PDF reports", "Logo URL on PDFs (public https)", "", 255, false, "url", { help: "Must be a public https image. Leave blank to use your uploaded logo when the site is live on https." }),
  pdf_chart_style: d("PDF reports", "Chart style", "NORTH_INDIAN", 14, true, "select", { options: ["NORTH_INDIAN", "SOUTH_INDIAN", "EAST_INDIAN"] }),

  // ---------------- Orders ----------------
  order_hold_minutes: d("Orders", "Unpaid order expires after (minutes)", "30", 4, false, "number"),
  report_max_attempts: d("Orders", "Report generation attempts before giving up", "3", 2, false, "number"),
  auto_refund_failed: d("Orders", "Auto-refund when a report can't be generated", "on", 3, false, "toggle"),
  notify_email: d("Orders", "Email the customer when the report is ready", "on", 3, false, "toggle"),
  max_birth_profiles: d("Orders", "Saved birth profiles per account", "20", 3, true, "number"),
  gst_note: d("Orders", "Price note shown at checkout", "Prices include all taxes.", 120, true),

  // ---------------- Free tools (AstrologyAPI JSON, pay-as-you-go) ----------------
  tool_kundli: d("Free tools", "Free Kundli", "on", 3, true, "toggle"),
  tool_matching: d("Free tools", "Kundli Milan (Guna score)", "on", 3, true, "toggle"),
  tool_horoscope: d("Free tools", "Daily horoscope", "on", 3, true, "toggle"),
  tool_panchang: d("Free tools", "Today's Panchang", "on", 3, true, "toggle"),
  tool_numerology: d("Free tools", "Numerology", "on", 3, true, "toggle"),
  tools_login_required: d("Free tools", "Login required for free Kundli / matching / numerology", "off", 3, true, "toggle"),
  tools_guest_daily: d("Free tools", "Free tool runs per visitor per day (not logged in)", "3", 3, false, "number"),
  tools_user_daily: d("Free tools", "Free tool runs per logged-in user per day", "15", 3, false, "number"),
  astro_api: d("Free tools", "Live AstrologyAPI calls (kill switch)", "on", 3, false, "toggle"),
  astro_daily_cap: d("Free tools", "Max paid JSON calls per day (all users)", "500", 6, false, "number"),
  astro_cache_days: d("Free tools", "Cache identical birth-chart results for (days)", "30", 4, false, "number"),
  default_language: d("Free tools", "Default language", "en", 2, true, "select", { options: ["en", "hi"] }),

  // ---------------- Site ----------------
  maintenance_mode: d("Site", "Maintenance banner", "off", 3, true, "toggle"),
  maintenance_message: d("Site", "Maintenance message", "We are upgrading ASTRO. Some services may be slow.", 200, true),
  user_signup: d("Site", "Allow new sign-ups", "on", 3, false, "toggle"),
  ip_geolocation: d("Site", "IP geolocation for sessions", "on", 3, false, "toggle"),
  otp_resend_seconds: d("Site", "OTP resend cooldown (seconds)", "45", 4, false, "number"),
} as const satisfies Record<string, Def>;

export type SettingKey = keyof typeof SETTING_DEFS;
export const isSettingKey = (k: string): k is SettingKey => Object.prototype.hasOwnProperty.call(SETTING_DEFS, k);

let cache: { at: number; map: Record<string, string> } | null = null;
const TTL = 5_000; // admin changes go live within ~5 s on every instance

async function load(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(SETTING_DEFS)) map[k] = v.default;
  try {
    const rows = await query<{ setting_key: string; setting_value: string | null }>("SELECT setting_key, setting_value FROM app_settings");
    for (const r of rows) if (isSettingKey(r.setting_key) && r.setting_value !== null) map[r.setting_key] = r.setting_value;
  } catch (e) {
    console.error("[settings] load failed", (e as Error).message);
  }
  cache = { at: Date.now(), map };
  return map;
}

export async function getSetting(key: SettingKey): Promise<string> {
  return (await load())[key];
}

export async function getNumberSetting(key: SettingKey, fallback: number): Promise<number> {
  const n = Number(await getSetting(key));
  return Number.isFinite(n) ? n : fallback;
}

export async function getAllSettings(): Promise<Record<SettingKey, string>> {
  return (await load()) as Record<SettingKey, string>;
}

/** Client-visible settings (only `public: true` keys are actually sent). */
export type PublicSettings = Omit<Record<SettingKey, string>, "logo_key" | "hero_key">;

export async function getPublicSettings(): Promise<PublicSettings> {
  const all = await load();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(SETTING_DEFS)) if (v.public) out[k] = all[k];
  return out as PublicSettings;
}

/** Field definitions for the admin forms (no values). */
export function settingSchema() {
  return Object.entries(SETTING_DEFS)
    .filter(([k]) => !["logo_key", "logo_version", "hero_key", "hero_version"].includes(k))
    .map(([key, v]) => ({ key, ...v }));
}

export async function setSettings(values: Partial<Record<SettingKey, string>>, adminId: number) {
  for (const [k, v] of Object.entries(values)) {
    if (!isSettingKey(k) || typeof v !== "string") continue;
    await exec(
      "INSERT INTO app_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)",
      [k, v.slice(0, SETTING_DEFS[k].max), adminId],
    );
  }
  cache = null;
}
