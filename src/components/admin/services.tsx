"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Package, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useFetch } from "./use-fetch";
import { Badge, Btn, Card, Drawer, Empty, Input, Label, Modal, PageHeader, Select, TextArea, Toggle } from "./ui";
import { api, errMsg } from "@/lib/client/api";
import { ICONS, ACCENTS } from "@/components/astro/service-card";
import { inr, LANGUAGES, SERVICE_ICONS } from "@/lib/astro";
import { cn } from "@/lib/utils";

type Svc = {
  id: number; slug: string; title: string; titleHi: string | null; tagline: string | null; description: string | null; features: string[];
  category: string; inputKind: "single" | "couple" | "single_year" | "palm"; endpoint: string; languages: string[]; pagesHint: string | null;
  price: number; mrp: number | null; icon: string; accent: string; status: "active" | "hidden" | "disabled"; featured: boolean; sortOrder: number;
  stats: { orders: number; revenue: number };
};

/** AstrologyAPI PDF endpoints (pdf.astrologyapi.com/v1/…). */
export const ENDPOINTS: { value: string; label: string; kind: Svc["inputKind"] }[] = [
  { value: "match_making_pdf", label: "Match making (Kundli Milan)", kind: "couple" },
  { value: "pro_horoscope_pdf", label: "Pro horoscope", kind: "single" },
  { value: "basic_horoscope_pdf", label: "Basic horoscope", kind: "single" },
  { value: "mini_horoscope_pdf", label: "Mini horoscope", kind: "single" },
  { value: "premium_kundli_report", label: "Premium kundli", kind: "single" },
  { value: "varshphal_horoscope_pdf", label: "Varshphal (yearly)", kind: "single_year" },
  { value: "pro_numerology_report", label: "Pro numerology", kind: "single" },
  { value: "basic_gemstone_report_pdf", label: "Gemstone report", kind: "single" },
  { value: "natal_horoscope_report/tropical", label: "Western natal (tropical)", kind: "single" },
  { value: "life_forecast_report/tropical", label: "Western life forecast", kind: "single" },
  { value: "solar_return_report/tropical", label: "Western solar return", kind: "single_year" },
  { value: "palm_report", label: "Palm reading (photo, Palmistry API)", kind: "palm" },
  { value: "star_sign_compatibility_report", label: "Star sign compatibility", kind: "single" },
  { value: "synastry_couple_report/tropical", label: "Western synastry (couple)", kind: "couple" },
];

const CATEGORIES = ["kundli", "matching", "yearly", "numerology", "remedies", "western", "palmistry"];
const ACCENT_KEYS = ["gold", "rose", "violet", "sky", "emerald", "amber"] as const;
const INPUT_LABEL = { single: "One person", couple: "Couple (boy + girl)", single_year: "One person + year", palm: "Palm photo + date of birth" };

