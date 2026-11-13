"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, FileText, IndianRupee, Loader2, RefreshCcw, Radio, ShoppingBag, Sparkles, Undo2, UserPlus, Users } from "lucide-react";
import { useFetch } from "./use-fetch";
import { useAdmin } from "./admin-context";
import { Avatar, Badge, Card, CardHead, Empty, PageHeader, StatCard, Btn } from "./ui";
import { inr } from "@/lib/astro";
import { timeAgo } from "@/lib/utils";

export type Stats = {
  users: { total: number; active: number; today: number; week: number };
  sessions: { live: number; logins24: number };
  orders: { paid: number; revenuePaise: number; todayRevenuePaise: number; todayCount: number; monthRevenuePaise: number; ready: number; failed: number; generating: number; refunded: number };
  api: { calls: number; cached: number; pdf: number; errors: number };
  byService: { service: string; title: string; count: number; revenuePaise: number }[];
  daily: { date: string; count: number; revenuePaise: number }[];
  signups: { date: string; count: number }[];
  recentOrders: { order_ref: string; title: string; status: string; report_status: string; amount_paise: number; created_at: string; user_uid: string; name: string | null; user_id: number }[];
  recent: { id: number; uid: string; name: string | null; email: string | null; phone: string | null; location: string | null; created_at: string }[];
};

/** Fills missing days so charts always show the last 14 IST days. */
export function last14<T extends { date: string }>(rows: T[], blank: (d: string) => T): T[] {
  const map = new Map(rows.map((r) => [r.date, r]));
  const out: T[] = [];
  const now = Date.now() + 5.5 * 3600_000;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400_000).toISOString().slice(0, 10);
    out.push(map.get(d) || blank(d));
  }
  return out;
}

