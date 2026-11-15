"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BadgePercent, Check, ChevronLeft, Loader2, Lock, ShieldCheck, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { BirthFields, emptyBirth, validateBirth, type BirthDraft } from "./birth-form";
import { Segmented, fmtDate } from "./pickers";
import { PalmFields, emptyPalm, uploadPalmPhoto, validatePalm, type PalmDraft } from "./palm-input";
import { useAuth, useSite } from "@/lib/client/providers";
import { api, errMsg } from "@/lib/client/api";
import { openCheckout } from "@/lib/client/razorpay";
import { fmtBirth, inr, LANGUAGES } from "@/lib/astro";
import { cn } from "@/lib/utils";
import type { ServiceCardData } from "./service-card";

type Draft = { boy: BirthDraft; girl: BirthDraft; person: BirthDraft; year: number; lang: string; palm: PalmDraft };
export const DRAFT_KEY = (slug: string) => `astro.draft.${slug}`;

/** Carry birth details from a free tool straight into the paid report's review step. */
export function handOffToOrder(slug: string, parts: { boy?: BirthDraft; girl?: BirthDraft; person?: BirthDraft; lang?: string }) {
  try {
    sessionStorage.setItem(DRAFT_KEY(slug), JSON.stringify({ ...parts, step: "review" }));
  } catch {}
}