type Form = {
  slug: string; title: string; titleHi: string; tagline: string; description: string; features: string[]; category: string; inputKind: Svc["inputKind"];
  endpoint: string; languages: string[]; pagesHint: string; price: string; mrp: string; icon: string; accent: string; status: Svc["status"]; featured: boolean; sortOrder: string;
};
const blank: Form = { slug: "", title: "", titleHi: "", tagline: "", description: "", features: [], category: "kundli", inputKind: "single", endpoint: "basic_horoscope_pdf", languages: ["en", "hi"], pagesHint: "", price: "", mrp: "", icon: "sparkles", accent: "gold", status: "hidden", featured: false, sortOrder: "100" };
const toForm = (s: Svc): Form => ({
  slug: s.slug, title: s.title, titleHi: s.titleHi || "", tagline: s.tagline || "", description: s.description || "", features: s.features, category: s.category, inputKind: s.inputKind,
  endpoint: s.endpoint, languages: s.languages, pagesHint: s.pagesHint || "", price: String(s.price / 100), mrp: s.mrp ? String(s.mrp / 100) : "", icon: s.icon, accent: s.accent,
  status: s.status, featured: s.featured, sortOrder: String(s.sortOrder),
});
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export function ServicesView() {
  const { data, loading, reload } = useFetch<{ services: Svc[] }>("/api/admin/services");
  const [edit, setEdit] = useState<Svc | "new" | null>(null);
  const [del, setDel] = useState<Svc | null>(null);
  const list = data?.services || [];

  async function quick(s: Svc, patch: Partial<Form>) {
    try {
      const f = { ...toForm(s), ...patch };
      await api(`/api/admin/services/${s.id}`, { method: "PUT", body: payload(f) });
      toast.success("Updated");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package />}
        title="Report catalogue"
        sub="Every paid report on the site — price, MRP, what it includes, which AstrologyAPI PDF it uses, languages and visibility. Changes go live instantly."
        actions={<Btn variant="brand" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New report</Btn>}
      />
      {loading && !data && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />)}</div>}
      {data && !list.length && <Card><Empty title="No reports yet" sub="Create your first report." /></Card>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((s, i) => {
          const Icon = ICONS[s.icon] || ICONS.sparkles;
          return (
            <Card key={s.id} className={cn("flex flex-col p-5", s.status !== "active" && "opacity-80")}>
              <div className="flex items-start gap-3">
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper bg-gradient-to-br ring-1 ring-black/5", ACCENTS[s.accent] || ACCENTS.gold)}>
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge>{s.status}</Badge>
                    {s.featured && <Badge tone="featured">★ featured</Badge>}
                  </div>
                  <h3 className="mt-1 truncate font-display text-xl font-semibold text-ink">{s.title}</h3>
                  <div className="truncate font-mono text-[11px] text-muted">/{s.slug} · {s.endpoint}</div>
                </div>
              </div>
              {s.tagline && <p className="mt-3 line-clamp-2 text-sm text-muted">{s.tagline}</p>}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Price</div>
                  <div className="font-bold tabular-nums text-ink">{inr(s.price)}</div>
                  {s.mrp ? <div className="text-[11px] text-muted line-through">{inr(s.mrp)}</div> : null}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Orders</div>
                  <div className="font-bold tabular-nums text-ink">{s.stats.orders}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Revenue</div>
                  <div className="font-bold tabular-nums text-ink">{inr(s.stats.revenue)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span className="rounded-md bg-paper px-2 py-0.5">{INPUT_LABEL[s.inputKind]}</span>
                <span className="rounded-md bg-paper px-2 py-0.5 capitalize">{s.category}</span>
                <span className="rounded-md bg-paper px-2 py-0.5 uppercase">{s.languages.join(" · ")}</span>
                {s.pagesHint && <span className="rounded-md bg-paper px-2 py-0.5">{s.pagesHint}</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                <Btn variant="dark" onClick={() => setEdit(s)} className="flex-1"><Pencil className="h-4 w-4" /> Edit</Btn>
                <Btn title={s.status === "active" ? "Hide from site" : "Make active"} onClick={() => quick(s, { status: s.status === "active" ? "hidden" : "active" })}>
                  {s.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Btn>
                <Btn title="Toggle featured" onClick={() => quick(s, { featured: !s.featured })}><Star className={cn("h-4 w-4", s.featured && "fill-gold text-gold-3")} /></Btn>
                <Btn title="Move up" disabled={i === 0} onClick={() => quick(s, { sortOrder: String(Math.max(0, list[i - 1].sortOrder - 1)) })}><ArrowUp className="h-4 w-4" /></Btn>
                <Btn title="Move down" disabled={i === list.length - 1} onClick={() => quick(s, { sortOrder: String(Math.min(9999, list[i + 1].sortOrder + 1)) })}><ArrowDown className="h-4 w-4" /></Btn>
                <Btn variant="danger" title="Delete" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            </Card>
          );
        })}
      </div>
      <ServiceEditor svc={edit} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), reload())} />
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        icon={<Trash2 className="h-5 w-5" />}
        title={`Delete “${del?.title}”?`}
        footer={
          <>
            <Btn onClick={() => setDel(null)}>Back</Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                try {
                  const r = await api<{ disabled?: boolean }>(`/api/admin/services/${del!.id}`, { method: "DELETE" });
                  toast.success(r.disabled ? "It has orders, so it was disabled instead" : "Deleted");
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
        Reports that already have orders are <b>disabled</b> instead of deleted, so customers keep their order history.
      </Modal>
    </>
  );
}

