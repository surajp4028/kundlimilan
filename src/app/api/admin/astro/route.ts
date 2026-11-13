import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { exec, query, queryOne } from "@/lib/server/db";
import { paging } from "@/lib/server/admin/queries";
import { getNumberSetting } from "@/lib/server/settings";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";

/** AstrologyAPI usage: today's meter vs cap, per endpoint / feature, cache stats, recent calls. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin("api.view");
  const sp = req.nextUrl.searchParams;
  const { page, size, offset } = paging(sp, 30);
  const days = Math.min(90, Math.max(1, Number(sp.get("days")) || 7));
  const [today] = await query<{ json: number; cache: number; pdf_ok: number; pdf_err: number; err: number; blocked: number }>(
    `SELECT SUM(kind='json' AND outcome IN ('ok','error')) json, SUM(outcome='cache') cache, SUM(kind='pdf' AND outcome='ok') pdf_ok,
            SUM(kind='pdf' AND outcome='error') pdf_err, SUM(outcome='error') err, SUM(outcome='blocked') blocked
       FROM astro_api_calls WHERE created_at >= UTC_DATE()`,
  );
  const byEndpoint = await query<{ endpoint: string; kind: string; ok: number; cache: number; err: number; avg_ms: number }>(
    `SELECT endpoint, kind, SUM(outcome='ok') ok, SUM(outcome='cache') cache, SUM(outcome='error') err, ROUND(AVG(CASE WHEN outcome IN ('ok','error') THEN latency_ms END)) avg_ms
       FROM astro_api_calls WHERE created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY GROUP BY endpoint, kind ORDER BY ok DESC LIMIT 50`,
    [days],
  );
  const byFeature = await query<{ feature: string; paid: number; cache: number }>(
    `SELECT COALESCE(feature,'-') feature, SUM(outcome IN ('ok','error')) paid, SUM(outcome='cache') cache
       FROM astro_api_calls WHERE created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY GROUP BY feature ORDER BY paid DESC`,
    [days],
  );
  const daily = await query<{ d: string; json: number; pdf: number; cache: number }>(
    `SELECT DATE_FORMAT(created_at + INTERVAL 330 MINUTE, '%Y-%m-%d') d, SUM(kind='json' AND outcome IN ('ok','error')) json, SUM(kind='pdf') pdf, SUM(outcome='cache') cache
       FROM astro_api_calls WHERE created_at >= UTC_DATE() - INTERVAL 13 DAY GROUP BY d ORDER BY d`,
  );
  const cache = await queryOne<{ n: number; hits: number; live: number }>("SELECT COUNT(*) n, COALESCE(SUM(hits),0) hits, SUM(expires_at > UTC_TIMESTAMP()) live FROM astro_cache");
  const total = (await queryOne<{ n: number }>("SELECT COUNT(*) n FROM astro_api_calls"))?.n ?? 0;
  const recent = await query("SELECT id, kind, endpoint, http_status, outcome, error, latency_ms, feature, user_id, order_ref, created_at FROM astro_api_calls ORDER BY id DESC LIMIT ? OFFSET ?", [size, offset]);
  const n = (v: unknown) => Number(v || 0);
  return ok({
    today: { json: n(today?.json), cache: n(today?.cache), pdfOk: n(today?.pdf_ok), pdfErr: n(today?.pdf_err), errors: n(today?.err), blocked: n(today?.blocked), cap: await getNumberSetting("astro_daily_cap", 500) },
    byEndpoint: byEndpoint.map((r) => ({ ...r, ok: n(r.ok), cache: n(r.cache), err: n(r.err), avg_ms: n(r.avg_ms) })),
    byFeature: byFeature.map((r) => ({ feature: r.feature, paid: n(r.paid), cache: n(r.cache) })),
    daily: daily.map((r) => ({ date: r.d, json: n(r.json), pdf: n(r.pdf), cache: n(r.cache) })),
    cache: { entries: n(cache?.n), hits: n(cache?.hits), live: n(cache?.live) },
    recent, total: Number(total), page, size, days,
  });
});

/** Housekeeping: drop expired cache rows, or everything. */
export const POST = route(async (req: NextRequest) => {
  const a = await requireAdmin("settings.manage");
  const b = await readJson(req, z.object({ action: z.enum(["purge_expired", "purge_all"]) }));
  const r = await exec(b.action === "purge_all" ? "DELETE FROM astro_cache" : "DELETE FROM astro_cache WHERE expires_at < UTC_TIMESTAMP()");
  await audit({ actorType: "admin", actorId: a.id, action: `astro.${b.action}`, ip: getClientIp(req.headers), meta: { rows: r.affectedRows } });
  return ok({ removed: r.affectedRows });
});
