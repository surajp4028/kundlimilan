"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Pause, Pencil, Play, Plus, TicketPercent, Trash2 } from "lucide-react";
import { useFetch } from "./use-fetch";
import { Badge, Btn, Card, Drawer, Empty, Input, Label, Modal, PageHeader, Select, Toggle, copy } from "./ui";
import { api, errMsg } from "@/lib/client/api";
import { inr } from "@/lib/astro";
import { cn, fmtDate } from "@/lib/utils";

type Coupon = {
  id: number; code: string; title: string | null; discount_type: "percent" | "fixed"; value: number; max_discount: number | null; min_order: number | null;
  service_slug: string | null; per_user_limit: number | null; total_limit: number | null; user_uid: string | null; status: "active" | "paused";
  starts_at: string | null; expires_at: string | null; used_count: number; reserved: number; used: number; discount: number;
};
type Form = { code: string; title: string; type: "percent" | "fixed"; value: string; maxDiscount: string; minOrder: string; service: string; perUserLimit: string; totalLimit: string; userUid: string; active: boolean; startsAt: string; expiresAt: string };
const blank: Form = { code: "", title: "", type: "percent", value: "10", maxDiscount: "", minOrder: "", service: "", perUserLimit: "1", totalLimit: "", userUid: "", active: true, startsAt: "", expiresAt: "" };

/** UTC ISO → value for <input type="datetime-local"> in the browser's zone. */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toForm = (c: Coupon): Form => ({
  code: c.code, title: c.title || "", type: c.discount_type, value: String(c.value), maxDiscount: c.max_discount != null ? String(c.max_discount) : "", minOrder: c.min_order != null ? String(c.min_order) : "",
  service: c.service_slug || "", perUserLimit: c.per_user_limit != null ? String(c.per_user_limit) : "", totalLimit: c.total_limit != null ? String(c.total_limit) : "", userUid: c.user_uid || "",
  active: c.status === "active", startsAt: toLocal(c.starts_at), expiresAt: toLocal(c.expires_at),
});
const num = (s: string) => (s.trim() ? Number(s) : null);
const payload = (f: Form) => ({
  code: f.code.trim().toUpperCase(), title: f.title.trim() || null, type: f.type, value: Number(f.value), maxDiscount: f.type === "percent" ? num(f.maxDiscount) : null, minOrder: num(f.minOrder),
  service: f.service || null, perUserLimit: num(f.perUserLimit), totalLimit: num(f.totalLimit), userUid: f.userUid.trim().toUpperCase() || null, status: f.active ? "active" : "paused",
  startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
});

