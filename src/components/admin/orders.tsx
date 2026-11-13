"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowDownLeft, ArrowUpRight, Ban, ChevronDown, Copy, ExternalLink, FileText, Heart, IndianRupee, Mail, MapPin, RefreshCcw, RotateCcw, ShieldCheck, ShoppingBag, Undo2, UserRound,
} from "lucide-react";
import { useFetch } from "./use-fetch";
import { useDebounced } from "./users";
import { useAdmin } from "./admin-context";
import { Badge, Btn, Card, CardHead, Chips, copy, Drawer, Empty, Input, Json, KV, Label, Modal, PageHeader, Pager, pretty, SearchBox, Select, Table, Td, TextArea, Toolbar, usePage } from "./ui";
import { api, errMsg } from "@/lib/client/api";
import { inr, LANGUAGES } from "@/lib/astro";
import { cn, fmtDateTime, timeAgo } from "@/lib/utils";

type Row = {
  id: number; order_ref: string; service_slug: string; title: string; subject: string | null; status: string; payment_status: string; report_status: string; report_attempts: number;
  report_error: string | null; language: string; price_paise: number; discount_paise: number; amount_paise: number; coupon_code: string | null; pay_method: string | null;
  pay_payment_id: string | null; paid_at: string | null; created_at: string; user_id: number; user_uid: string; user_name: string | null; refund: { processed: number; pending: number };
};
type ListRes = { orders: Row[]; total: number; page: number; size: number; counts: Record<string, number> };

type Person = { name: string; gender: string; date: string; time: string; place: { name: string; lat: number; lon: number; tzId?: string | null }; tz?: number };
type Input = { kind: "single"; person: Person } | { kind: "couple"; boy: Person; girl: Person } | { kind: "single_year"; person: Person; year: number };
type Detail = {
  order: Row & { pay_order_id: string | null; report_started_at: string | null; completed_at: string | null; notified_at: string | null; hold_expires_at: string | null; updated_at: string; currency: string };
  customer: { id: number; uid: string; name: string | null; email: string | null; phone: string | null };
  input: Input | null;
  report: { size_bytes: number; download_count: number; last_downloaded_at: string | null; created_at: string; sha256: string | null; url: string } | null;
  attempts: { id: number; paymentId: string; orderId: string; status: string; method: string | null; amount: number | null; errorCode: string | null; error: string | null; verified: boolean; source: string; at: string; data: unknown }[];
  refunds: { id: number; refund_id: string | null; amount_paise: number; status: string; reason: string | null; initiated_by: string; created_at: string }[];
  logs: { id: number; provider: string; direction: string; action: string; http_status: number | null; outcome: string; external_id: string | null; latency_ms: number | null; request: string | null; response: string | null; created_at: string }[];
};

const STATUS_CHIPS = [
  { value: "", label: "All", key: "all" },
  { value: "action", label: "Needs action", key: "action", tone: "bg-red-100 text-red-700" },
  { value: "completed", label: "Completed", key: "completed" },
  { value: "paid", label: "Paid · generating", key: "paid" },
  { value: "pending", label: "Awaiting payment", key: "pending" },
  { value: "failed", label: "Failed", key: "failed" },
  { value: "refund_pending", label: "Refund pending", key: "refund_pending" },
  { value: "refunded", label: "Refunded", key: "refunded" },
  { value: "cancelled", label: "Cancelled", key: "cancelled" },
];

/** One status for the list: payment → report. */
export function orderState(o: Pick<Row, "status" | "payment_status" | "report_status">) {
  if (o.status === "refunded" || o.status === "cancelled" || o.status === "pending") return o.status;
  if (o.payment_status === "paid") return o.report_status === "ready" ? "completed" : o.report_status === "generating" ? "generating" : o.report_status === "failed" ? "failed" : "paid";
  return o.status;
}

