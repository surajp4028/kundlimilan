import type { NextRequest } from "next/server";
import { ok } from "@/lib/server/http";
import { safeEqualHex, signRef } from "@/lib/server/crypto";
import { completePalmReport } from "@/lib/server/orders";
import { logProvider } from "@/lib/server/payments/log";

// downloading the PDF + S3 upload + email
export const maxDuration = 120;

const REF_RE = /^ASTR[0-9A-F]{10}$/;

/**
 * AstrologyAPI calls this when a palm PDF is ready:
 *   { event: "palm_report.completed", request_id, palm_id, status, pdf_url, sent_at }
 * Trust model: the URL carries an HMAC of the order ref (only we and the provider know it) and the body's
 * request_id must match the one stored on that order. The PDF is only downloaded from known provider hosts.
 */
export async function POST(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref") || "";
  const sig = req.nextUrl.searchParams.get("sig") || "";
  if (!REF_RE.test(ref) || !/^[a-f0-9]{40}$/.test(sig) || !safeEqualHex(sig, signRef("palm-webhook", ref))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const raw = await req.text();
  if (raw.length > 20_000) return Response.json({ ok: false }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  const requestId = String(body.request_id || "");
  const pdfUrl = typeof body.pdf_url === "string" ? body.pdf_url : null;
  const status = body.status === true || body.status === "true" || (body.status === undefined && !!pdfUrl);
  await logProvider({ orderRef: ref, provider: "astrologyapi", direction: "inbound", action: "palm.webhook", httpStatus: 200, outcome: status && pdfUrl ? "ok" : "error", request: null, response: body });
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) return Response.json({ ok: false }, { status: 400 });
  const r = await completePalmReport(ref, { requestId, status, pdfUrl });
  return ok({ received: true, ...("ignored" in r ? { ignored: true } : {}) });
}