function payload(f: Form) {
  const price = Math.round(Number(f.price) * 100);
  const mrp = f.mrp.trim() ? Math.round(Number(f.mrp) * 100) : null;
  return {
    slug: f.slug.trim(), title: f.title.trim(), titleHi: f.titleHi.trim() || null, tagline: f.tagline.trim() || null, description: f.description.trim() || null,
    features: f.features.map((x) => x.trim()).filter(Boolean), category: f.category, inputKind: f.inputKind, endpoint: f.endpoint.trim(), languages: f.languages,
    pagesHint: f.pagesHint.trim() || null, price, mrp, icon: f.icon, accent: f.accent, status: f.status, featured: f.featured, sortOrder: Number(f.sortOrder) || 0,
  };
}

function ServiceEditor({ svc, onClose, onSaved }: { svc: Svc | "new" | null; onClose: () => void; onSaved: () => void }) {
  const isNew = svc === "new";
  const key = svc === null ? "" : isNew ? "new" : String(svc.id);
  const [state, setState] = useState<{ key: string; f: Form }>({ key: "", f: blank });
  const f = state.key === key ? state.f : svc && svc !== "new" ? toForm(svc) : blank;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setState({ key, f: { ...f, [k]: v } });
  const [feat, setFeat] = useState("");
  const [busy, setBusy] = useState(false);
  const custom = !ENDPOINTS.some((e) => e.value === f.endpoint);
  const off = Number(f.mrp) > Number(f.price) && Number(f.price) > 0 ? Math.round(((Number(f.mrp) - Number(f.price)) / Number(f.mrp)) * 100) : 0;

  async function save() {
    if (!f.title.trim() || !f.slug.trim()) return toast.error("Title and slug are required");
    if (!(Number(f.price) >= 1)) return toast.error("Price must be at least ₹1");
    if (!f.languages.length) return toast.error("Pick at least one language");
    setBusy(true);
    try {
      if (isNew) await api("/api/admin/services", { body: payload(f) });
      else await api(`/api/admin/services/${(svc as Svc).id}`, { method: "PUT", body: payload(f) });
      toast.success(isNew ? "Report created" : "Saved");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={!!svc}
      onClose={onClose}
      title={isNew ? "New report" : "Edit report"}
      sub={!isNew && svc ? `/reports/${(svc as Svc).slug}` : "Shown on the website once status is Active"}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" className="flex-1" disabled={busy} onClick={save}>{busy ? "Saving…" : isNew ? "Create report" : "Save changes"}</Btn>
        </>
      }
    >
      <div className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => setState({ key, f: { ...f, title: e.target.value, ...(isNew && (!f.slug || f.slug === slugify(f.title)) ? { slug: slugify(e.target.value) } : {}) } })} maxLength={80} placeholder="Kundli Milan Report" />
          </div>
          <div>
            <Label hint="URL: /reports/<slug>">Slug</Label>
            <Input value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="kundli-milan-report" />
          </div>
          <div>
            <Label>Title in Hindi</Label>
            <Input value={f.titleHi} onChange={(e) => set("titleHi", e.target.value)} maxLength={80} placeholder="कुंडली मिलान रिपोर्ट" />
          </div>
          <div className="sm:col-span-2">
            <Label>Tagline</Label>
            <Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} placeholder="One line shown on the card" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <TextArea rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} placeholder="Shown on the report page" />
          </div>
        </section>

        <section>
          <Label hint="Bullet points on the card and report page (max 16)">What's included</Label>
          <div className="space-y-1.5">
            {f.features.map((x, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input value={x} onChange={(e) => set("features", f.features.map((y, j) => (j === i ? e.target.value : y)))} maxLength={120} />
                <Btn title="Up" disabled={i === 0} onClick={() => { const a = [...f.features]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("features", a); }}><ArrowUp className="h-4 w-4" /></Btn>
                <Btn title="Remove" onClick={() => set("features", f.features.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Btn>
              </div>
            ))}
            {f.features.length < 16 && (
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (feat.trim()) set("features", [...f.features, feat.trim()]);
                  setFeat("");
                }}
              >
                <Input value={feat} onChange={(e) => setFeat(e.target.value)} placeholder="Add a feature and press Enter" maxLength={120} />
                <Btn type="submit"><Plus className="h-4 w-4" /></Btn>
              </form>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
          <div className="sm:col-span-2 text-sm font-bold text-ink">Report engine</div>
          <div className="sm:col-span-2">
            <Label hint="AstrologyAPI PDF endpoint used to generate this report">PDF endpoint</Label>
            <Select
              className="w-full"
              value={custom ? "__custom" : f.endpoint}
              onChange={(v) => {
                if (v === "__custom") return set("endpoint", "");
                const ep = ENDPOINTS.find((e) => e.value === v);
                setState({ key, f: { ...f, endpoint: v, inputKind: ep?.kind ?? f.inputKind } });
              }}
              options={[...ENDPOINTS.map((e) => [e.value, `${e.label} — ${e.value}`] as [string, string]), ["__custom", "Custom endpoint…"]]}
            />
            {custom && <Input className="mt-2 font-mono" value={f.endpoint} onChange={(e) => set("endpoint", e.target.value.trim())} placeholder="e.g. some_report_pdf" />}
          </div>
          <div>
            <Label>Customer fills in</Label>
            <Select className="w-full" value={f.inputKind} onChange={(v) => set("inputKind", v as Form["inputKind"])} options={Object.entries(INPUT_LABEL) as [string, string][]} />
          </div>
          <div>
            <Label>Category</Label>
            <Select className="w-full" value={f.category} onChange={(v) => set("category", v)} options={CATEGORIES.map((c) => [c, c[0].toUpperCase() + c.slice(1)])} />
          </div>
          <div className="sm:col-span-2">
            <Label>Languages offered</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(LANGUAGES).map(([k, l]) => {
                const on = f.languages.includes(k);
                return (
                  <button key={k} type="button" onClick={() => set("languages", on ? f.languages.filter((x) => x !== k) : [...f.languages, k])} className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition", on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70")}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Pages hint</Label>
            <Input value={f.pagesHint} onChange={(e) => set("pagesHint", e.target.value)} maxLength={24} placeholder="25+ pages" />
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-3">
          <div className="sm:col-span-3 text-sm font-bold text-ink">Pricing</div>
          <div>
            <Label hint="Including taxes">Price (₹)</Label>
            <Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="499" />
          </div>
          <div>
            <Label hint="Shown struck-through">MRP (₹)</Label>
            <Input inputMode="decimal" value={f.mrp} onChange={(e) => set("mrp", e.target.value.replace(/[^\d.]/g, ""))} placeholder="999" />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-xl bg-paper p-2.5 text-center text-sm">
              {off ? <span className="font-bold text-emerald-700">{off}% off</span> : <span className="text-muted">No discount</span>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-line bg-white p-4">
          <div className="text-sm font-bold text-ink">Look & visibility</div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_ICONS.map((k) => {
                const I = ICONS[k];
                return (
                  <button key={k} type="button" title={k} onClick={() => set("icon", k)} className={cn("grid h-10 w-10 place-items-center rounded-xl border transition", f.icon === k ? "border-gold bg-gold/15 text-gold-3" : "border-line text-ink/60 hover:border-ink/30")}>
                    {I && <I className="h-[18px] w-[18px]" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_KEYS.map((a) => (
                <button key={a} type="button" onClick={() => set("accent", a)} className={cn("grid h-10 w-10 place-items-center rounded-full bg-paper bg-gradient-to-br ring-2 transition", ACCENTS[a], f.accent === a ? "ring-gold" : "ring-transparent")} title={a}>
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select className="w-full" value={f.status} onChange={(v) => set("status", v as Form["status"])} options={[["active", "Active — on the site"], ["hidden", "Hidden — not listed"], ["disabled", "Disabled — can't be ordered"]]} />
            </div>
            <div>
              <Label hint="Lower shows first">Sort order</Label>
              <Input inputMode="numeric" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-paper p-3">
            <span>
              <span className="block text-sm font-bold text-ink">Featured</span>
              <span className="block text-xs text-muted">Shows a “Bestseller” badge and is listed first.</span>
            </span>
            <Toggle on={f.featured} onChange={(v) => set("featured", v)} label="Featured" />
          </label>
        </section>
      </div>
    </Drawer>
  );
}