export function OrdersView() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [service, setService] = useState("");
  const [range, setRange] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = usePage(`${dq}|${status}|${service}|${range}`);
  const { data, loading, reload } = useFetch<ListRes>(`/api/admin/orders?${new URLSearchParams({ q: dq, status, service, range, page: String(page) })}`);
  const services = useFetch<{ services: { slug: string; title: string }[] }>("/api/services");
  const openRef = sp.get("ref");
  const setOpen = (ref: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (ref) p.set("ref", ref);
    else p.delete("ref");
    router.replace(`/admin/orders${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  return (
    <>
      <PageHeader icon={<ShoppingBag />} title="Orders & reports" sub="Every paid report — birth details, payment, PDF generation and refunds. Open an order to regenerate, resend or refund." actions={<Btn onClick={reload}><RefreshCcw className="h-4 w-4" /> Refresh</Btn>} />
      <Card>
        <div className="border-b border-line p-3 md:p-4">
          <Chips value={status} onChange={setStatus} items={STATUS_CHIPS.map((c) => ({ value: c.value, label: c.label, count: data?.counts[c.key], tone: c.tone }))} />
        </div>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="ASTR… ref, AST… customer id, pay_… or order_…" />
          <Select value={service} onChange={setService} options={[["", "All reports"], ...(services.data?.services.map((s) => [s.slug, s.title] as [string, string]) || [])]} />
          <Select value={range} onChange={setRange} options={[["", "Any time"], ["today", "Last 24 h"], ["7d", "Last 7 days"], ["30d", "Last 30 days"]]} />
          <span className="ml-auto text-xs text-muted">{data ? `${data.total} orders` : ""}</span>
        </Toolbar>

        {/* phones: cards */}
        <div className="divide-y divide-line/70 md:hidden">
          {loading && !data && <div className="p-10 text-center text-sm text-muted">Loading…</div>}
          {data && !data.orders.length && <Empty title="No orders match" />}
          {data?.orders.map((o) => (
            <button key={o.id} onClick={() => setOpen(o.order_ref)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-paper">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-paper">{o.service_slug.includes("milan") ? <Heart className="h-4 w-4 text-rose" /> : <FileText className="h-4 w-4 text-gold-3" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink">{o.title}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{inr(o.amount_paise)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">{o.subject || "—"}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge>{orderState(o)}</Badge>
                  <span className="font-mono text-[11px] text-muted">{o.order_ref}</span>
                  <span className="text-[11px] text-muted">· {timeAgo(o.created_at)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* desktop: table */}
        <div className="hidden md:block">
          <Table head={["Order", "Report · for", "Customer", "Amount", "Payment", "Report", "Created"]} loading={loading} empty={!data?.orders.length}>
            {data?.orders.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o.order_ref)} className="cursor-pointer transition hover:bg-paper/70">
                <Td>
                  <div className="font-mono text-xs font-bold text-ink">{o.order_ref}</div>
                  <div className="text-[11px] uppercase text-muted">{o.language}</div>
                </Td>
                <Td className="max-w-[240px]">
                  <div className="truncate font-semibold">{o.title}</div>
                  <div className="truncate text-xs text-muted">{o.subject || "—"}</div>
                </Td>
                <Td>
                  <div className="truncate font-medium">{o.user_name || "—"}</div>
                  <div className="font-mono text-[11px] text-muted">{o.user_uid}</div>
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="font-bold tabular-nums">{inr(o.amount_paise)}</div>
                  {o.discount_paise > 0 && <div className="text-[11px] text-emerald-700">−{inr(o.discount_paise)} {o.coupon_code}</div>}
                  {o.refund.processed + o.refund.pending > 0 && <div className="text-[11px] text-violet-700">↩ {inr(o.refund.processed + o.refund.pending)}{o.refund.pending ? " pending" : ""}</div>}
                </Td>
                <Td>
                  <Badge>{o.payment_status}</Badge>
                  {o.pay_method && <div className="mt-0.5 text-[11px] uppercase text-muted">{o.pay_method}</div>}
                </Td>
                <Td>
                  <Badge>{o.payment_status === "unpaid" ? o.status : o.report_status}</Badge>
                  {o.report_error && <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-red-600" title={o.report_error}>{o.report_error}</div>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{timeAgo(o.created_at)}</Td>
              </tr>
            ))}
          </Table>
        </div>
        {data && <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />}
      </Card>
      <OrderDrawer refId={openRef} onClose={() => setOpen(null)} onChanged={reload} />
    </>
  );
}

function OrderDrawer({ refId, onClose, onChanged }: { refId: string | null; onClose: () => void; onChanged: () => void }) {
  const admin = useAdmin();
  const { data, error, reload } = useFetch<Detail>(refId ? `/api/admin/orders/${refId}` : null);
  const d = data && data.order.order_ref === refId ? data : null;
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "regenerate" | "cancel" | "refund" | "reconcile" | "resend_email">(null);
  const [refund, setRefund] = useState({ amount: "", reason: "" });

  const o = d?.order;
  const refunded = d ? d.refunds.filter((r) => r.status !== "failed").reduce((a, r) => a + r.amount_paise, 0) : 0;
  const refundable = o ? Math.max(0, o.amount_paise - refunded) : 0;

  async function act(action: NonNullable<typeof confirm>) {
    if (!refId) return;
    setBusy(action);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "refund") {
        const rupees = refund.amount.trim() ? Number(refund.amount) : null;
        if (rupees !== null && (!Number.isFinite(rupees) || rupees < 1)) throw new Error("Enter a valid amount");
        if (rupees !== null) body.amount = Math.round(rupees * 100);
        body.reason = refund.reason.trim();
      }
      const r = await api<Record<string, unknown>>(`/api/admin/orders/${refId}/action`, { body });
      const msg =
        action === "regenerate" ? "Report generated" :
        action === "resend_email" ? "Email sent" :
        action === "reconcile" ? `Checked ${r.payments ?? 0} payment(s) with Razorpay${r.confirmed ? " · payment confirmed" : ""}` :
        action === "cancel" ? "Order cancelled" : "Refund started";
      toast.success(msg);
      setConfirm(null);
      setRefund({ amount: "", reason: "" });
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error && !("info" in e) ? e.message : errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  const footer = o && (
    <>
      {admin.can("orders.manage") && o.payment_status === "paid" && o.status !== "refunded" && (
        <Btn variant="brand" disabled={!!busy || o.report_status === "generating"} onClick={() => setConfirm("regenerate")}>
          <RotateCcw className={cn("h-4 w-4", busy === "regenerate" && "animate-spin")} /> {o.report_status === "ready" ? "Regenerate" : "Generate report"}
        </Btn>
      )}
      {admin.can("orders.manage") && o.report_status === "ready" && (
        <Btn disabled={!!busy} onClick={() => setConfirm("resend_email")}><Mail className="h-4 w-4" /> Resend email</Btn>
      )}
      {admin.can("orders.manage") && o.pay_order_id && (
        <Btn disabled={!!busy} onClick={() => act("reconcile")}><RefreshCcw className={cn("h-4 w-4", busy === "reconcile" && "animate-spin")} /> Re-check Razorpay</Btn>
      )}
      {admin.can("payments.refund") && (o.payment_status === "paid" || o.payment_status === "refunded") && refundable >= 100 && (
        <Btn variant="danger" disabled={!!busy} onClick={() => setConfirm("refund")}><Undo2 className="h-4 w-4" /> Refund</Btn>
      )}
      {admin.can("orders.manage") && o.payment_status === "unpaid" && o.status === "pending" && (
        <Btn variant="danger" disabled={!!busy} onClick={() => setConfirm("cancel")}><Ban className="h-4 w-4" /> Cancel</Btn>
      )}
    </>
  );

  return (
    <>
      <Drawer
        open={!!refId}
        onClose={onClose}
        title={o ? o.title : refId || "Order"}
        sub={o ? <span className="flex flex-wrap items-center gap-2"><button onClick={() => copy(o.order_ref, "Order ref copied")} className="inline-flex items-center gap-1 font-mono hover:text-ink">{o.order_ref} <Copy className="h-3 w-3" /></button> · {fmtDateTime(o.created_at)}</span> : null}
        footer={footer}
      >
        {!d && !error && <div className="p-10 text-center text-sm text-muted">Loading…</div>}
        {error && !d && <div className="p-10 text-center text-sm text-red-600">{error}</div>}
        {d && o && (
          <div className="space-y-4 p-4 sm:p-5">
            {/* status strip */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Payment", <Badge key="p">{o.payment_status}</Badge>],
                ["Report", <Badge key="r">{o.payment_status === "unpaid" ? "not_started" : o.report_status}</Badge>],
                ["Order", <Badge key="o">{o.status}</Badge>],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-2xl border border-line bg-white p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</div>
                  <div className="mt-1.5">{v}</div>
                </div>
              ))}
            </div>
            {o.report_error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <b>Last error:</b> {o.report_error} <span className="text-red-600/70">· attempt {o.report_attempts}</span>
              </div>
            )}

            {/* report */}
            <Card>
              <CardHead title="Report PDF" right={d.report && <span className="text-xs text-muted">{(d.report.size_bytes / 1024 / 1024).toFixed(2)} MB</span>} />
              {d.report ? (
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-light to-gold text-ongold"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1 text-xs text-muted">
                    <div className="text-sm font-bold text-ink">Ready · {fmtDateTime(d.report.created_at)}</div>
                    Downloaded {d.report.download_count}× by customer{d.report.last_downloaded_at ? ` · last ${timeAgo(d.report.last_downloaded_at)}` : ""}
                    {o.notified_at && <> · emailed {timeAgo(o.notified_at)}</>}
                  </div>
                  <a href={d.report.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-[13px] font-bold text-white hover:bg-ink/90">
                    <ExternalLink className="h-4 w-4" /> Open PDF
                  </a>
                </div>
              ) : (
                <div className="p-4 text-sm text-muted">{o.payment_status === "paid" ? "Not generated yet." : "Generated after payment."}</div>
              )}
            </Card>

            {/* birth details */}
            <Card>
              <CardHead title="Birth details" sub={`Language: ${LANGUAGES[o.language] || o.language}`} />
              {!d.input ? (
                <div className="p-4 text-sm text-muted">Could not read the encrypted details.</div>
              ) : d.input.kind === "couple" ? (
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  <PersonCard title="Boy" p={d.input.boy} tone="sky" />
                  <PersonCard title="Girl" p={d.input.girl} tone="rose" />
                </div>
              ) : (
                <div>
                  <PersonCard title={d.input.kind === "single_year" ? `Person · year ${d.input.year}` : "Person"} p={d.input.person} tone="gold" />
                </div>
              )}
            </Card>

            {/* customer + money */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHead title="Customer" right={admin.can("users.view") && <Link href={`/admin/users/${d.customer.id}`} className="text-xs font-bold text-gold-3 hover:underline">Profile</Link>} />
                <KV rows={[["Name", d.customer.name || "—"], ["ASTRO ID", <span key="u" className="font-mono">{d.customer.uid}</span>], ["Email", d.customer.email || "—"], ["Mobile", d.customer.phone ? `+91 ${d.customer.phone}` : "—"]]} />
              </Card>
              <Card>
                <CardHead title="Amount" />
                <KV
                  rows={[
                    ["Price", inr(o.price_paise)],
                    ["Discount", o.discount_paise ? `−${inr(o.discount_paise)} (${o.coupon_code})` : "—"],
                    ["Paid", <b key="a">{inr(o.amount_paise)}</b>],
                    ["Refunded", refunded ? inr(refunded) : "—"],
                    ["Method", o.pay_method ? o.pay_method.toUpperCase() : "—"],
                    ["Paid at", fmtDateTime(o.paid_at)],
                  ]}
                />
              </Card>
            </div>

            {/* payment attempts */}
            {admin.can("payments.view") && (
              <Card>
                <CardHead title="Payment attempts" sub={o.pay_order_id ? <span className="font-mono">{o.pay_order_id}</span> : "No Razorpay order"} />
                {!d.attempts.length ? (
                  <div className="p-4 text-sm text-muted">No attempts recorded.</div>
                ) : (
                  <div className="divide-y divide-line/70">
                    {d.attempts.map((a) => (
                      <Collapsible
                        key={a.id}
                        head={
                          <>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-xs font-bold text-ink">{a.paymentId}</span>
                              <span className="block text-[11px] text-muted">{a.method || "—"} · {a.source}{a.verified ? " · verified" : " · browser-reported"} · {timeAgo(a.at)}</span>
                              {a.error && <span className="block truncate text-[11px] text-red-600">{a.error}</span>}
                            </span>
                            <span className="text-right">
                              <span className="block text-sm font-bold tabular-nums">{a.amount != null ? inr(a.amount) : ""}</span>
                              <Badge>{a.status}</Badge>
                            </span>
                          </>
                        }
                      >
                        <Json title="Razorpay payment" body={pretty(a.data)} />
                      </Collapsible>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* refunds */}
            {d.refunds.length > 0 && (
              <Card>
                <CardHead title="Refunds" />
                <div className="divide-y divide-line/70">
                  {d.refunds.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <Undo2 className="h-4 w-4 shrink-0 text-violet" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold tabular-nums">{inr(r.amount_paise)}</div>
                        <div className="truncate text-[11px] text-muted">{r.reason || "—"} · by {r.initiated_by} · {fmtDateTime(r.created_at)}</div>
                        {r.refund_id && <div className="font-mono text-[11px] text-muted">{r.refund_id}</div>}
                      </div>
                      <Badge>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* provider logs */}
            {admin.can("payments.view") && d.logs.length > 0 && (
              <Card>
                <CardHead title="Provider log" sub="Razorpay, AstrologyAPI and email — exact requests & responses" />
                <div className="divide-y divide-line/70">
                  {d.logs.map((l) => (
                    <Collapsible
                      key={l.id}
                      head={
                        <>
                          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", l.direction === "outbound" ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600")}>
                            {l.direction === "outbound" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <ProviderTag p={l.provider} />
                              <span className="truncate font-mono text-xs font-bold text-ink">{l.action}</span>
                            </span>
                            <span className="block text-[11px] text-muted">{fmtDateTime(l.created_at)}{l.latency_ms != null ? ` · ${l.latency_ms} ms` : ""}</span>
                          </span>
                          <Badge tone={l.outcome}>{String(l.http_status ?? l.outcome)}</Badge>
                        </>
                      }
                    >
                      <div className="grid gap-3 lg:grid-cols-2">
                        <Json title="Request" body={pretty(l.request)} />
                        <Json title="Response" body={pretty(l.response)} />
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </Card>
            )}
            <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Birth details & payloads are stored encrypted · this view is audit-logged.
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={confirm === "regenerate" || confirm === "cancel" || confirm === "resend_email"}
        onClose={() => setConfirm(null)}
        icon={confirm === "cancel" ? <Ban className="h-5 w-5" /> : confirm === "resend_email" ? <Mail className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
        title={confirm === "cancel" ? "Cancel this order?" : confirm === "resend_email" ? "Email the report again?" : o?.report_status === "ready" ? "Regenerate the report?" : "Generate the report now?"}
        footer={
          <>
            <Btn onClick={() => setConfirm(null)}>Back</Btn>
            <Btn variant={confirm === "cancel" ? "danger" : "brand"} disabled={!!busy} onClick={() => confirm && act(confirm)}>
              {busy ? "Working…" : confirm === "cancel" ? "Cancel order" : confirm === "resend_email" ? "Send email" : "Generate"}
            </Btn>
          </>
        }
      >
        {confirm === "cancel" && "The unpaid order is closed and any reserved coupon is released."}
        {confirm === "resend_email" && "The customer gets the report-ready email again (with the PDF attached when small enough)."}
        {confirm === "regenerate" && "A fresh PDF is requested from AstrologyAPI with today's branding and replaces the stored file. This uses one PDF credit and can take up to a minute."}
      </Modal>

      <Modal
        open={confirm === "refund"}
        onClose={() => setConfirm(null)}
        icon={<IndianRupee className="h-5 w-5" />}
        title="Refund payment"
        footer={
          <>
            <Btn onClick={() => setConfirm(null)}>Back</Btn>
            <Btn variant="danger" disabled={!!busy || refund.reason.trim().length < 3} onClick={() => act("refund")}>
              {busy ? "Refunding…" : refund.amount ? `Refund ₹${refund.amount}` : `Refund ${inr(refundable)} (full)`}
            </Btn>
          </>
        }
      >
        <p>Up to <b className="text-ink">{inr(refundable)}</b> can be refunded. Razorpay processes it in 5–7 working days.</p>
        <div className="mt-4 space-y-3 text-left">
          <div>
            <Label hint="Leave blank for the full remaining amount">Amount (₹)</Label>
            <Input inputMode="decimal" value={refund.amount} onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value.replace(/[^\d.]/g, "") }))} placeholder={(refundable / 100).toFixed(2)} />
          </div>
          <div>
            <Label>Reason</Label>
            <TextArea value={refund.reason} onChange={(e) => setRefund((r) => ({ ...r, reason: e.target.value.slice(0, 200) }))} placeholder="e.g. Customer entered wrong birth time" />
          </div>
        </div>
      </Modal>
    </>
  );
}

function PersonCard({ title, p, tone }: { title: string; p: Person; tone: "gold" | "rose" | "sky" }) {
  const dot = tone === "rose" ? "bg-rose" : tone === "sky" ? "bg-sky" : "bg-gold";
  const [y, m, d] = p.date.split("-").map(Number);
  const [h, mi] = p.time.split(":").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const time = `${((h + 11) % 12) + 1}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span className={cn("h-2 w-2 rounded-full", dot)} /> {title}
      </div>
      <div className="mt-2 flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <UserRound className="h-4 w-4 text-gold-3" /> {p.name}
        <span className="text-xs font-sans font-semibold capitalize text-muted">· {p.gender}</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-ink/80">
        <div>{date} · {time}</div>
        <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-3" /> <span>{p.place.name}</span></div>
        <div className="font-mono text-[11px] text-muted">
          {p.place.lat.toFixed(4)}°, {p.place.lon.toFixed(4)}° {p.place.tzId ? `· ${p.place.tzId}` : ""}
          {typeof p.tz === "number" ? ` · UTC${p.tz >= 0 ? "+" : ""}${p.tz}` : ""}
        </div>
      </div>
    </div>
  );
}

export function ProviderTag({ p }: { p: string }) {
  const t: Record<string, string> = { razorpay: "bg-[#0c2451] text-white", astrologyapi: "bg-gradient-to-r from-gold-bright to-gold text-ongold", kundlimilan: "bg-ink text-white", resend: "bg-violet text-white" };
  return <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase", t[p] || "bg-paper text-muted")}>{p === "kundlimilan" ? "astro" : p}</span>;
}

export function Collapsible({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper/60 sm:px-5">
        {head}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-paper/60">
            <div className="p-3 sm:p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

