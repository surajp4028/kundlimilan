"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Activity, AlertTriangle, BarChart3, Database, FileText, Gauge, Trash2, Zap } from "lucide-react";
import { useFetch } from "./use-fetch";
import { useAdmin } from "./admin-context";
import { Badge, Btn, Card, CardHead, Empty, Modal, PageHeader, Pager, Select, StatCard, Table, Td, usePage } from "./ui";
import { last14 } from "./overview";
import { api, errMsg } from "@/lib/client/api";
import { cn, fmtDateTime } from "@/lib/utils";

type Res = {
  today: { json: number; cache: number; pdfOk: number; pdfErr: number; errors: number; blocked: number; cap: number };
  byEndpoint: { endpoint: string; kind: string; ok: number; cache: number; err: number; avg_ms: number }[];
  byFeature: { feature: string; paid: number; cache: number }[];
  daily: { date: string; json: number; pdf: number; cache: number }[];
  cache: { entries: number; hits: number; live: number };
  recent: { id: number; kind: string; endpoint: string; http_status: number | null; outcome: string; error: string | null; latency_ms: number; feature: string | null; user_id: number | null; order_ref: string | null; created_at: string }[];
  total: number; page: number; size: number; days: number;
};

export function AstroUsage() {
  const admin = useAdmin();
  const [days, setDays] = useState("7");
  const [page, setPage] = usePage(days);
  const { data, reload } = useFetch<Res>(`/api/admin/astro?days=${days}&page=${page}`);
  const [purge, setPurge] = useState<null | "purge_expired" | "purge_all">(null);
  const t = data?.today;
  const pct = t ? Math.min(100, Math.round((t.json / Math.max(1, t.cap)) * 100)) : 0;
  const daily = data ? last14(data.daily, (d) => ({ date: d, json: 0, pdf: 0, cache: 0 })) : [];
  const max = Math.max(1, ...daily.map((d) => d.json + d.cache + d.pdf));

  return (
    <>
      <PageHeader
        icon={<BarChart3 />}
        title="AstrologyAPI usage"
        sub="Free tools use the pay-as-you-go access token (cached & capped); reports use your PDF plan. Every call is metered here."
        actions={
          <>
            <Select value={days} onChange={setDays} options={[["1", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} />
            {admin.can("settings.manage") && <Link href="/admin/settings?tab=Free%20tools" className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-3.5 text-[13px] font-bold text-ink/80 hover:border-ink/25">Limits & kill switch</Link>}
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted"><Gauge className="h-4 w-4 text-gold-3" /> Today&apos;s paid JSON calls vs daily cap</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold text-ink tabular-nums">{t?.json ?? "—"}</span>
              <span className="text-sm text-muted">/ {t?.cap ?? "—"}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper ring-1 ring-line">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={cn("h-full rounded-full", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-gold to-gold-bright")} />
            </div>
            <div className="mt-2 text-xs text-muted">When the cap is reached, free tools pause until midnight UTC. Paid reports are never blocked.</div>
          </div>
          {t && t.blocked > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {t.blocked} request{t.blocked === 1 ? "" : "s"} blocked today
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Served from cache" value={t?.cache ?? "—"} hint="today · free" icon={<Zap />} tone="emerald" />
        <StatCard label="PDFs generated" value={t?.pdfOk ?? "—"} hint={t?.pdfErr ? `${t.pdfErr} failed` : "today"} icon={<FileText />} tone="gold" />
        <StatCard label="Errors" value={t?.errors ?? "—"} hint="today" icon={<AlertTriangle />} tone="rose" />
        <StatCard label="Cache entries" value={data?.cache.live ?? "—"} hint={data ? `${data.cache.hits} hits · ${data.cache.entries} stored` : ""} icon={<Database />} tone="sky" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead
            title="Last 14 days"
            right={
              <div className="flex gap-3 text-[11px] font-semibold text-muted">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" />Paid JSON</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald" />Cache</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet" />PDF</span>
              </div>
            }
          />
          <div className="flex h-56 items-end gap-1.5 p-5 sm:gap-2">
            {daily.map((d, i) => {
              const tot = d.json + d.cache + d.pdf;
              return (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(tot ? 4 : 1.5, (tot / max) * 100)}%` }} transition={{ delay: i * 0.02 }} className="flex flex-col-reverse overflow-hidden rounded-t-md" style={{ opacity: tot ? 1 : 0.3 }}>
                    <div className="bg-gold" style={{ flex: d.json || 0.0001 }} />
                    <div className="bg-emerald" style={{ flex: d.cache || 0.0001 }} />
                    <div className="bg-violet" style={{ flex: d.pdf || 0.0001 }} />
                  </motion.div>
                  <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                    {d.json} paid · {d.cache} cache · {d.pdf} pdf
                  </div>
                  <div className="mt-1.5 text-center text-[9px] font-semibold text-muted">{Number(d.date.slice(8))}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHead title="By feature" sub={`Last ${data?.days ?? days} day(s)`} />
          {!data?.byFeature.length ? (
            <Empty title="No calls yet" />
          ) : (
            <div className="divide-y divide-line/70">
              {data.byFeature.map((f) => {
                const all = f.paid + f.cache;
                return (
                  <div key={f.feature} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold capitalize text-ink">{f.feature}</span>
                      <span className="text-xs text-muted"><b className="text-ink">{f.paid}</b> paid · {f.cache} cache</span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-paper">
                      <div className="bg-gold" style={{ width: `${all ? (f.paid / all) * 100 : 0}%` }} />
                      <div className="bg-emerald" style={{ width: `${all ? (f.cache / all) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {admin.can("settings.manage") && (
            <div className="flex flex-wrap gap-2 border-t border-line p-4">
              <Btn onClick={() => setPurge("purge_expired")}><Trash2 className="h-4 w-4" /> Clear expired cache</Btn>
              <Btn variant="danger" onClick={() => setPurge("purge_all")}>Clear all cache</Btn>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead title="By endpoint" sub={`Last ${data?.days ?? days} day(s)`} />
        <Table head={["Endpoint", "Kind", "Paid OK", "Cache", "Errors", "Avg latency"]} empty={!data?.byEndpoint.length} minWidth={640}>
          {data?.byEndpoint.map((e) => (
            <tr key={e.endpoint + e.kind} className="hover:bg-paper/70">
              <Td className="font-mono text-xs font-bold">{e.endpoint}</Td>
              <Td><Badge tone={e.kind === "pdf" ? "refunded" : "pending"}>{e.kind}</Badge></Td>
              <Td className="tabular-nums">{e.ok}</Td>
              <Td className="tabular-nums text-emerald-700">{e.cache}</Td>
              <Td className={cn("tabular-nums", e.err && "font-bold text-red-600")}>{e.err}</Td>
              <Td className="tabular-nums text-muted">{e.avg_ms ? `${e.avg_ms} ms` : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card className="mt-4">
        <CardHead title="Recent calls" sub="Birth details are never stored in this ledger" />
        <Table head={["Time", "Endpoint", "Feature", "Outcome", "HTTP", "Latency", "Order / user"]} empty={!data?.recent.length} minWidth={760}>
          {data?.recent.map((r) => (
            <tr key={r.id} className="hover:bg-paper/70">
              <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(r.created_at)}</Td>
              <Td>
                <div className="font-mono text-xs font-bold">{r.endpoint}</div>
                {r.error && <div className="max-w-[260px] truncate text-[11px] text-red-600" title={r.error}>{r.error}</div>}
              </Td>
              <Td className="capitalize">{r.feature || "—"}</Td>
              <Td><Badge>{r.outcome}</Badge></Td>
              <Td className="tabular-nums">{r.http_status ?? "—"}</Td>
              <Td className="tabular-nums text-muted">{r.outcome === "cache" ? "—" : `${r.latency_ms} ms`}</Td>
              <Td className="text-xs">
                {r.order_ref ? <Link href={`/admin/orders?ref=${r.order_ref}`} className="font-mono font-bold text-gold-3 hover:underline">{r.order_ref}</Link> : r.user_id ? <Link href={`/admin/users/${r.user_id}`} className="text-gold-3 hover:underline">user #{r.user_id}</Link> : <span className="text-muted">guest</span>}
              </Td>
            </tr>
          ))}
        </Table>
        {data && <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />}
      </Card>

      <Modal
        open={!!purge}
        onClose={() => setPurge(null)}
        icon={<Activity className="h-5 w-5" />}
        title={purge === "purge_all" ? "Clear the whole cache?" : "Clear expired cache?"}
        footer={
          <>
            <Btn onClick={() => setPurge(null)}>Back</Btn>
            <Btn
              variant={purge === "purge_all" ? "danger" : "dark"}
              onClick={async () => {
                try {
                  const r = await api<{ removed: number }>("/api/admin/astro", { body: { action: purge } });
                  toast.success(`Removed ${r.removed} entr${r.removed === 1 ? "y" : "ies"}`);
                  setPurge(null);
                  reload();
                } catch (e) {
                  toast.error(errMsg(e));
                }
              }}
            >
              Clear
            </Btn>
          </>
        }
      >
        {purge === "purge_all" ? "Every cached result is removed. The next identical requests will be paid calls again." : "Only entries past their expiry are removed — no extra cost."}
      </Modal>
    </>
  );
}
