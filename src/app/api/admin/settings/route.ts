import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { getAllSettings, isSettingKey, SETTING_DEFS, setSettings, settingSchema, type SettingKey } from "@/lib/server/settings";
import { encryptionMode } from "@/lib/server/crypto";
import { storageConfigured, storagePrefix } from "@/lib/server/storage";
import { razorpayMode } from "@/lib/server/payments/razorpay";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { env } from "@/lib/server/env";

export const GET = route(async () => {
  await requireAdmin("settings.manage");
  const { logo_key: _k, hero_key: _h, ...settings } = await getAllSettings();
  return ok({
    settings,
    hasLogo: !!_k,
    hasHero: !!_h,
    schema: settingSchema(),
    system: {
      encryption: encryptionMode(),
      storage: storageConfigured() ? `S3 · ${process.env.AWS_BUCKET}/${storagePrefix()}<ASTRO ID>/` : "Not configured",
      payments: process.env.RAZORPAY_KEY_ID ? `Razorpay (${razorpayMode()} mode)` : "Not configured",
      astroJson: env.astro.accessToken ? "AstrologyAPI access token configured" : "Not configured",
      astroPdf: env.astro.pdfUserId && env.astro.pdfApiKey ? `AstrologyAPI PDF · user ${env.astro.pdfUserId}` : "Not configured",
      email: env.zepto.apiKey ? "ZeptoMail configured" : "Not configured",
      sms: env.sms.apiKey ? "Fast2SMS configured" : "Not configured",
      otpDryRun: env.otpDryRun,
      otpTtl: env.otpTtlSeconds,
      userSessionDays: env.userSessionDays,
      adminIdleMinutes: env.adminIdleMinutes,
    },
  });
});

/** Validates one value against its definition (kind + max length). */
function validate(key: SettingKey, raw: unknown): string {
  const def = SETTING_DEFS[key] as { kind?: string; max: number; options?: readonly string[]; label: string };
  if (typeof raw !== "string") throw new ApiError(422, "VALIDATION", `${def.label}: invalid value`, { field: key });
  const v = raw.trim();
  if (v.length > def.max) throw new ApiError(422, "VALIDATION", `${def.label}: max ${def.max} characters`, { field: key });
  const bad = (m: string) => {
    throw new ApiError(422, "VALIDATION", `${def.label}: ${m}`, { field: key });
  };
  switch (def.kind) {
    case "toggle":
      if (v !== "on" && v !== "off") bad("on or off");
      break;
    case "number":
      if (!/^\d{1,7}$/.test(v)) bad("whole number");
      break;
    case "color":
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) bad("hex colour like #e8b65a");
      break;
    case "select":
      if (!def.options?.includes(v)) bad(`one of ${def.options?.join(", ")}`);
      break;
    case "email":
      if (v && !z.string().email().safeParse(v).success) bad("valid email");
      break;
    case "url":
      if (v && !/^https?:\/\/[^\s<>"]+$/i.test(v)) bad("http(s) URL");
      break;
    default:
      if (/[<>]/.test(v)) bad("< and > are not allowed");
  }
  if (key === "site_name" && v.length < 2) bad("at least 2 characters");
  if (key === "otp_resend_seconds" && (+v < 20 || +v > 300)) bad("20 – 300 seconds");
  if (key === "whatsapp" && v && !/^\d{10,15}$/.test(v)) bad("digits only, with country code (e.g. 919000000000)");
  return v;
}

export const PUT = route(async (req: NextRequest) => {
  const a = await requireAdmin("settings.manage");
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "BAD_JSON", "Invalid JSON body");
  }
  const values: Partial<Record<SettingKey, string>> = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!isSettingKey(k) || ["logo_key", "logo_version", "hero_key", "hero_version"].includes(k)) continue; // logo changes go through /api/admin/branding/logo
    values[k] = validate(k, v);
  }
  await setSettings(values, a.id);
  await audit({ actorType: "admin", actorId: a.id, action: "settings.update", ip: getClientIp(req.headers), meta: { keys: Object.keys(values) } });
  const { logo_key: _k, hero_key: _h, ...settings } = await getAllSettings();
  return ok({ settings });
});
