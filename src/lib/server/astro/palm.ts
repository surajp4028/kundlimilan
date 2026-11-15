import "server-only";
import { exec } from "../db";
import { env } from "../env";
import { logProvider } from "../payments/log";

/* =====================================================================
 * AstrologyAPI Palmistry (https://vision.astrologyapi.com/palmistry)
 *   1. get-palm-id   photo (base64 data URL) + date of birth + gender → palm_id
 *   2. palm-report   palm_id + webhook_url → request_id; the PDF link arrives later on the webhook
 * Auth: the wallet access token (x-astrologyapi-key). Never throws — callers decide on retries.
 * ===================================================================== */

const BASE = "https://vision.astrologyapi.com/palmistry";

export type PalmResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number | null; retryable: boolean };

async function ledger(kind: "json" | "pdf", endpoint: string, status: number | null, ok: boolean, error: string | null, latency: number, orderRef: string, userId?: number | null) {
  await exec("INSERT INTO astro_api_calls (kind, endpoint, http_status, outcome, error, latency_ms, feature, user_id, order_ref) VALUES (?,?,?,?,?,?,?,?,?)", [
    kind, `palm/${endpoint}`, status, ok ? "ok" : "error", error?.slice(0, 200) ?? null, latency, "palm", userId ?? null, orderRef,
  ]).catch(() => {});
}

async function call<T>(endpoint: string, body: Record<string, unknown>, ctx: { orderRef: string; userId?: number | null; lang?: string; logBody: unknown; kind: "json" | "pdf" }, pick: (j: Record<string, unknown>) => T | null): Promise<PalmResult<T>> {
  if (!env.astro.accessToken) return { ok: false, error: "AstrologyAPI access token is not configured", status: null, retryable: false };
  const started = Date.now();
  let status: number | null = null;
  let json: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-astrologyapi-key": env.astro.accessToken, "Accept-Language": ctx.lang || "en" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    });
    status = res.status;
    json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch (e) {
    const latency = Date.now() - started;
    await ledger(ctx.kind, endpoint, status, false, (e as Error).name, latency, ctx.orderRef, ctx.userId);
    await logProvider({ orderRef: ctx.orderRef, provider: "astrologyapi", direction: "outbound", action: `palm.${endpoint}`, httpStatus: status, outcome: "error", latencyMs: latency, request: ctx.logBody, response: { error: (e as Error).name } });
    return { ok: false, error: "The palm reading engine didn't respond in time.", status, retryable: true };
  }
  const latency = Date.now() - started;
  const value = json && json.status !== false ? pick(json) : null;
  const msg = value ? null : String(json?.message || json?.msg || `HTTP ${status}`);
  await ledger(ctx.kind, endpoint, status, !!value, msg, latency, ctx.orderRef, ctx.userId);
  await logProvider({ orderRef: ctx.orderRef, provider: "astrologyapi", direction: "outbound", action: `palm.${endpoint}`, httpStatus: status, outcome: value ? "ok" : "error", latencyMs: latency, request: ctx.logBody, response: json });
  if (value) return { ok: true, value };
  // 4xx about the photo / input or the plan won't fix themselves by retrying
  const retryable = !(status === 400 || status === 401 || status === 403 || status === 422 || /not authori|invalid|palm|image|hand/i.test(msg || ""));
  return { ok: false, error: msg || "Palm reading failed", status, retryable };
}

/** Step 1: scan the photo. */
export function palmScan(p: { image: Uint8Array; contentType: string; day: number; month: number; year: number; gender: string }, ctx: { orderRef: string; userId?: number | null }) {
  const dataUrl = `data:${p.contentType};base64,${Buffer.from(p.image).toString("base64")}`;
  return call<string>(
    "get-palm-id",
    { image_url: dataUrl, day: p.day, month: p.month, year: p.year, gender: p.gender },
    { ...ctx, kind: "json", logBody: { image: `[${p.contentType}, ${p.image.length} bytes]`, day: p.day, month: p.month, year: p.year, gender: p.gender } },
    (j) => {
      const id = (j.data as { palm_id?: string } | undefined)?.palm_id;
      return typeof id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
    },
  );
}

/** Step 2: order the PDF; it is delivered to `webhookUrl`. */
export function palmReport(p: { palmId: string; webhookUrl: string; name: string; language: string }, ctx: { orderRef: string; userId?: number | null }) {
  const body = { palm_id: p.palmId, webhook_url: p.webhookUrl, name: p.name.slice(0, 60), language: p.language === "hi" ? "hi" : "en" };
  return call<string>(
    "palm-report",
    body,
    { ...ctx, lang: body.language, kind: "pdf", logBody: { ...body, webhook_url: body.webhook_url.replace(/sig=[^&]+/, "sig=…") } },
    (j) => (typeof j.request_id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(j.request_id) ? j.request_id : null),
  );
}
