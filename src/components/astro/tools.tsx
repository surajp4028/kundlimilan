"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Download, Heart, Loader2, Orbit, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BirthFields, emptyBirth, validateBirth, type BirthDraft } from "./birth-form";
import { DateWheel, Segmented } from "./pickers";
import { api, ClientApiError, errMsg } from "@/lib/client/api";
import { useAuth, useSite } from "@/lib/client/providers";
import { fmtBirth, inr } from "@/lib/astro";
import { handOffToOrder } from "./order-flow";
import { cn } from "@/lib/utils";

function useLang() {
  const s = useSite();
  return useState<"en" | "hi">(s.default_language === "hi" ? "hi" : "en");
}

function LangToggle({ lang, setLang }: { lang: "en" | "hi"; setLang: (l: "en" | "hi") => void }) {
  return <Segmented className="w-44" value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }]} />;
}

function LimitNote({ error }: { error: unknown }) {
  const { user } = useAuth();
  if (!(error instanceof ClientApiError)) return null;
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm text-amber">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {error.info.message}
        {!user && (error.info.code === "DAILY_LIMIT" || error.info.code === "LOGIN_REQUIRED") && (
          <Link href="/login" className="ml-1 font-semibold underline underline-offset-2">Sign in</Link>
        )}
      </div>
    </div>
  );
}

type Offer = { slug: string; title: string; price: number; mrp: number | null; pagesHint: string | null; features: string[] };
let offersCache: Offer[] | null = null;
function useOffer(slug: string) {
  const [o, setO] = useState<Offer | null>(() => offersCache?.find((x) => x.slug === slug) || null);
  useEffect(() => {
    if (o) return;
    api<{ services: Offer[] }>("/api/services")
      .then((r) => {
        offersCache = r.services;
        setO(r.services.find((x) => x.slug === slug) || null);
      })
      .catch(() => {});
  }, [slug, o]);
  return o;
}

