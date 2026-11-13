"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Check, CheckCircle2, CircleAlert, FileText, Globe, ImageUp, Loader2, Palette, RotateCcw, Save, Server, Settings, ShoppingBag, Sparkles, Trash2, Upload } from "lucide-react";
import { useFetch } from "./use-fetch";
import { Btn, Card, CardHead, Input, Label, PageHeader, Select, TextArea, Toggle } from "./ui";
import { api, errMsg } from "@/lib/client/api";
import { LogoMark } from "@/components/site/logo";
import { MARKS, type MarkKind } from "@/lib/brand-marks";
import { cn } from "@/lib/utils";

type Def = { key: string; label: string; default: string; max: number; public: boolean; group: string; kind?: "text" | "textarea" | "toggle" | "number" | "color" | "select" | "url" | "email"; options?: string[]; help?: string };
type System = { encryption: string; storage: string; payments: string; astroJson: string; astroPdf: string; email: string; sms: string; otpDryRun: boolean; otpTtl: number; userSessionDays: number; adminIdleMinutes: number };
type Res = { settings: Record<string, string>; schema: Def[]; system: System; hasLogo: boolean; hasHero?: boolean };

const GROUP_ICON: Record<string, typeof Settings> = { Branding: Palette, "PDF reports": FileText, Orders: ShoppingBag, "Free tools": Sparkles, Site: Globe, System: Server };
const GROUP_SUB: Record<string, string> = {
  Branding: "Name, logo, colours, contact details and home-page text — shown everywhere on the website and in emails.",
  "PDF reports": "Company details printed on every AstrologyAPI PDF report.",
  Orders: "Checkout holds, report retries, refunds and notifications.",
  "Free tools": "Which free tools are on, how often visitors can use them, and the daily spend cap for the pay-as-you-go API token.",
  Site: "Maintenance banner, sign-ups and security knobs.",
  System: "Read-only status of the services configured on the server (.env).",
};

/** Same accent maths as the root layout (light theme). */
function shade(hex: string, f: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)));
  return "#" + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}