/** Two steps on one page: details → review & pay. Drafts survive the login redirect (sessionStorage). */
export function OrderFlow({ s }: { s: ServiceCardData }) {
  const { user } = useAuth();
  const site = useSite();
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const [d, setD] = useState<Draft>(() => ({ boy: emptyBirth("male"), girl: emptyBirth("female"), person: emptyBirth("male"), palm: emptyPalm(), year: thisYear, lang: s.languages.includes(site.default_language) ? site.default_language : s.languages[0] }));
  const [step, setStep] = useState<"details" | "review">("details");
  const [errs, setErrs] = useState<Record<string, Partial<Record<string, string>>>>({});
  const isPalm = s.inputKind === "palm";
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountPaise: number; title: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY(s.slug));
      if (raw) {
        const saved = JSON.parse(raw) as Draft & { step?: string };
        setD((x) => ({ ...x, ...saved }));
        if (saved.step === "review") setStep("review");
      }
    } catch {}
    if (window.location.hash === "#order") setTimeout(() => document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [s.slug]);

  const parts = isPalm ? ([] as const) : s.inputKind === "couple" ? (["boy", "girl"] as const) : (["person"] as const);
  const validated = useMemo(() => {
    const out: Record<string, ReturnType<typeof validateBirth>> = {};
    for (const p of parts) out[p] = validateBirth(d[p]);
    return out;
  }, [d, parts]);

  function next() {
    const e: typeof errs = {};
    if (isPalm) {
      const v = validatePalm(d.palm);
      if (!v.ok) e.palm = { [v.field]: v.message };
    }
    for (const p of parts) {
      const v = validated[p];
      if (!v.ok) e[p] = { [v.field]: v.message };
    }
    setErrs(e);
    if (Object.keys(e).length) {
      const first = Object.values(e)[0];
      toast.error(Object.values(first)[0]);
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function input(palmPhoto?: string) {
    if (isPalm) return { kind: "palm" as const, person: { name: d.palm.name.trim(), gender: d.palm.gender, date: d.palm.date }, photo: palmPhoto || d.palm.photo || "" };
    const val = (p: "boy" | "girl" | "person") => (validated[p] as { ok: true; value: import("@/lib/astro").BirthInput }).value;
    if (s.inputKind === "couple") return { kind: "couple" as const, boy: val("boy"), girl: val("girl") };
    if (s.inputKind === "single_year") return { kind: "single_year" as const, person: val("person"), year: d.year };
    return { kind: "single" as const, person: val("person") };
  }

  async function applyCoupon() {
    if (!user) return goLogin();
    if (!coupon.trim()) return;
    setChecking(true);
    try {
      const r = await api<{ coupon: { code: string; discountPaise: number; title: string | null } }>("/api/coupons/check", { body: { code: coupon.trim(), service: s.slug } });
      setApplied(r.coupon);
      toast.success(`${r.coupon.code} applied — you save ${inr(r.coupon.discountPaise)}`);
    } catch (e) {
      setApplied(null);
      toast.error(errMsg(e));
    } finally {
      setChecking(false);
    }
  }

  function goLogin() {
    try {
      sessionStorage.setItem(DRAFT_KEY(s.slug), JSON.stringify({ ...d, step }));
    } catch {}
    router.push(`/login?next=${encodeURIComponent(`/reports/${s.slug}`)}`);
  }

  async function pay() {
    if (!user) return goLogin();
    setPaying(true);
    try {
      let palmPhoto = d.palm.photo || undefined;
      if (isPalm && !palmPhoto) {
        const t = toast.loading("Uploading your palm photo…");
        try {
          const photo = await uploadPalmPhoto(d.palm.preview!);
          palmPhoto = photo;
          setD((x) => ({ ...x, palm: { ...x.palm, photo } }));
          toast.dismiss(t);
        } catch (e) {
          toast.error((e as Error).message, { id: t });
          setPaying(false);
          return;
        }
      }
      const r = await api<{ orderRef: string; checkout: Record<string, unknown> }>("/api/orders", { body: { service: s.slug, input: input(palmPhoto), language: d.lang, coupon: applied?.code || null } });
      try {
        sessionStorage.removeItem(DRAFT_KEY(s.slug));
      } catch {}
      await openCheckout(r.checkout, {
        onSuccess: async (resp) => {
          const t = toast.loading("Confirming your payment…");
          try {
            await api("/api/orders/verify", { body: { orderRef: r.orderRef, ...resp } });
            toast.success("Payment received — preparing your report", { id: t });
          } catch (e) {
            toast.message(errMsg(e), { id: t });
          }
          router.push(`/orders/${r.orderRef}`);
        },
        onFailed: (f) => toast.error(f.error?.description || "Payment failed. You can try again."),
        onDismiss: () => {
          setPaying(false);
          toast.message("Payment window closed. Your order is saved for a few minutes.", { action: { label: "View", onClick: () => router.push(`/orders/${r.orderRef}`) } });
        },
      });
    } catch (e) {
      toast.error(errMsg(e));
      setPaying(false);
    }
  }

  const total = s.price - (applied?.discountPaise || 0);

  return (
    <div className="lux-card scroll-mt-24 p-5 sm:p-7" id="order">
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === "details" ? (
          <motion.div key="details" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="mt-6 space-y-8">
            {isPalm ? (
              <PalmFields value={d.palm} onChange={(v) => setD({ ...d, palm: v })} errors={errs.palm} />
            ) : s.inputKind === "couple" ? (
              <>
                <BirthFields idPrefix="boy" title="Boy's details" accent="sky" lockGender value={d.boy} onChange={(v) => setD({ ...d, boy: v })} errors={errs.boy} />
                <div className="divider-orn text-xs">✦</div>
                <BirthFields idPrefix="girl" title="Girl's details" accent="rose" lockGender value={d.girl} onChange={(v) => setD({ ...d, girl: v })} errors={errs.girl} />
              </>
            ) : (
              <BirthFields idPrefix="person" title="Birth details" value={d.person} onChange={(v) => setD({ ...d, person: v })} errors={errs.person} />
            )}
            {s.inputKind === "single_year" && (
              <div>
                <span className="label">Report year</span>
                <Segmented value={String(d.year)} onChange={(v) => setD({ ...d, year: Number(v) })} options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) }))} />
              </div>
            )}
            {s.languages.length > 1 && (
              <div>
                <span className="label">Report language</span>
                <Segmented value={d.lang} onChange={(v) => setD({ ...d, lang: v })} options={s.languages.map((l) => ({ value: l, label: LANGUAGES[l]?.split(" (")[0] || l.toUpperCase() }))} />
              </div>
            )}
            <button type="button" onClick={next} className="btn-gold w-full text-base">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="review" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mt-6">
            <button type="button" onClick={() => setStep("details")} className="mb-4 inline-flex items-center gap-1 text-sm text-mist hover:text-gold">
              <ChevronLeft className="h-4 w-4" /> Edit details
            </button>
            <div className="space-y-3">
              {isPalm && d.palm.preview && (
                <div className="flex items-center gap-4 rounded-2xl border border-ink/[.08] bg-ink/[.03] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.palm.preview} alt="Your palm" className="h-24 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[.18em] text-mist">Palm reading for</div>
                    <div className="truncate font-display text-2xl text-ivory">{d.palm.name}</div>
                    <div className="text-sm text-mist">{d.palm.gender === "female" ? "Female" : "Male"} · Born {fmtDate(d.palm.date)}</div>
                  </div>
                </div>
              )}
              {parts.map((p) => {
                const v = validated[p];
                if (!v.ok) return null;
                return (
                  <div key={p} className="rounded-2xl border border-ink/[.08] bg-ink/[.03] p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-mist">
                      <span className={cn("h-1.5 w-1.5 rounded-full", p === "girl" ? "bg-rose" : p === "boy" ? "bg-sky" : "bg-gold")} />
                      {p === "boy" ? "Boy" : p === "girl" ? "Girl" : "Native"}
                    </div>
                    <div className="mt-1 font-display text-2xl text-ivory">{v.value.name}</div>
                    <div className="text-sm text-mist">{fmtBirth(v.value)}</div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-gold/20 px-3 py-1 text-gold-2">{LANGUAGES[d.lang] || d.lang}</span>
                {s.inputKind === "single_year" && <span className="rounded-full border border-gold/20 px-3 py-1 text-gold-2">Year {d.year}</span>}
                {s.pagesHint && <span className="rounded-full border border-gold/20 px-3 py-1 text-gold-2">{s.pagesHint}</span>}
              </div>
            </div>

            <div className="mt-6">
              <span className="label">Coupon code</span>
              {applied ? (
                <div className="flex items-center justify-between rounded-2xl border border-emerald/40 bg-emerald/10 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-emerald"><BadgePercent className="h-4 w-4" /> <b>{applied.code}</b> · −{inr(applied.discountPaise)}</span>
                  <button type="button" aria-label="Remove coupon" onClick={() => (setApplied(null), setCoupon(""))} className="text-emerald/80 hover:text-emerald"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                    <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. ASTRO10" className="field !pl-11 uppercase" maxLength={32} />
                  </div>
                  <button type="button" onClick={applyCoupon} disabled={checking || !coupon.trim()} className="btn-ghost !px-5">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</button>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2 rounded-2xl border border-gold/15 bg-gold/[.04] p-4 text-sm">
              <Row k={s.title} v={inr(s.price)} />
              {s.mrp && s.mrp > s.price && <Row k="You save vs. MRP" v={inr(s.mrp - s.price)} muted />}
              {applied && <Row k={`Coupon ${applied.code}`} v={`− ${inr(applied.discountPaise)}`} good />}
              <div className="hairline my-2" />
              <div className="flex items-baseline justify-between">
                <span className="text-ivory">Total</span>
                <span className="font-display text-3xl text-gold-2">{inr(total)}</span>
              </div>
              <p className="text-[11px] text-mist">{site.gst_note}</p>
            </div>

            <button type="button" onClick={pay} disabled={paying} className="btn-gold mt-6 w-full text-base">
              {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
              {user ? `Pay ${inr(total)} securely` : "Sign in to continue"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-mist">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Razorpay · UPI · Cards · Net-banking · Wallets
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ k, v, good, muted }: { k: string; v: string; good?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-ivory-2", muted && "text-mist")}>{k}</span>
      <span className={cn("text-ivory", good && "text-emerald", muted && "text-mist")}>{v}</span>
    </div>
  );
}

function Stepper({ step }: { step: "details" | "review" }) {
  const steps = ["Details", "Review & pay", "Report"];
  const at = step === "details" ? 0 : 1;
  return (
    <ol className="flex items-center gap-2">
      {steps.map((t, i) => (
        <li key={t} className="flex flex-1 items-center gap-2">
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", i < at ? "border-gold-bright bg-gold-bright text-ongold" : i === at ? "border-gold text-gold" : "border-ink/15 text-dim")}>
            {i < at ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={cn("hidden text-xs min-[400px]:block", i === at ? "text-ivory" : "text-dim")}>{t}</span>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-ink/10" />}
        </li>
      ))}
    </ol>
  );
}
