import "server-only";
import { env } from "../env";
import { exec, queryOne } from "../db";
import { decrypt, encrypt, sha256 } from "../crypto";
import { ApiError } from "../http";
import { getNumberSetting, getSetting } from "../settings";
import { logProvider } from "../payments/log";

/* =====================================================================
 * AstrologyAPI.com — the ONLY module that talks to the provider.
 *
 *  JSON  https://json.astrologyapi.com/v1/<endpoint>
 *        header x-astrologyapi-key: <wallet access token>  (pay-as-you-go)
 *        → kill switch, daily cap, identical-request cache (encrypted), ledger
 *  PDF   https://pdf.astrologyapi.com/v1/<endpoint>
 *        HTTP Basic <user id>:<api key>, form-encoded body (subscription plan)
 *        → returns { pdf_url } which we download, verify and move to our own S3.
 *
 * Credentials never leave the server, are never logged, never sent to the browser.
 * ===================================================================== */

const ENDPOINT_RE = /^[a-z_]+(\/[A-Za-z0-9_]+){0,3}$/;

async function ledger(e: { kind: "json" | "pdf"; endpoint: string; status: number | null; outcome: "ok" | "error" | "cache" | "blocked"; error?: string | null; latency: number; feature?: string; userId?: number | null; orderRef?: string | null }) {
  try {
    await exec("INSERT INTO astro_api_calls (kind, endpoint, http_status, outcome, error, latency_ms, feature, user_id, order_ref) VALUES (?,?,?,?,?,?,?,?,?)", [
      e.kind, e.endpoint.slice(0, 80), e.status, e.outcome, e.error?.slice(0, 200) ?? null, e.latency, e.feature?.slice(0, 32) ?? null, e.userId ?? null, e.orderRef ?? null,
    ]);
  } catch (err) {
    console.error("[astro] ledger write failed", (err as Error).message);
  }
}

export async function jsonCallsToday() {
  const r = await queryOne<{ n: number }>(
    "SELECT COUNT(*) n FROM astro_api_calls WHERE kind = 'json' AND outcome IN ('ok','error') AND created_at >= UTC_DATE()",
  );
  return Number(r?.n || 0);
}

export type JsonOpts = {
  feature: string;
  userId?: number | null;
  lang?: string;
  /** cache lifetime in seconds; 0 = no cache */
  ttl?: number;
};