/** The money moment: a rich offer under every free result + a sticky buy bar on phones. Details carry over to checkout. */
function ReportOffer({ slug, parts, lang, headline }: { slug: string; parts: { boy?: BirthDraft; girl?: BirthDraft; person?: BirthDraft }; lang: string; headline: string }) {
  const offer = useOffer(slug);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [scrolledIn, setScrolledIn] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    const onScroll = () => {
      const res = el.parentElement?.getBoundingClientRect();
      setScrolledIn(!!res && res.top < window.innerHeight * 0.35);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => (io.disconnect(), window.removeEventListener("scroll", onScroll));
  }, [offer]);
  if (!offer) return null;
  const off = offer.mrp && offer.mrp > offer.price ? Math.round(((offer.mrp - offer.price) / offer.mrp) * 100) : 0;
  const go = () => {
    handOffToOrder(slug, { ...parts, lang });
    router.push(`/reports/${slug}#order`);
  };
  return (
    <>
      <motion.div ref={cardRef} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="band-maroon relative mt-8 overflow-hidden rounded-[2rem] border border-[#f7d27a]/30 p-6 shadow-deep sm:p-8">
        <div className="paisley-edge pointer-events-none absolute inset-x-0 top-0 h-5 opacity-70" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">Detailed PDF report</p>
            <h3 className="display mt-2 text-3xl text-ivory sm:text-4xl">{headline}</h3>
            <ul className="mt-4 grid gap-2 text-sm text-ivory-2 sm:grid-cols-2">
              {offer.features.slice(0, 6).map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f7d27a]" /> {f}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-4xl text-[#f7d27a]">{inr(offer.price)}</span>
              {off > 0 && <span className="text-mist line-through">{inr(offer.mrp!)}</span>}
              {off > 0 && <span className="rounded-full bg-[#f7d27a] px-2.5 py-0.5 text-xs font-bold text-maroon">{off}% OFF</span>}
              {offer.pagesHint && <span className="text-xs text-mist">· {offer.pagesHint} · English / हिन्दी</span>}
            </div>
            <button type="button" onClick={go} className="btn-gold mt-6 w-full text-base sm:w-auto">
              <Download className="h-5 w-5" /> Download full PDF report
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mist"><ShieldCheck className="h-3.5 w-3.5 text-[#f7d27a]" /> Your details are already filled in · secure Razorpay · instant delivery</p>
          </div>
          <div className="relative mx-auto hidden h-52 w-40 sm:block">
            {["/samples/match-p5.jpg", "/samples/match-p1.jpg"].map((src, i) => (
              <div key={src} className="absolute top-0 h-48 w-36 overflow-hidden rounded-lg border border-[#f7d27a]/40 shadow-deep" style={{ left: i * 14, transform: `rotate(${i ? 4 : -6}deg)` }}>
                <Image src={src} alt="" fill sizes="144px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      {/* sticky buy bar on phones — only while reading the results, never on top of the offer card */}
      <div className="h-24 lg:hidden" aria-hidden />
      <AnimatePresence>
      {scrolledIn && !cardVisible && (
      <motion.div key="sticky" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="fixed inset-x-3 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <button type="button" onClick={go} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#f7d27a]/40 bg-gradient-to-r from-maroon to-maroon-2 px-4 py-3 text-left shadow-deep">
          <span className="min-w-0">
            <span className="block truncate text-[11px] uppercase tracking-[.16em] text-[#f3c262]">Full PDF report</span>
            <span className="block font-display text-xl text-[#fff4e2]">{inr(offer.price)}{off > 0 && <span className="ml-2 text-sm text-[#e0bfa0] line-through">{inr(offer.mrp!)}</span>}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-light to-gold-bright px-4 py-2.5 text-sm font-semibold text-ongold"><Download className="h-4 w-4" /> Download</span>
        </button>
      </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}

const scrollTo = (el: HTMLElement | null) => setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);

/* =============================== FREE KUNDLI =============================== */

type Kundli = {
  input: { name: string; gender: string; date: string; time: string; place: string; tz: number };
  astro: Record<string, string | number>;
  birth: { sunrise: string | null; sunset: string | null; ayanamsha: number | null };
  planets: { name: string; sign: string; signLord: string; degree: number; retro: boolean; nakshatra: string; nakshatraLord: string; pada: number; house: number }[];
  charts: { d1: string | null; d9: string | null };
  dasha: { level: string; planet: string; start: string; end: string }[];
  manglik: { present: boolean; status: string | null; percent: number | null; report: string | null };
};

export function KundliTool() {
  const [b, setB] = useState<BirthDraft>(emptyBirth());
  const [lang, setLang] = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [res, setRes] = useState<Kundli | null>(null);
  const [fieldErr, setFieldErr] = useState<Partial<Record<keyof BirthDraft, string>>>({});
  const out = useRef<HTMLDivElement>(null);

  async function run() {
    const v = validateBirth(b);
    if (!v.ok) {
      setFieldErr({ [v.field]: v.message });
      return toast.error(v.message);
    }
    setFieldErr({});
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ kundli: Kundli }>("/api/tools/kundli", { body: { person: v.value, lang } });
      setRes(r.kundli);
      scrollTo(out.current);
    } catch (e) {
      setErr(e);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="lux-card p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ivory">Birth details</h2>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <BirthFields idPrefix="k" value={b} onChange={setB} errors={fieldErr} />
          <button type="button" onClick={run} disabled={busy} className="btn-gold mt-6 w-full text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Calculating your chart…" : "Generate free Kundli"}
          </button>
          <LimitNote error={err} />
        </div>
      </div>
      <div ref={out} className="scroll-mt-24">
        {res && <KundliResult k={res} input={b} lang={lang} />}
      </div>
    </div>
  );
}

const ASTRO_LABELS: [string, string][] = [
  ["ascendant", "Lagna (Ascendant)"], ["sign", "Rashi (Moon sign)"], ["Naksahtra", "Nakshatra"], ["Charan", "Charan"], ["NaksahtraLord", "Nakshatra lord"], ["SignLord", "Rashi lord"],
  ["Varna", "Varna"], ["Vashya", "Vashya"], ["Yoni", "Yoni"], ["Gan", "Gana"], ["Nadi", "Nadi"], ["Tithi", "Tithi"], ["Yog", "Yoga"], ["Karan", "Karan"], ["tatva", "Tatva"], ["paya", "Paya"], ["name_alphabet", "Name letter"],
];

function KundliResult({ k, input, lang }: { k: Kundli; input: BirthDraft; lang: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
      <div className="text-center">
        <p className="eyebrow">Janam Kundli</p>
        <h2 className="display mt-2 text-4xl text-ivory sm:text-5xl">{k.input.name}</h2>
        <p className="mt-2 text-sm text-mist">{fmtBirth({ date: k.input.date, time: k.input.time, place: { name: k.input.place, lat: 0, lon: 0 } })} · GMT{k.input.tz >= 0 ? "+" : ""}{k.input.tz}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[["Lagna chart · D1", k.charts.d1], ["Navamsa chart · D9", k.charts.d9]].map(([t, src]) =>
          src ? (
            <div key={t} className="lux-card p-4">
              <p className="mb-3 text-center text-xs uppercase tracking-[.2em] text-gold">{t}</p>
              <div className="chart-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={t!} className="mx-auto aspect-square w-full max-w-[360px]" />
              </div>
            </div>
          ) : null,
        )}
      </div>
      <div className="lux-card p-5 sm:p-7">
        <h3 className="font-display text-2xl text-ivory">Astro details</h3>
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
          {ASTRO_LABELS.filter(([key]) => k.astro[key] !== undefined && k.astro[key] !== "").map(([key, label]) => (
            <div key={key} className="rounded-xl border border-ink/[.07] bg-ink/[.025] p-2 sm:rounded-2xl sm:p-3">
              <div className="text-[9px] uppercase leading-tight tracking-[.1em] text-mist sm:text-[10px] sm:tracking-[.16em]">{label}</div>
              <div className="mt-0.5 font-display text-[15px] leading-tight text-ivory sm:mt-1 sm:text-lg">{String(k.astro[key]).trim()}</div>
            </div>
          ))}
          {k.birth.sunrise && (
            <div className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-3">
              <div className="text-[10px] uppercase tracking-[.16em] text-mist">Sunrise · Sunset</div>
              <div className="mt-1 font-display text-lg text-ivory">{k.birth.sunrise} · {k.birth.sunset}</div>
            </div>
          )}
        </div>
      </div>
      <div className="lux-card p-5 sm:p-7">
        <h3 className="font-display text-2xl text-ivory">Planetary positions</h3>
        <div className="mt-4 hidden overflow-x-auto overflow-y-hidden overscroll-x-contain sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[.14em] text-mist">
                {["Planet", "Sign", "Degree", "House", "Nakshatra", "Pada", "Lord"].map((h) => <th key={h} className="pb-3 pr-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {k.planets.map((p) => (
                <tr key={p.name} className="border-t border-ink/[.06]">
                  <td className="py-2.5 pr-3 font-display text-lg text-gold-2">{p.name}{p.retro && <span className="ml-1 text-xs text-rose">(R)</span>}</td>
                  <td className="pr-3 text-ivory">{p.sign}</td>
                  <td className="pr-3 text-ivory-2">{deg(p.degree)}</td>
                  <td className="pr-3 text-ivory-2">{p.house}</td>
                  <td className="pr-3 text-ivory-2">{p.nakshatra}</td>
                  <td className="pr-3 text-ivory-2">{p.pada}</td>
                  <td className="text-ivory-2">{p.nakshatraLord}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-2 sm:hidden">
          {k.planets.map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-2xl border border-ink/[.07] bg-ink/[.025] px-4 py-3">
              <div>
                <div className="font-display text-xl text-gold-2">{p.name}{p.retro && <span className="ml-1 text-xs text-rose">(R)</span>}</div>
                <div className="text-xs text-mist">{p.nakshatra} · pada {p.pada}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-ivory">{p.sign}</div>
                <div className="text-xs text-mist">{deg(p.degree)} · H{p.house}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="lux-card p-5 sm:p-7">
          <h3 className="font-display text-2xl text-ivory">Current dasha</h3>
          <ol className="mt-5 space-y-4 border-l border-gold/30 pl-5">
            {k.dasha.map((d) => (
              <li key={d.level} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold-bright shadow-gold" />
                <div className="text-[10px] uppercase tracking-[.16em] text-mist">{d.level === "major" ? "Mahadasha" : d.level === "minor" ? "Antardasha" : "Pratyantar"}</div>
                <div className="font-display text-xl text-ivory">{d.planet}</div>
                <div className="text-xs text-mist">{d.start.replace(/\s+/g, " ")} → {d.end.replace(/\s+/g, " ")}</div>
              </li>
            ))}
          </ol>
        </div>
        <div className={cn("lux-card p-5 sm:p-7", k.manglik.present && "!border-rose/30")}>
          <h3 className="font-display text-2xl text-ivory">Manglik dosha</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className={cn("grid h-20 w-20 place-items-center rounded-full border-2 font-display text-2xl", k.manglik.present ? "border-rose text-rose" : "border-emerald text-emerald")}>
              {k.manglik.percent != null ? `${k.manglik.percent}%` : k.manglik.present ? "Yes" : "No"}
            </div>
            <div>
              <div className={cn("font-semibold", k.manglik.present ? "text-rose" : "text-emerald")}>{k.manglik.present ? "Manglik" : "Not Manglik"}</div>
              {k.manglik.status && <div className="text-xs text-mist">Status: {k.manglik.status.toLowerCase()}</div>}
            </div>
          </div>
          {k.manglik.report && <p className="mt-4 text-sm leading-relaxed text-ivory-2">{k.manglik.report}</p>}
        </div>
      </div>
      <ReportOffer slug="pro-kundli" parts={{ person: input }} lang={lang} headline="Get your complete Kundli as a PDF" />
    </motion.div>
  );
}

const deg = (d: number) => {
  const D = Math.floor(d);
  const M = Math.floor((d - D) * 60);
  return `${D}°${String(M).padStart(2, "0")}′`;
};

/* =============================== MATCHING =============================== */

type Match = {
  boy: { name: string }; girl: { name: string };
  koots: { key: string; description: string; boy: string; girl: string; max: number; got: number }[];
  total: number; outOf: number; minimum: number; conclusion: string | null; favourable: boolean;
  manglik: { boy: { present: boolean; percent: number | null }; girl: { present: boolean; percent: number | null }; match: boolean | null; report: string | null } | null;
};
const KOOT: Record<string, string> = { varna: "Varna", vashya: "Vashya", tara: "Tara", yoni: "Yoni", maitri: "Graha Maitri", gan: "Gana", bhakut: "Bhakoot", nadi: "Nadi" };

export function MatchingTool() {
  const [boy, setBoy] = useState<BirthDraft>(emptyBirth("male"));
  const [girl, setGirl] = useState<BirthDraft>(emptyBirth("female"));
  const [lang, setLang] = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [res, setRes] = useState<Match | null>(null);
  const [errs, setErrs] = useState<{ boy?: Partial<Record<keyof BirthDraft, string>>; girl?: Partial<Record<keyof BirthDraft, string>> }>({});
  const [side, setSide] = useState<"boy" | "girl">("boy");
  const out = useRef<HTMLDivElement>(null);

  async function run() {
    const vb = validateBirth(boy), vg = validateBirth(girl);
    const e: typeof errs = {};
    if (!vb.ok) e.boy = { [vb.field]: vb.message };
    if (!vg.ok) e.girl = { [vg.field]: vg.message };
    setErrs(e);
    if (!vb.ok) setSide("boy");
    else if (!vg.ok) setSide("girl");
    if (!vb.ok || !vg.ok) return toast.error(!vb.ok ? `Boy: ${vb.message}` : `Girl: ${(vg as { message: string }).message}`);
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ match: Match }>("/api/tools/matching", { body: { boy: vb.value, girl: vg.value, lang } });
      setRes(r.match);
      scrollTo(out.current);
    } catch (e) {
      setErr(e);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <div className="lux-card p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ivory">Boy & girl details</h2>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-ink/10 bg-ink/[.04] p-1 md:hidden" role="tablist">
          {(["boy", "girl"] as const).map((t) => {
            const done = validateBirth(t === "boy" ? boy : girl).ok;
            return (
              <button key={t} type="button" role="tab" aria-selected={side === t} onClick={() => setSide(t)} className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm transition", side === t ? "bg-white font-semibold text-ivory shadow-sm" : "text-mist")}>
                <span className={cn("h-2 w-2 rounded-full", t === "boy" ? "bg-sky" : "bg-rose")} />
                {t === "boy" ? "Boy" : "Girl"}
                {done && <Check className="h-4 w-4 text-emerald" />}
              </button>
            );
          })}
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          <div className={cn(side !== "boy" && "hidden md:block")}>
            <BirthFields idPrefix="mb" title="Boy" accent="sky" lockGender value={boy} onChange={setBoy} errors={errs.boy} />
            <button type="button" onClick={() => setSide("girl")} className="btn-ghost mt-5 w-full md:hidden">Next · Girl's details</button>
          </div>
          <div className={cn(side !== "girl" && "hidden md:block")}>
            <BirthFields idPrefix="mg" title="Girl" accent="rose" lockGender value={girl} onChange={setGirl} errors={errs.girl} />
          </div>
        </div>
        <button type="button" onClick={run} disabled={busy} className="btn-gold mt-8 w-full text-base">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-4 w-4" fill="currentColor" />} {busy ? "Matching kundlis…" : "Match kundli"}
        </button>
        <LimitNote error={err} />
      </div>
      <div ref={out} className="scroll-mt-24">{res && <MatchResult m={res} boy={boy} girl={girl} lang={lang} />}</div>
    </div>
  );
}

export function ScoreRing({ value, max, size = 200 }: { value: number; max: number; size?: number }) {
  const r = 80, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7c948" /><stop offset=".55" stopColor="#ef8a1f" /><stop offset="1" stopColor="#c8341f" /></linearGradient>
        </defs>
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgb(255 255 255 / .08)" strokeWidth="12" />
        <motion.circle cx="100" cy="100" r={r} fill="none" stroke="url(#ring)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-6xl leading-none text-maroon">{value}</div>
          <div className="mt-1 text-xs uppercase tracking-[.2em] text-mist">of {max} gunas</div>
        </div>
      </div>
    </div>
  );
}

function MatchResult({ m, boy, girl, lang }: { m: Match; boy: BirthDraft; girl: BirthDraft; lang: string }) {
  const verdict = m.total >= 32 ? "Excellent match" : m.total >= 25 ? "Very good match" : m.total >= m.minimum ? "Good match" : "Below the traditional minimum";
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
      <div className="lux-card overflow-hidden p-6 text-center sm:p-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-sky/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-rose/10 blur-3xl" />
        <div className="relative flex items-center justify-center gap-3 font-display text-2xl text-ivory sm:text-3xl">
          <span className="text-sky">{m.boy.name}</span>
          <Heart className="h-6 w-6 text-rose" fill="currentColor" />
          <span className="text-rose">{m.girl.name}</span>
        </div>
        <div className="relative mt-6 flex justify-center"><ScoreRing value={m.total} max={m.outOf} /></div>
        <div className={cn("relative mt-5 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold", m.total >= m.minimum ? "bg-emerald/15 text-emerald" : "bg-amber/15 text-amber")}>{verdict}</div>
        {m.conclusion && <p className="relative mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-ivory-2">{m.conclusion}</p>}
      </div>
      <div className="lux-card p-5 sm:p-7">
        <h3 className="font-display text-2xl text-ivory">Ashtakoot · 8 kootas</h3>
        <div className="mt-5 space-y-4">
          {m.koots.map((k, i) => (
            <div key={k.key}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="font-display text-lg text-ivory">{KOOT[k.key] || k.key}</span>
                  <span className="ml-2 text-xs text-mist">{k.description}</span>
                </div>
                <span className="shrink-0 font-display text-lg text-gold-2">{k.got}<span className="text-sm text-mist">/{k.max}</span></span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[.07]">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${(k.got / k.max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.8 }} className={cn("h-full rounded-full", k.got === 0 ? "bg-rose" : k.got / k.max >= 0.75 ? "bg-gradient-to-r from-emerald to-emerald/60" : "bg-gradient-to-r from-gold-light to-gold-bright")} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-mist"><span>Boy: {k.boy}</span><span>Girl: {k.girl}</span></div>
            </div>
          ))}
        </div>
      </div>
      {m.manglik && (
        <div className="lux-card p-5 sm:p-7">
          <h3 className="font-display text-2xl text-ivory">Manglik compatibility</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["boy", "girl"] as const).map((x) => (
              <div key={x} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-4 text-center">
                <div className="text-xs uppercase tracking-[.16em] text-mist">{x === "boy" ? m.boy.name : m.girl.name}</div>
                <div className={cn("mt-2 font-display text-2xl", m.manglik![x].present ? "text-rose" : "text-emerald")}>{m.manglik![x].present ? "Manglik" : "Not Manglik"}</div>
                {m.manglik![x].percent != null && <div className="text-xs text-mist">{m.manglik![x].percent}%</div>}
              </div>
            ))}
          </div>
          {m.manglik.report && <p className="mt-4 text-sm leading-relaxed text-ivory-2">{m.manglik.report}</p>}
        </div>
      )}
      <ReportOffer slug="kundli-milan-report" parts={{ boy, girl }} lang={lang} headline="Download the complete Kundli Milan report" />
    </motion.div>
  );
}

