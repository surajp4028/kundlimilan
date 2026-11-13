import type { NextRequest } from "next/server";
import { ApiError, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { getSetting, setSettings } from "@/lib/server/settings";
import { decrypt, encrypt } from "@/lib/server/crypto";
import { deleteObject, putObject, sniffImage, storagePrefix } from "@/lib/server/storage";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";

const MAX = 1024 * 1024;
const HERO_MAX = 8 * 1024 * 1024;
/** ?kind=hero → the home-page Ganesh image; default → the logo. */
const kindOf = (req: NextRequest) => (req.nextUrl.searchParams.get("kind") === "hero" ? "hero" : "logo");

/** Validates an uploaded SVG: no scripts, event handlers, external refs or foreign objects. */
function safeSvg(b: Uint8Array) {
  const t = new TextDecoder().decode(b);
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(t)) return false;
  return !/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<!ENTITY|<iframe|<embed|<object|xlink:href\s*=\s*["']\s*(?!#|data:image)/i.test(t);
}

export const POST = route(async (req: NextRequest) => {
  const a = await requireAdmin("settings.manage");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "VALIDATION", "Choose an image file.");
  const kind = kindOf(req);
  if (file.size > (kind === "hero" ? HERO_MAX : MAX)) throw new ApiError(413, "TOO_LARGE", kind === "hero" ? "Image must be under 8 MB." : "Logo must be under 1 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const img = sniffImage(bytes);
  let ext: string, type: string;
  if (img) ({ ext, type } = img);
  else if (safeSvg(bytes)) [ext, type] = ["svg", "image/svg+xml"];
  else throw new ApiError(422, "BAD_IMAGE", "Upload a PNG, JPG, WebP or a clean SVG (no scripts).");
  const key = `${storagePrefix()}branding/${kind}_${Date.now()}.${ext}`;
  await putObject(key, bytes, type);
  const old = await decrypt(await getSetting(kind === "hero" ? "hero_key" : "logo_key"));
  if (kind === "hero") await setSettings({ hero_key: await encrypt(key), hero_mode: "upload", hero_version: String(Date.now()) }, a.id);
  else await setSettings({ logo_key: await encrypt(key), logo_mode: "upload", logo_version: String(Date.now()) }, a.id);
  if (old && old !== key) await deleteObject(old);
  await audit({ actorType: "admin", actorId: a.id, action: `branding.${kind}_upload`, ip: getClientIp(req.headers), meta: { type, bytes: bytes.length } });
  return ok({});
}, { csrf: true });

export const DELETE = route(async (req: NextRequest) => {
  const a = await requireAdmin("settings.manage");
  const kind = kindOf(req);
  const old = await decrypt(await getSetting(kind === "hero" ? "hero_key" : "logo_key"));
  if (kind === "hero") await setSettings({ hero_key: "", hero_mode: "photo", hero_version: String(Date.now()) }, a.id);
  else await setSettings({ logo_key: "", logo_mode: "photo", logo_version: String(Date.now()) }, a.id);
  if (old) await deleteObject(old);
  await audit({ actorType: "admin", actorId: a.id, action: `branding.${kind}_reset`, ip: getClientIp(req.headers) });
  return ok({});
});