/** POST a JSON endpoint (wallet token). Identical requests are served from the encrypted cache. */
export async function astroJson<T = unknown>(endpoint: string, body: Record<string, unknown>, o: JsonOpts): Promise<T> {
  if (!ENDPOINT_RE.test(endpoint)) throw new Error("bad astro endpoint");
  const lang = o.lang && /^[a-z]{2}$/.test(o.lang) ? o.lang : "hi";
  const key = sha256(`astro:v1:${endpoint}:${lang}:${JSON.stringify(body)}`);
  const ttl = o.ttl ?? (await getNumberSetting("astro_cache_days", 30)) * 86400;

  if (ttl > 0) {
    const hit = await queryOne<{ response_enc: string }>("SELECT response_enc FROM astro_cache WHERE cache_key = ? AND expires_at > UTC_TIMESTAMP()", [key]);
    if (hit) {
      const txt = await decrypt(hit.response_enc);
      if (txt) {
        void exec("UPDATE astro_cache SET hits = hits + 1 WHERE cache_key = ?", [key]).catch(() => {});
        void ledger({ kind: "json", endpoint, status: 200, outcome: "cache", latency: 0, feature: o.feature, userId: o.userId });
        return JSON.parse(txt) as T;
      }
    }
  }

  if ((await getSetting("astro_api")) !== "on") {
    await ledger({ kind: "json", endpoint, status: null, outcome: "blocked", error: "kill switch", latency: 0, feature: o.feature, userId: o.userId });
    throw new ApiError(503, "ASTRO_OFF", "Live astrology calculations are paused for a while. Please try again later.");
  }
  const cap = await getNumberSetting("astro_daily_cap", 500);
  if ((await jsonCallsToday()) >= cap) {
    await ledger({ kind: "json", endpoint, status: null, outcome: "blocked", error: "daily cap", latency: 0, feature: o.feature, userId: o.userId });
    throw new ApiError(503, "ASTRO_CAP", "Today's free calculations are used up. Please try again tomorrow — paid reports are not affected.");
  }
  if (!env.astro.accessToken) throw new ApiError(503, "ASTRO_NOT_CONFIGURED", "Astrology service is not configured yet.");

  const started = Date.now();
  let status: number | null = null;
  try {
    const res = await fetch(`${env.astro.jsonBase}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-astrologyapi-key": env.astro.accessToken, "Accept-Language": lang },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    status = res.status;
    const json = (await res.json().catch(() => null)) as (Record<string, unknown> & { status?: boolean; msg?: string }) | unknown[] | null;
    const providerFail = !res.ok || json === null || (!Array.isArray(json) && json.status === false);
    if (providerFail) {
      const msg = !Array.isArray(json) && json?.msg ? String(json.msg) : `HTTP ${res.status}`;
      await ledger({ kind: "json", endpoint, status, outcome: "error", error: msg, latency: Date.now() - started, feature: o.feature, userId: o.userId });
      throw new ApiError(502, "ASTRO_PROVIDER", "The astrology engine couldn't calculate this right now. Please check the details and try again.");
    }
    await ledger({ kind: "json", endpoint, status, outcome: "ok", latency: Date.now() - started, feature: o.feature, userId: o.userId });
    if (ttl > 0) {
      await exec(
        "INSERT INTO astro_cache (cache_key, endpoint, response_enc, expires_at) VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL ? SECOND) ON DUPLICATE KEY UPDATE response_enc = VALUES(response_enc), expires_at = VALUES(expires_at)",
        [key, endpoint.slice(0, 80), await encrypt(JSON.stringify(json)), ttl],
      ).catch((e) => console.error("[astro] cache write failed", (e as Error).message));
    }
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    await ledger({ kind: "json", endpoint, status, outcome: "error", error: (e as Error).name, latency: Date.now() - started, feature: o.feature, userId: o.userId });
    throw new ApiError(504, "ASTRO_TIMEOUT", "The astrology engine took too long to respond. Please try again.");
  }
}

/* ------------------------------- PDF reports ------------------------------- */

export type PdfResult = { ok: true; url: string } | { ok: false; error: string; status: number | null; retryable: boolean };

/** Generate a PDF (subscription key). Never throws — the caller decides about retries/refunds. */
export async function astroPdf(endpoint: string, form: Record<string, string | number | boolean>, ctx: { orderRef: string; userId?: number | null }): Promise<PdfResult> {
  if (!ENDPOINT_RE.test(endpoint)) return { ok: false, error: "Invalid report endpoint", status: null, retryable: false };
  if (!env.astro.pdfUserId || !env.astro.pdfApiKey) return { ok: false, error: "PDF credentials are not configured", status: null, retryable: false };
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) body.set(k, String(v));
  const started = Date.now();
  let status: number | null = null;
  let json: { status?: boolean; pdf_url?: string; msg?: string; message?: string; response?: { pdf_url?: string } } | null = null;
  try {
    const res = await fetch(`${env.astro.pdfBase}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${env.astro.pdfUserId}:${env.astro.pdfApiKey}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
    });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch (e) {
    const latency = Date.now() - started;
    await ledger({ kind: "pdf", endpoint, status, outcome: "error", error: (e as Error).name, latency, feature: "report", userId: ctx.userId, orderRef: ctx.orderRef });
    await logProvider({ orderRef: ctx.orderRef, provider: "astrologyapi", direction: "outbound", action: `pdf.${endpoint}`.slice(0, 48), httpStatus: status, outcome: "error", latencyMs: latency, request: redactForm(form, endpoint), response: { error: (e as Error).name } });
    return { ok: false, error: "The report engine didn't respond in time.", status, retryable: true };
  }
  const latency = Date.now() - started;
  const url = json?.pdf_url || json?.response?.pdf_url || "";
  const ok = !!url && json?.status !== false;
  await ledger({ kind: "pdf", endpoint, status, outcome: ok ? "ok" : "error", error: ok ? null : json?.msg || json?.message || `HTTP ${status}`, latency, feature: "report", userId: ctx.userId, orderRef: ctx.orderRef });
  await logProvider({ orderRef: ctx.orderRef, provider: "astrologyapi", direction: "outbound", action: `pdf.${endpoint}`.slice(0, 48), httpStatus: status, outcome: ok ? "ok" : "error", latencyMs: latency, request: redactForm(form, endpoint), response: json });
  if (ok) return { ok: true, url };
  const msg = json?.msg || json?.message || `Report engine error (HTTP ${status})`;
  const retryable = !(status === 405 || /not auth|validation/i.test(msg));
  return { ok: false, error: msg, status, retryable };
}

/** Request body for the admin log — birth details stay (encrypted at rest), credentials never exist here. */
function redactForm(form: Record<string, unknown>, endpoint: string) {
  return { endpoint, body: form };
}

const MAX_PDF = 40 * 1024 * 1024;

/** Downloads the provider's PDF (https + amazonaws host only), checks the %PDF signature. */
export async function downloadProviderPdf(url: string): Promise<Uint8Array> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Invalid PDF URL from provider");
  }
  if (u.protocol !== "https:" || !/(^|\.)amazonaws\.com$/i.test(u.hostname) || u.username || u.password) throw new Error("Unexpected PDF host from provider");
  const res = await fetch(u, { signal: AbortSignal.timeout(90_000), cache: "no-store", redirect: "error" });
  if (!res.ok) throw new Error(`PDF download failed (HTTP ${res.status})`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_PDF) throw new Error("PDF is too large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_PDF) throw new Error("PDF is too large");
  if (buf.length < 1000 || String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") throw new Error("Provider returned something that isn't a PDF");
  return buf;
}