/* =============================== NUMEROLOGY =============================== */

export function NumerologyTool() {
  const [name, setName] = useState("");
  const [b, setB] = useState<BirthDraft>(emptyBirth());
  const [lang, setLang] = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [res, setRes] = useState<{ table: Record<string, string | number>; report: { title?: string; description?: string } | null } | null>(null);
  const out = useRef<HTMLDivElement>(null);

  async function run() {
    if (name.trim().length < 2) return toast.error("Enter your full name");
    if (!b.date) return toast.error("Select your date of birth");
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ numerology: NonNullable<typeof res> }>("/api/tools/numerology", { body: { name: name.trim(), date: b.date, lang } });
      setRes(r.numerology);
      scrollTo(out.current);
    } catch (e) {
      setErr(e);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const t = res?.table;
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-8">
      <div className="mx-auto max-w-xl lux-card p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ivory">Your details</h2>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <label className="label" htmlFor="nm-name">Full name</label>
        <input id="nm-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name as you use it" maxLength={60} />
        <label className="label mt-4" htmlFor="nm-date">Date of birth</label>
        <DateWheel id="nm-date" value={b.date} onChange={(v) => setB({ ...b, date: v })} />
        <button type="button" onClick={run} disabled={busy} className="btn-gold mt-6 w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Orbit className="h-4 w-4" />} {busy ? "Reading your numbers…" : "Reveal my numbers"}
        </button>
        <LimitNote error={err} />
      </div>
      <div ref={out} className="scroll-mt-24">
        {t && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[["radical_number", "Radical"], ["destiny_number", "Destiny"], ["name_number", "Name"]].map(([k, l], i) => (
                <motion.div key={k} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="lux-card p-4 text-center sm:p-6">
                  <div className="font-display text-5xl text-gold-2 sm:text-7xl">{String(t[k] ?? "–")}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[.18em] text-mist">{l} number</div>
                </motion.div>
              ))}
            </div>
            <div className="lux-card grid gap-2 p-5 sm:grid-cols-2 sm:p-7">
              {[["fav_day", "Lucky days"], ["fav_color", "Lucky colour"], ["fav_stone", "Lucky stone"], ["fav_metal", "Metal"], ["fav_god", "Deity"], ["fav_mantra", "Mantra"], ["friendly_num", "Friendly numbers"], ["evil_num", "Numbers to avoid"]]
                .filter(([k]) => t[k])
                .map(([k, l]) => (
                  <div key={k} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-3">
                    <div className="text-[10px] uppercase tracking-[.16em] text-mist">{l}</div>
                    <div className="mt-1 text-ivory">{String(t[k])}</div>
                  </div>
                ))}
            </div>
            {res?.report?.description && (
              <div className="lux-card p-5 sm:p-7">
                <h3 className="font-display text-2xl text-ivory">{res.report.title || "What your number says"}</h3>
                <p className="mt-3 text-sm leading-[1.85] text-ivory-2">{res.report.description}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs text-mist hover:text-gold">
      <RotateCcw className="h-3.5 w-3.5" /> Start over
    </button>
  );
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