const accentVars = (c: string) =>
  (/^#[0-9a-f]{6}$/i.test(c) ? { "--gold": shade(c, -0.28), "--gold-2": shade(c, -0.42), "--gold-3": shade(c, -0.55), "--gold-bright": c, "--gold-light": shade(c, 0.55) } : {}) as CSSProperties;

export function SettingsView({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const { data, reload } = useFetch<Res>("/api/admin/settings");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => {
    const g: string[] = [];
    for (const d of data?.schema || []) if (!g.includes(d.group)) g.push(d.group);
    return [...g, "System"];
  }, [data]);
  const [tab, setTab] = useState(initialTab || "Branding");
  const active = groups.includes(tab) ? tab : groups[0] || "Branding";
  const v = (k: string) => (k in draft ? draft[k] : data?.settings[k] ?? "");
  const set = (k: string, val: string) => setDraft((d) => (data && data.settings[k] === val ? (({ [k]: _, ...rest }) => rest)(d) : { ...d, [k]: val }));
  const dirty = Object.keys(draft);

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/settings", { method: "PUT", body: draft });
      toast.success(`Saved ${dirty.length} setting${dirty.length === 1 ? "" : "s"} — live within a few seconds`);
      setDraft({});
      reload();
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const fields = (data?.schema || []).filter((d) => d.group === active && !(active === "Branding" && d.key === "logo_mode"));

  return (
    <>
      <PageHeader icon={<Settings />} title="Settings & branding" sub="Everything here is editable without a deploy. Secrets (API keys, passwords) stay in the server's .env and are never shown." />
      <div className="no-scrollbar -mx-3 mb-4 flex gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 sm:mx-0 sm:px-0">
        {groups.map((g) => {
          const I = GROUP_ICON[g] || Settings;
          const n = (data?.schema || []).filter((d) => d.group === g && d.key in draft).length;
          return (
            <button key={g} onClick={() => setTab(g)} className={cn("relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition", active === g ? "text-white" : "border border-line bg-white text-ink/70 hover:border-ink/25")}>
              {active === g && <motion.span layoutId="set-tab" className="absolute inset-0 rounded-xl bg-ink" />}
              <I className="relative h-4 w-4" />
              <span className="relative">{g}</span>
              {n > 0 && <span className="relative rounded-full bg-gold-bright px-1.5 text-[10px] text-ongold">{n}</span>}
            </button>
          );
        })}
      </div>

      {!data && <Card className="p-10 text-center text-sm text-muted"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></Card>}
      {data && (
        <div className="space-y-4 pb-24">
          {active === "Branding" && <BrandingStudio value={v} set={set} hasLogo={data.hasLogo} onLogoChanged={() => (reload(), router.refresh())} />}
          {active === "Branding" && <HeroImageCard hasHero={!!data.hasHero} mode={v("hero_mode")} version={v("hero_version")} onChanged={() => (reload(), router.refresh())} />}
          {active === "System" ? (
            <SystemCard s={data.system} />
          ) : (
            <Card>
              <CardHead title={active} sub={GROUP_SUB[active]} />
              <div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2">
                {fields.map((d) => (
                  <FieldFor key={d.key} d={d} value={v(d.key)} onChange={(val) => set(d.key, val)} changed={d.key in draft} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <AnimatePresence>
        {dirty.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-white/95 p-2.5 pl-4 shadow-2xl backdrop-blur-xl pb-[max(.625rem,env(safe-area-inset-bottom))] lg:left-[300px]">
            <span className="flex-1 text-sm text-ink">
              <b>{dirty.length}</b> unsaved change{dirty.length === 1 ? "" : "s"}
            </span>
            <Btn onClick={() => setDraft({})}><RotateCcw className="h-4 w-4" /> Discard</Btn>
            <Btn variant="brand" disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FieldFor({ d, value, onChange, changed }: { d: Def; value: string; onChange: (v: string) => void; changed: boolean }) {
  const id = `set-${d.key}`;
  const label = (
    <span className="inline-flex items-center gap-1.5">
      {d.label}
      {changed && <span className="h-1.5 w-1.5 rounded-full bg-gold-bright" />}
      {d.public && <span className="rounded bg-paper px-1 text-[9px] font-bold tracking-normal text-muted">PUBLIC</span>}
    </span>
  );
  const wide = d.kind === "textarea";
  if (d.kind === "toggle")
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper/50 p-3.5">
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">{label}</div>
          {d.help && <div className="mt-0.5 text-xs text-muted">{d.help}</div>}
        </div>
        <Toggle on={value === "on"} onChange={(on) => onChange(on ? "on" : "off")} label={d.label} />
      </div>
    );
  return (
    <div className={cn(wide && "md:col-span-2")}>
      <Label htmlFor={id} hint={d.help}>{label}</Label>
      {d.kind === "textarea" ? (
        <TextArea id={id} rows={3} value={value} maxLength={d.max} onChange={(e) => onChange(e.target.value)} />
      ) : d.kind === "select" ? (
        <Select className="w-full" value={value} onChange={onChange} options={(d.options || []).map((o) => [o, o.replace(/_/g, " ")])} />
      ) : d.kind === "color" ? (
        <div className="flex gap-2">
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#e8b65a"} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1" aria-label={d.label} />
          <Input id={id} value={value} maxLength={7} onChange={(e) => onChange(e.target.value.trim())} className="font-mono" />
        </div>
      ) : (
        <Input
          id={id}
          type={d.kind === "email" ? "email" : d.kind === "url" ? "url" : "text"}
          inputMode={d.kind === "number" ? "numeric" : undefined}
          value={value}
          maxLength={d.max}
          onChange={(e) => onChange(d.kind === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)}
          placeholder={d.default}
        />
      )}
      <div className="mt-1 text-right text-[10px] text-muted">{d.kind !== "number" && d.kind !== "select" && d.kind !== "color" ? `${value.length}/${d.max}` : ""}</div>
    </div>
  );
}

/* ----------------------------- Branding studio ----------------------------- */

const SWATCHES = ["#e8b65a", "#d4a24c", "#c9a227", "#b8860b", "#e09a3c", "#c27c4a", "#b5838d", "#8e7cc3", "#5f9ea0", "#3b82f6"];

function BrandingStudio({ value, set, hasLogo, onLogoChanged }: { value: (k: string) => string; set: (k: string, v: string) => void; hasLogo: boolean; onLogoChanged: () => void }) {
  const mode = value("logo_mode") || "photo";
  const color = value("brand_color") || "#e8b65a";
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 1024 * 1024) return toast.error("Logo must be under 1 MB.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/branding/logo", { method: "POST", body: fd, headers: { "X-Requested-With": "km" }, credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || j.ok === false) throw new Error(j.error?.message || "Upload failed");
      toast.success("Logo uploaded and switched on");
      onLogoChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await api("/api/admin/branding/logo", { method: "DELETE" });
      toast.success("Uploaded logo removed — using the Simha emblem");
      onLogoChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const previewMark = (className: string) =>
    mode === "upload" && hasLogo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/public/logo?v=${value("logo_version")}`} alt="" className={cn(className, "object-contain")} />
    ) : (
      <LogoMark className={className} kind={(MARKS.some((m) => m.key === mode) ? mode : "simha") as MarkKind} />
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Card>
        <CardHead title="Logo" sub="Pick a built-in ASTRO emblem or upload your own (PNG, JPG, WebP or a clean SVG, max 1 MB)." />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3" style={accentVars(color)}>
          {MARKS.map((m) => (
            <button key={m.key} type="button" onClick={() => set("logo_mode", m.key)} className={cn("group relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-[#fbf7ef] p-4 transition", mode === m.key ? "border-gold-bright shadow-[0_10px_30px_-15px_rgba(200,146,46,.8)]" : "border-line hover:border-ink/20")}>
              {mode === m.key && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-gold-bright text-ongold"><Check className="h-3 w-3" /></span>}
              <LogoMark kind={m.key} className="h-16 w-16 transition group-hover:scale-105" />
              <span className="text-center text-xs font-bold text-ink">{m.label}</span>
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => (hasLogo ? set("logo_mode", "upload") : fileRef.current?.click())} className={cn("relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white p-4 transition", mode === "upload" ? "border-gold-bright" : "border-line hover:border-ink/25")}>
            {mode === "upload" && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-gold-bright text-ongold"><Check className="h-3 w-3" /></span>}
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/public/logo?v=${value("logo_version")}`} alt="Uploaded logo" className="h-16 w-16 object-contain" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-paper text-gold-3">{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageUp className="h-7 w-7" />}</span>
            )}
            <span className="text-xs font-bold text-ink">{hasLogo ? "My uploaded logo" : "Upload my own"}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Btn disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {hasLogo ? "Replace upload" : "Upload logo"}</Btn>
          {hasLogo && <Btn variant="danger" disabled={busy} onClick={reset}><Trash2 className="h-4 w-4" /> Remove upload</Btn>}
          <span className="ml-auto self-center text-[11px] text-muted">Uploading switches the logo on immediately; emblem choices need Save.</span>
        </div>

        <div className="border-t border-line p-5">
          <Label hint="Buttons, highlights, gold text and the emblem follow this colour.">Accent colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => set("brand_color", c)} className={cn("h-9 w-9 rounded-full ring-2 ring-offset-2 transition", color.toLowerCase() === c ? "ring-ink" : "ring-transparent hover:ring-line")} style={{ background: c }} aria-label={c} />
            ))}
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#e8b65a"} onChange={(e) => set("brand_color", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-0.5" aria-label="Custom colour" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHead title="Live preview" sub="How the header and hero look with these settings" />
        <div style={accentVars(color)} className="bg-[#fbf7ef]">
          <div className="flex items-center justify-between gap-3 border-b border-[#ece3d0] bg-white/70 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {previewMark("h-11 w-11 shrink-0")}
              <div className="min-w-0 leading-none">
                <div className="gold-text truncate font-caps text-xl font-semibold tracking-[.2em]">{value("site_name") || "ASTRO"}</div>
                <div className="mt-1 text-[8.5px] uppercase tracking-[.32em] text-muted">Vedic Astrology</div>
              </div>
            </div>
            <span className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-ongold" style={{ background: "linear-gradient(180deg,var(--gold-light),var(--gold-bright) 55%,var(--gold))" }}>Sign in</span>
          </div>
          <div className="px-5 py-8 text-center">
            <div className="mx-auto inline-flex rounded-full border border-[#e7d9b8] bg-white/70 px-3 py-1 text-[10px] text-gold-3">{value("hero_badge")}</div>
            <div className="mt-4 font-display text-[2rem] font-medium leading-tight text-ink">
              {(value("hero_title") || "").split(" ").slice(0, -1).join(" ")} <em className="gold-text">{(value("hero_title") || "").split(" ").slice(-1)[0]}</em>
            </div>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{value("hero_subtitle")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="rounded-full px-4 py-2 text-xs font-bold text-ongold" style={{ background: "linear-gradient(180deg,var(--gold-light),var(--gold-bright) 55%,var(--gold))" }}>Get a report</span>
              <span className="rounded-full border px-4 py-2 text-xs font-bold text-ink" style={{ borderColor: "var(--gold-bright)" }}>Free Kundli</span>
            </div>
          </div>
          <div className="border-t border-[#ece3d0] px-5 py-3 text-center text-[11px] text-muted">
            {value("support_email")} · {value("support_phone")}
          </div>
        </div>
      </Card>
    </div>
  );
}

function SystemCard({ s }: { s: System }) {
  const rows: [string, string, boolean][] = [
    ["Data encryption", s.encryption === "aws-kms" ? "AWS KMS envelope encryption" : "Local AES-256 key (development)", true],
    ["Report storage", s.storage, !/not configured/i.test(s.storage)],
    ["Payments", s.payments, !/not configured/i.test(s.payments)],
    ["AstrologyAPI · free tools", s.astroJson, !/not configured/i.test(s.astroJson)],
    ["AstrologyAPI · PDF reports", s.astroPdf, !/not configured/i.test(s.astroPdf)],
    ["OTP email", s.email, !/not configured/i.test(s.email)],
    ["OTP SMS", s.sms, !/not configured/i.test(s.sms)],
    ["OTP delivery", s.otpDryRun ? "Dry run — codes are printed in the server console (dev only)" : `Live · codes valid ${Math.round(s.otpTtl / 60)} min`, !s.otpDryRun],
    ["Customer sessions", `${s.userSessionDays} days, rolling`, true],
    ["Admin idle timeout", `${s.adminIdleMinutes} minutes`, true],
  ];
  return (
    <Card>
      <CardHead title="System" sub={GROUP_SUB.System} />
      <div className="divide-y divide-line/70">
        {rows.map(([k, val, ok]) => (
          <div key={k} className="flex items-start gap-3 px-5 py-3.5">
            {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="text-sm font-bold text-ink">{k}</div>
              <div className="break-words text-sm text-muted sm:text-right">{val}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


/** Home-page Ganesh image: built-in colour artwork or the admin's own upload (stored privately, served via /api/public/hero). */
function HeroImageCard({ hasHero, mode, version, onChanged }: { hasHero: boolean; mode: string; version: string; onChanged: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/branding/logo?kind=hero", { method: "POST", body: fd, headers: { "X-Requested-With": "km" }, credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || j.ok === false) throw new Error(j.error?.message || "Upload failed");
      toast.success("Home image updated");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await api("/api/admin/branding/logo?kind=hero", { method: "DELETE" });
      toast.success("Back to the built-in Ganesh artwork");
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const uploaded = mode === "upload" && hasHero;
  return (
    <Card className="mt-4 overflow-hidden">
      <CardHead title="Home · Ganesh image" sub="Shown in the centre of the home-page hero. Use an image you own the rights to — a PNG with a transparent background looks best." />
      <div className="flex flex-wrap items-center gap-5 p-5">
        <div className="grid h-36 w-32 place-items-center rounded-2xl border border-line bg-[radial-gradient(circle,#ffe2b0,#fbf7ef_70%)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploaded ? `/api/public/hero?v=${version}` : "/brand/ganesh-color-800.png"} alt="Home image" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="font-semibold text-ink">{uploaded ? "Your uploaded image" : "Built-in colour Ganesh ji"}</div>
          <div className="flex flex-wrap gap-2">
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Btn disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploaded ? "Replace image" : "Upload image"}</Btn>
            {uploaded && <Btn variant="danger" disabled={busy} onClick={reset}><Trash2 className="h-4 w-4" /> Use built-in art</Btn>}
          </div>
          <p className="text-[11px] text-muted">PNG / JPG / WebP / SVG · up to 8 MB (HD 1500px+ recommended) · goes live immediately.</p>
        </div>
      </div>
    </Card>
  );
}