export function describe(c: Pick<Coupon, "discount_type" | "value" | "max_discount" | "min_order">) {
  const v = c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`;
  return [v, c.max_discount && c.discount_type === "percent" ? `up to ₹${c.max_discount}` : null, c.min_order ? `on ₹${c.min_order}+` : null].filter(Boolean).join(" · ");
}

export function CouponsView() {
  const [now] = useState(() => Date.now());
  const { data, loading, reload } = useFetch<{ coupons: Coupon[] }>("/api/admin/coupons");
  const services = useFetch<{ services: { slug: string; title: string }[] }>("/api/services");
  const [edit, setEdit] = useState<Coupon | "new" | null>(null);
  const [del, setDel] = useState<Coupon | null>(null);
  const svcTitle = (s: string | null) => (s ? services.data?.services.find((x) => x.slug === s)?.title || s : "All reports");

  async function toggle(c: Coupon) {
    try {
      await api(`/api/admin/coupons/${c.id}`, { method: "PUT", body: payload({ ...toForm(c), active: c.status !== "active" }) });
      toast.success(c.status === "active" ? "Paused" : "Activated");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader icon={<TicketPercent />} title="Coupons" sub="Percent or flat ₹ discounts — for every report or one report, with per-customer and total limits, dates and personal codes." actions={<Btn variant="brand" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New coupon</Btn>} />
      {loading && !data && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />)}</div>}
      {data && !data.coupons.length && <Card><Empty title="No coupons yet" /></Card>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.coupons.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at).getTime() < now;
          return (
            <Card key={c.id} className="relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/15 blur-2xl" />
              <div className="relative flex items-start justify-between gap-2">
                <button onClick={() => copy(c.code, "Code copied")} className="group flex items-center gap-2 rounded-xl border-2 border-dashed border-gold/60 bg-gold/[.07] px-3 py-1.5 font-mono text-lg font-extrabold tracking-wider text-ink">
                  {c.code} <Copy className="h-3.5 w-3.5 text-muted group-hover:text-ink" />
                </button>
                <Badge>{expired ? "expired" : c.status}</Badge>
              </div>
              <div className="relative mt-3 font-display text-xl font-semibold text-ink">{describe(c)}</div>
              {c.title && <div className="relative text-sm text-muted">{c.title}</div>}
              <div className="relative mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span className="rounded-md bg-paper px-2 py-0.5">{svcTitle(c.service_slug)}</span>
                {c.per_user_limit && <span className="rounded-md bg-paper px-2 py-0.5">{c.per_user_limit}× per customer</span>}
                {c.total_limit && <span className="rounded-md bg-paper px-2 py-0.5">{c.total_limit} total</span>}
                {c.user_uid && <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-amber-800">only {c.user_uid}</span>}
                {c.expires_at && <span className={cn("rounded-md px-2 py-0.5", expired ? "bg-red-50 text-red-700" : "bg-paper")}>till {fmtDate(c.expires_at)}</span>}
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
                <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Used</div><div className="font-bold tabular-nums text-ink">{c.used}</div></div>
                <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Pending</div><div className="font-bold tabular-nums text-ink">{c.reserved}</div></div>
                <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Given</div><div className="font-bold tabular-nums text-ink">{inr(c.discount)}</div></div>
              </div>
              <div className="relative mt-4 flex gap-1.5">
                <Btn variant="dark" className="flex-1" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /> Edit</Btn>
                <Btn title={c.status === "active" ? "Pause" : "Activate"} onClick={() => toggle(c)}>{c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Btn>
                <Btn variant="danger" title="Delete" onClick={() => setDel(c)}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            </Card>
          );
        })}
      </div>
      <CouponEditor coupon={edit} services={services.data?.services || []} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), reload())} />
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        icon={<Trash2 className="h-5 w-5" />}
        title={`Delete ${del?.code}?`}
        footer={
          <>
            <Btn onClick={() => setDel(null)}>Back</Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                try {
                  const r = await api<{ paused?: boolean }>(`/api/admin/coupons/${del!.id}`, { method: "DELETE" });
                  toast.success(r.paused ? "Already used, so it was paused instead" : "Deleted");
                  setDel(null);
                  reload();
                } catch (e) {
                  toast.error(errMsg(e));
                }
              }}
            >
              Delete
            </Btn>
          </>
        }
      >
        Coupons that were already used are paused instead, so order history stays intact.
      </Modal>
    </>
  );
}

function CouponEditor({ coupon, services, onClose, onSaved }: { coupon: Coupon | "new" | null; services: { slug: string; title: string }[]; onClose: () => void; onSaved: () => void }) {
  const isNew = coupon === "new";
  const key = coupon === null ? "" : isNew ? "new" : String(coupon.id);
  const [st, setSt] = useState<{ key: string; f: Form }>({ key: "", f: blank });
  const f = st.key === key ? st.f : coupon && coupon !== "new" ? toForm(coupon) : blank;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setSt({ key, f: { ...f, [k]: v } });
  const [busy, setBusy] = useState(false);
  const dec = (s: string) => s.replace(/[^\d.]/g, "");
  const int = (s: string) => s.replace(/\D/g, "");

  async function save() {
    setBusy(true);
    try {
      if (isNew) await api("/api/admin/coupons", { body: payload(f) });
      else await api(`/api/admin/coupons/${(coupon as Coupon).id}`, { method: "PUT", body: payload(f) });
      toast.success(isNew ? "Coupon created" : "Saved");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={!!coupon}
      onClose={onClose}
      width="max-w-lg"
      title={isNew ? "New coupon" : `Edit ${(coupon as Coupon | null)?.code ?? ""}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" className="flex-1" disabled={busy || f.code.trim().length < 3 || !(Number(f.value) > 0)} onClick={save}>{busy ? "Saving…" : isNew ? "Create coupon" : "Save changes"}</Btn>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <div>
          <Label hint="Letters, numbers, _ and - (3–32)">Code</Label>
          <Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32))} className="font-mono text-base font-bold tracking-wider" placeholder="ASTRO10" />
        </div>
        <div>
          <Label hint="Shown to customers">Title</Label>
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={100} placeholder="10% off your first report" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select className="w-full" value={f.type} onChange={(v) => set("type", v as Form["type"])} options={[["percent", "Percent %"], ["fixed", "Flat ₹"]]} />
          </div>
          <div>
            <Label>{f.type === "percent" ? "Percent" : "Amount (₹)"}</Label>
            <Input inputMode="decimal" value={f.value} onChange={(e) => set("value", dec(e.target.value))} />
          </div>
          {f.type === "percent" && (
            <div>
              <Label hint="Optional cap">Max discount (₹)</Label>
              <Input inputMode="decimal" value={f.maxDiscount} onChange={(e) => set("maxDiscount", dec(e.target.value))} placeholder="No cap" />
            </div>
          )}
          <div>
            <Label hint="Optional">Minimum order (₹)</Label>
            <Input inputMode="decimal" value={f.minOrder} onChange={(e) => set("minOrder", dec(e.target.value))} placeholder="Any" />
          </div>
        </div>
        <div>
          <Label>Valid for</Label>
          <Select className="w-full" value={f.service} onChange={(v) => set("service", v)} options={[["", "Every report"], ...services.map((s) => [s.slug, s.title] as [string, string])]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint="Blank = unlimited">Uses per customer</Label>
            <Input inputMode="numeric" value={f.perUserLimit} onChange={(e) => set("perUserLimit", int(e.target.value))} />
          </div>
          <div>
            <Label hint="Blank = unlimited">Total uses</Label>
            <Input inputMode="numeric" value={f.totalLimit} onChange={(e) => set("totalLimit", int(e.target.value))} />
          </div>
          <div>
            <Label>Starts</Label>
            <Input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </div>
          <div>
            <Label>Expires</Label>
            <Input type="datetime-local" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </div>
        </div>
        <div>
          <Label hint="Personal code for one customer (optional)">Only for ASTRO ID</Label>
          <Input value={f.userUid} onChange={(e) => set("userUid", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))} className="font-mono" placeholder="AST12345678" />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-line">
          <span>
            <span className="block text-sm font-bold text-ink">Active</span>
            <span className="block text-xs text-muted">Paused coupons can't be applied.</span>
          </span>
          <Toggle on={f.active} onChange={(v) => set("active", v)} label="Active" />
        </label>
      </div>
    </Drawer>
  );
}