export function Bars({ data, value, label, fmt, tone = "gold" }: { data: { date: string }[]; value: (i: number) => number; label?: (i: number) => string; fmt: (v: number) => string; tone?: "gold" | "violet" }) {
  const vals = data.map((_, i) => value(i));
  const max = Math.max(1, ...vals);
  return (
    <div className="flex h-48 items-end gap-1.5 px-1 sm:gap-2">
      {data.map((d, i) => (
        <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(vals[i] ? 4 : 1.5, (vals[i] / max) * 100)}%` }}
            transition={{ delay: i * 0.025, type: "spring", stiffness: 120, damping: 18 }}
            className={tone === "gold" ? "rounded-t-md bg-gradient-to-t from-gold via-gold-bright to-gold-light" : "rounded-t-md bg-gradient-to-t from-[#6d4bd8] to-violet"}
            style={{ opacity: vals[i] ? 1 : 0.35 }}
          />
          <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-bold text-white group-hover:block">
            {fmt(vals[i])}
            {label ? ` · ${label(i)}` : ""}
          </div>
          <div className="mt-1.5 text-center text-[9px] font-semibold text-muted">{Number(d.date.slice(8))}</div>
        </div>
      ))}
    </div>
  );
}

export function Overview() {
  const admin = useAdmin();
  const { data, loading, reload } = useFetch<{ stats: Stats }>("/api/admin/stats");
  const s = data?.stats;
  const daily = s ? last14(s.daily, (d) => ({ date: d, count: 0, revenuePaise: 0 })) : [];
  const signups = s ? last14(s.signups, (d) => ({ date: d, count: 0 })) : [];
  const maxSvc = Math.max(1, ...(s?.byService.map((b) => b.revenuePaise) || [1]));
  const hour = new Date().getHours();

  return (
    <>
      <PageHeader
        icon={<Sparkles />}
        title={`${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${admin.name.split(" ")[0]}`}
        sub="Revenue, reports, customers and AstrologyAPI usage — live."
        actions={
          <Btn onClick={reload} disabled={loading}>
            <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Revenue today" value={s ? inr(s.orders.todayRevenuePaise) : "—"} hint={s ? `${s.orders.todayCount} paid order${s.orders.todayCount === 1 ? "" : "s"}` : ""} icon={<IndianRupee />} tone="gold" spark={daily.map((d) => d.revenuePaise)} />
        <StatCard label="Last 30 days" value={s ? inr(s.orders.monthRevenuePaise) : "—"} hint={s ? `All-time ${inr(s.orders.revenuePaise)}` : ""} icon={<BarChart3 />} tone="emerald" />
        <StatCard label="Paid orders" value={s?.orders.paid ?? "—"} hint={s ? `${s.orders.refunded} refunded` : ""} icon={<ShoppingBag />} tone="violet" spark={daily.map((d) => d.count)} />
        <StatCard label="Customers" value={s?.users.total ?? "—"} hint={s ? `+${s.users.today} today · +${s.users.week} this week` : ""} icon={<Users />} tone="sky" spark={signups.map((d) => d.count)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Reports ready" value={s?.orders.ready ?? "—"} icon={<CheckCircle2 />} tone="emerald" />
        <StatCard label="Generating now" value={s?.orders.generating ?? "—"} icon={<Loader2 />} tone="sky" />
        <StatCard label="Need attention" value={s?.orders.failed ?? "—"} hint="Paid, report failed" icon={<AlertTriangle />} tone="rose" />
        <StatCard label="Live sessions" value={s?.sessions.live ?? "—"} hint={s ? `${s.sessions.logins24} logins in 24 h` : ""} icon={<Radio />} tone="violet" />
      </div>

      {!!s?.orders.failed && admin.can("orders.view") && (
        <Link href="/admin/orders?status=action" className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 transition hover:bg-red-100">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <b>{s.orders.failed}</b> paid order{s.orders.failed === 1 ? "" : "s"} without a report. Open them to regenerate or refund.
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="Revenue · last 14 days" sub="Paid orders, IST" right={s && <span className="font-display text-xl font-semibold text-ink">{inr(daily.reduce((a, d) => a + d.revenuePaise, 0))}</span>} />
          <div className="p-5">{s ? <Bars data={daily} value={(i) => daily[i].revenuePaise} label={(i) => `${daily[i].count} orders`} fmt={inr} /> : <div className="h-48 animate-pulse rounded-xl bg-paper" />}</div>
        </Card>
        <Card>
          <CardHead title="AstrologyAPI today" right={admin.can("api.view") && <Link href="/admin/api" className="text-xs font-bold text-gold-3 hover:underline">Details</Link>} />
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              ["Paid JSON calls", s?.api.calls],
              ["Served from cache", s?.api.cached],
              ["PDFs generated", s?.api.pdf],
              ["Errors", s?.api.errors],
            ].map(([k, v]) => (
              <div key={String(k)} className="bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{v ?? "—"}</div>
              </div>
            ))}
          </div>
          {s && s.api.calls + s.api.cached > 0 && (
            <div className="px-5 py-4 text-xs text-muted">
              Cache saved <b className="text-ink">{Math.round((s.api.cached / (s.api.calls + s.api.cached)) * 100)}%</b> of free-tool calls today.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="Recent orders" right={admin.can("orders.view") && <Link href="/admin/orders" className="text-xs font-bold text-gold-3 hover:underline">All orders</Link>} />
          {!s?.recentOrders.length ? (
            <Empty title="No paid orders yet" sub="Orders appear here as soon as customers pay." />
          ) : (
            <div className="divide-y divide-line/70">
              {s.recentOrders.map((o) => (
                <Link key={o.order_ref} href={`/admin/orders?ref=${o.order_ref}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-paper/70">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper">
                    <FileText className="h-4 w-4 text-gold-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink">{o.title}</div>
                    <div className="truncate text-xs text-muted">
                      <span className="font-mono">{o.order_ref}</span> · {o.name || o.user_uid} · {timeAgo(o.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-ink">{inr(o.amount_paise)}</div>
                    <Badge>{o.status === "paid" ? o.report_status : o.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHead title="Revenue by report" />
          {!s?.byService.length ? (
            <Empty title="No sales yet" />
          ) : (
            <div className="space-y-4 p-5">
              {s.byService.map((b) => (
                <div key={b.service}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-ink">{b.title}</span>
                    <span className="shrink-0 font-bold tabular-nums text-ink">{inr(b.revenuePaise)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(b.revenuePaise / maxSvc) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright" />
                  </div>
                  <div className="mt-1 text-[11px] text-muted">{b.count} order{b.count === 1 ? "" : "s"}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead title="Newest customers" right={admin.can("users.view") && <Link href="/admin/users" className="text-xs font-bold text-gold-3 hover:underline">All users</Link>} />
        {!s?.recent.length ? (
          <Empty title="No customers yet" />
        ) : (
          <div className="grid divide-y divide-line/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {s.recent.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-paper/70">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{u.name || "Unnamed"}</div>
                  <div className="truncate text-xs text-muted">{u.email || (u.phone ? `+91 ${u.phone}` : u.uid)}</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                  <UserPlus className="h-3 w-3" /> {timeAgo(u.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
        <Undo2 className="h-3 w-3" /> Refunds are counted when Razorpay has processed them.
      </div>
    </>
  );
}
