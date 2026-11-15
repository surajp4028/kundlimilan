"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, CheckCircle2, ChevronLeft, ChevronRight, Clock, Compass, HeartPulse, Info, Loader2, MapPin, Moon, Plane, Smile, Sparkles, Sun, Sunrise, Sunset, Clover, Heart, AlertTriangle, XCircle } from "lucide-react";
import { api, errMsg } from "@/lib/client/api";
import { useSite } from "@/lib/client/providers";
import { SIGNS, isSign, type SignKey } from "@/lib/astro";
import { DateWheel, PlaceSearch, Segmented, type PlaceValue } from "./pickers";
import { cn } from "@/lib/utils";
import { ZodiacMedallion } from "./zodiac-art";

/* =============================== HOROSCOPE =============================== */

const PARTS: Record<string, { label: string; icon: typeof Sun }> = {
  personal_life: { label: "Personal life", icon: Smile },
  profession: { label: "Career & money", icon: Briefcase },
  health: { label: "Health", icon: HeartPulse },
  emotions: { label: "Emotions", icon: Heart },
  travel: { label: "Travel", icon: Plane },
  luck: { label: "Luck", icon: Clover },
  overview: { label: "Overview", icon: Sparkles },
  work: { label: "Work", icon: Briefcase },
  love: { label: "Love", icon: Heart },
  advice: { label: "Advice", icon: Compass },
};

type Horo = { sign: string; period: string; date: string; prediction: Record<string, string> };

export function HoroscopeTool() {
  const sp = useSearchParams();
  const router = useRouter();
  const site = useSite();
  const initial = sp.get("sign") || "";
  const [sign, setSign] = useState<SignKey>(isSign(initial) ? initial : "aries");
  const [period, setPeriod] = useState<"yesterday" | "today" | "tomorrow" | "weekly">("today");
  const [lang, setLang] = useState<"en" | "hi">(site.default_language === "hi" ? "hi" : "en");
  const [data, setData] = useState<Horo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setErr("");
    api<{ horoscope: Horo }>(`/api/tools/horoscope?sign=${sign}&period=${period}&lang=${lang}`)
      .then((r) => alive && setData(r.horoscope))
      .catch((e) => alive && setErr(errMsg(e)))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [sign, period, lang]);

  const z = SIGNS.find((x) => x.key === sign)!;
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <div className="sticky top-[4.25rem] z-20 -mx-4 bg-[#fdf8f0]/92 px-4 pb-3 pt-2 backdrop-blur-xl sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
          {SIGNS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => {
                setSign(x.key);
                router.replace(`/horoscope?sign=${x.key}`, { scroll: false });
              }}
              className={cn("flex shrink-0 flex-col items-center rounded-2xl border px-2.5 py-2 transition", sign === x.key ? "border-gold-bright bg-gold-bright/15 shadow-gold" : "border-ink/[.08] bg-white")}
            >
              <ZodiacMedallion sign={x.key} className="h-11 w-11 border-2" />
              <span className={cn("mt-1 text-[11px]", sign === x.key ? "font-semibold text-ivory" : "text-mist")}>{x.en}</span>
            </button>
          ))}
        </div>
        <Segmented className="mx-auto w-full max-w-md" value={period} onChange={setPeriod} options={[{ value: "yesterday", label: "Yesterday" }, { value: "today", label: "Today" }, { value: "tomorrow", label: "Tomorrow" }, { value: "weekly", label: "Week" }]} />
      </div>

      <div className="band-maroon relative mt-4 overflow-hidden rounded-[2rem] border border-[#f7d27a]/30 p-5 shadow-deep sm:p-8">
        <div className="paisley-edge pointer-events-none absolute inset-x-0 top-0 h-4 opacity-70" />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <ZodiacMedallion sign={z.key} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <h2 className="display text-3xl text-ivory sm:text-5xl">{z.en} <span className="font-deva text-xl text-[#f3c262] sm:text-2xl">{z.hi}</span></h2>
            <p className="mt-1 text-xs text-mist sm:text-sm">{z.dates} · {z.element} · {z.lord}</p>
            {data && <p className="mt-1 text-xs text-[#f3c262]">{data.date}</p>}
          </div>
        </div>
        <div className="relative mt-4 flex justify-end">
          <div className="inline-flex rounded-full border border-[#f7d27a]/40 bg-white/10 p-0.5 text-xs">
            {(["en", "hi"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={cn("rounded-full px-3 py-1 transition", lang === l ? "bg-[#f7d27a] font-semibold text-maroon" : "text-ivory-2")}>{l === "en" ? "English" : "हिन्दी"}</button>
            ))}
          </div>
        </div>
      </div>

      {err && <p className="mt-6 text-center text-sm text-amber">{err}</p>}
      <AnimatePresence mode="wait">
        {busy ? (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-ink/[.04]" />)}
          </motion.div>
        ) : data ? (
          <motion.div key={`${sign}${period}${lang}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(data.prediction)
              .filter(([, v]) => v && String(v).trim())
              .map(([k, v], i) => {
                const p = PARTS[k] || { label: k.replace(/_/g, " "), icon: Sparkles };
                return (
                  <motion.div key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="lux-card p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/25 bg-gold/5"><p.icon className="h-5 w-5 text-gold" /></span>
                      <h3 className="font-display text-xl capitalize text-ivory">{p.label}</h3>
                    </div>
                    <p className="mt-3 text-[14px] leading-[1.8] text-ivory-2">{String(v)}</p>
                  </motion.div>
                );
              })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* =============================== PANCHANG =============================== */

type T = { hour: number; minute: number; second?: number };
type Detail = { details?: Record<string, string | number | boolean>; end_time?: T };
type Panch = { date: string; today?: string; place: string; data: Record<string, unknown> };

const hm = (t?: T) => (t ? `${((t.hour % 24) + 11) % 12 + 1}:${String(t.minute).padStart(2, "0")} ${t.hour % 24 < 12 ? "AM" : "PM"}${t.hour >= 24 ? " (+1)" : ""}` : "");
const clock = (s?: unknown) => {
  if (typeof s !== "string" || !/^\d{1,2}:\d{1,2}/.test(s)) return typeof s === "string" ? s : "";
  const [h, m] = s.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/* Plain-language meaning of every Panchang term (shown under each item). */
const EXPLAIN: Record<string, { hi: string; en: string }> = {
  tithi: { hi: "चंद्रमा के हिसाब से इस दिन की तारीख़। व्रत, त्योहार और शुभ काम इसी से तय होते हैं।", en: "The lunar date. Fasts, festivals and good-work days are set by it." },
  nakshatra: { hi: "इस दिन चंद्रमा किस तारा-समूह में है। किसी काम की शुरुआत के लिए दिन अच्छा है या नहीं, यह इससे देखा जाता है।", en: "The star group the Moon is in on this day — used to judge if the day suits a new start." },
  yog: { hi: "सूर्य और चंद्रमा की स्थिति से बना दिन का स्वभाव — शुभ या अशुभ।", en: "The day's overall nature from the Sun–Moon positions — good or not so good." },
  karan: { hi: "आधी तिथि। काम शुरू करने का ठीक समय चुनने में काम आता है।", en: "Half of a tithi — used to fine-tune when to begin something." },
  abhijit_muhurta: { hi: "दिन का सबसे शुभ समय (दोपहर के आसपास)। नया काम, यात्रा या ख़रीदारी शुरू करने के लिए सबसे अच्छा।", en: "The most auspicious window of the day (around noon). Best for starting new work, a journey or a purchase." },
  rahukaal: { hi: "रोज़ लगभग डेढ़ घंटे का अशुभ समय। इसमें नया काम, यात्रा या ख़रीदारी शुरू न करें — पहले से चल रहा काम कर सकते हैं।", en: "About 1½ hours of inauspicious time every day. Don't start new work, a journey or a purchase — ongoing work is fine." },
  guliKaal: { hi: "गुलिक काल — इसमें शुरू किया काम दोहराया जाता है। इसलिए उधार देना या ऐसा कोई काम जो दोबारा न हो, तो इसमें न करें।", en: "Gulika — whatever starts now tends to repeat. Avoid lending money or anything you wouldn't want repeated." },
  yamghant_kaal: { hi: "यमगण्ड — अशुभ समय। इसमें यात्रा पर निकलना और नया काम शुरू करना टालें।", en: "Yamaganda — inauspicious. Avoid setting out on a journey or starting new work." },
  disha_shool: { hi: "इस दिन इस दिशा में यात्रा शुरू करना अशुभ माना जाता है।", en: "Starting a journey in this direction is considered unlucky on this day." },
  moon_nivas: { hi: "इस दिन चंद्रमा इस दिशा में है। यात्रा में चंद्रमा सामने या दाईं ओर हो तो शुभ माना जाता है।", en: "The Moon is in this direction on this day. Travelling with the Moon in front or on your right is considered lucky." },
};
/** "HH:MM[:SS]" → minutes after midnight */
const mins = (s?: string) => {
  const m = /^(\d{1,2}):(\d{1,2})/.exec(s || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
/** Parts of the good window [a,b] that don't touch any bad window; keeps pieces of 10+ minutes. */
function cleanWindows(good: { start?: string; end?: string } | undefined, bad: { start?: string; end?: string }[]) {
  let parts: [number, number][] = [[mins(good?.start), mins(good?.end)]];
  if (!parts.every(([a, b]) => b > a)) return [];
  for (const w of bad) {
    const [x, y] = [mins(w.start), mins(w.end)];
    if (!(y > x)) continue;
    parts = parts.flatMap(([a, b]) => (y <= a || x >= b ? [[a, b]] : ([[a, Math.min(b, x)], [Math.max(a, y), b]] as [number, number][]).filter(([p, q]) => q - p > 0)));
  }
  return parts.filter(([a, b]) => b - a >= 10).map(([a, b]) => ({ start: hhmm(a), end: hhmm(b) }));
}
const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const shiftDay = (iso: string, n: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export function PanchangTool() {
  const site = useSite();
  const [place, setPlace] = useState<PlaceValue | null>({ name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, tzId: "Asia/Kolkata" });
  const [lang, setLang] = useState<"en" | "hi">(site.default_language === "hi" ? "hi" : "en");
  const [date, setDate] = useState(istToday);
  const [p, setP] = useState<Panch | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const hi = lang === "hi";
  const ex = (k: string) => (EXPLAIN[k] ? EXPLAIN[k][lang] : "");
  const today = istToday();
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setBusy(true);
    setErr("");
    api<{ panchang: Panch }>("/api/tools/panchang", { body: { place, lang, date } })
      .then((r) => alive && setP(r.panchang))
      .catch((e) => alive && setErr(errMsg(e)))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [place, lang, date]);

  const d = (p?.data || {}) as Record<string, unknown>;
  const pick = (k: string) => d[k] as Detail | undefined;
  const five = [
    { k: "tithi", label: hi ? "तिथि" : "Tithi", name: (x: Detail) => x.details?.tithi_name, more: (x: Detail) => x.details?.special || x.details?.summary },
    { k: "nakshatra", label: hi ? "नक्षत्र" : "Nakshatra", name: (x: Detail) => x.details?.nak_name, more: (x: Detail) => `${hi ? "स्वामी" : "Ruler"} ${x.details?.ruler ?? ""} · ${hi ? "देवता" : "Deity"} ${x.details?.deity ?? ""}` },
    { k: "yog", label: hi ? "योग" : "Yoga", name: (x: Detail) => x.details?.yog_name, more: (x: Detail) => x.details?.special || x.details?.meaning },
    { k: "karan", label: hi ? "करण" : "Karana", name: (x: Detail) => x.details?.karan_name, more: (x: Detail) => x.details?.special },
  ];
  const timed = (k: string) => d[k] as { start?: string; end?: string } | undefined;
  const maah = d.hindu_maah as Record<string, string | boolean> | undefined;
  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const shool = txt(d.disha_shool);
  const remedy = txt(d.disha_shool_remedies);
  const nivas = txt(d.moon_nivas);
  const abhijit = timed("abhijit_muhurta");
  const avoid = (["rahukaal", "yamghant_kaal", "guliKaal"] as const).map((k) => ({ k, t: timed(k) })).filter((x) => x.t?.start);
  const KAAL_LABEL: Record<string, string> = hi
    ? { abhijit_muhurta: "अभिजीत मुहूर्त", rahukaal: "राहु काल", guliKaal: "गुलिक काल", yamghant_kaal: "यमगण्ड" }
    : { abhijit_muhurta: "Abhijit muhurat", rahukaal: "Rahu kaal", guliKaal: "Gulika kaal", yamghant_kaal: "Yamaganda" };
  const isToday = date === today;
  const bestToLeave = cleanWindows(abhijit, avoid.map((x) => x.t!));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
        <div className="flex-1"><PlaceSearch value={place} onChange={(v) => v && setPlace(v)} placeholder="Choose your city" /></div>
        <Segmented className="w-full sm:w-44" value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }]} />
      </div>

      {/* date bar */}
      <div className="mx-auto mt-3 flex max-w-xl items-center gap-2">
        <button type="button" aria-label={hi ? "पिछला दिन" : "Previous day"} onClick={() => setDate((v) => shiftDay(v, -1))} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-white/80 text-gold transition hover:border-gold/60">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <DateWheel value={date} onChange={setDate} label={hi ? "पंचांग की तारीख़ चुनें" : "Choose a date"} minYear={thisYear - 1} maxYear={thisYear + 1} />
        </div>
        <button type="button" aria-label={hi ? "अगला दिन" : "Next day"} onClick={() => setDate((v) => shiftDay(v, 1))} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-white/80 text-gold transition hover:border-gold/60">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-2 text-xs">
        {[
          { l: hi ? "आज" : "Today", v: today },
          { l: hi ? "कल" : "Tomorrow", v: shiftDay(today, 1) },
          { l: hi ? "परसों" : "Day after", v: shiftDay(today, 2) },
        ].map((c) => (
          <button key={c.v} type="button" onClick={() => setDate(c.v)} className={cn("rounded-full border px-3 py-1 font-semibold transition", date === c.v ? "border-[#c58b1d] bg-gradient-to-b from-gold-light to-gold-bright text-ongold" : "border-gold/25 bg-white/70 text-ivory-2 hover:border-gold/60")}>
            {c.l}
          </button>
        ))}
      </div>

      {err && <p className="mt-6 text-center text-sm text-amber"><AlertTriangle className="mr-1 inline h-4 w-4" />{err}</p>}
      {busy && !p && <div className="mt-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}
      {p && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-8 space-y-4 transition", busy && "opacity-50")}>
          <div className="lux-card overflow-hidden p-6 text-center sm:p-8">
            <p className="eyebrow">{String(d.day || "")}{isToday ? (hi ? " · आज" : " · Today") : ""}</p>
            <h2 className="display mt-2 text-4xl text-ivory sm:text-5xl">{new Date(p.date + "T00:00:00").toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" })}</h2>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-mist"><MapPin className="h-4 w-4 text-gold" /> {p.place}</p>
            {maah && <p className="mt-3 text-sm text-gold-2">{String(maah.purnimanta || "")} {hi ? "मास" : "maas"}{d.paksha ? ` · ${String(d.paksha)}` : ""}{d.ritu ? ` · ${String(d.ritu)} ${hi ? "ऋतु" : "ritu"}` : ""}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { i: Sunrise, l: hi ? "सूर्योदय" : "Sunrise", v: clock(d.sunrise) },
                { i: Sunset, l: hi ? "सूर्यास्त" : "Sunset", v: clock(d.sunset) },
                { i: Moon, l: hi ? "चंद्रोदय" : "Moonrise", v: clock(d.moonrise) },
                { i: Moon, l: hi ? "चंद्रास्त" : "Moonset", v: clock(d.moonset) },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-3">
                  <x.i className="mx-auto h-5 w-5 text-gold" />
                  <div className="mt-1 text-[10px] uppercase tracking-[.16em] text-mist">{x.l}</div>
                  <div className="font-display text-lg text-ivory">{x.v || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* travel */}
          {(shool || nivas || abhijit?.start) && (
            <div className="lux-card overflow-hidden p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-gold" />
                <h3 className="font-display text-2xl text-ivory">{hi ? "यात्रा विचार" : "Travel guide"}</h3>
              </div>
              <p className="mt-1 text-sm text-mist">{hi ? "इस दिन कहीं जाना हो तो — किस दिशा में, कब निकलें" : "Going somewhere on this day? Which direction, and when to leave"}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {shool && (
                  <div className="rounded-2xl border border-rose/25 bg-rose/[.05] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose"><XCircle className="h-4 w-4" /> {hi ? "इस दिशा में न जाएँ" : "Avoid this direction"} · {hi ? "दिशा शूल" : "Disha shool"}</div>
                    <div className="mt-1 flex items-center gap-2 font-display text-3xl text-ivory"><Compass className="h-6 w-6 text-rose" /> {shool}</div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ivory-2">{ex("disha_shool")}</p>
                    {remedy && remedy !== "-" && <p className="mt-2 text-[13px] text-ivory"><b>{hi ? "उपाय:" : "Remedy:"}</b> {remedy}</p>}
                  </div>
                )}
                {nivas && (
                  <div className="rounded-2xl border border-emerald/25 bg-emerald/[.05] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald"><CheckCircle2 className="h-4 w-4" /> {hi ? "चंद्रमा की दिशा" : "Moon's direction"} · {hi ? "चंद्र निवास" : "Chandra nivas"}</div>
                    <div className="mt-1 flex items-center gap-2 font-display text-3xl text-ivory"><Moon className="h-6 w-6 text-emerald" /> {nivas}</div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ivory-2">{ex("moon_nivas")}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {bestToLeave.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-emerald/30 bg-emerald/[.06] p-3">
                    <span className="text-sm font-semibold text-emerald">✓ {hi ? "निकलने का सबसे अच्छा समय" : "Best time to set out"}</span>
                    <span className="text-sm text-ivory">{bestToLeave.map((w) => `${clock(w.start)} – ${clock(w.end)}`).join(" , ")}</span>
                  </div>
                )}
                {avoid.length > 0 && (
                  <div className="rounded-2xl border border-rose/20 bg-rose/[.05] p-3">
                    <span className="text-sm font-semibold text-rose">✕ {hi ? "इन समयों में यात्रा शुरू न करें" : "Don't set out at these times"}</span>
                    <div className="mt-1.5 grid gap-1 text-sm text-ivory sm:grid-cols-3">
                      {avoid.map(({ k, t }) => (
                        <span key={k}><span className="text-mist">{KAAL_LABEL[k]}:</span> {clock(t!.start)} – {clock(t!.end)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* good & bad times */}
          <div className="lux-card p-5 sm:p-7">
            <h3 className="font-display text-2xl text-ivory">{hi ? "शुभ और अशुभ समय" : "Good & bad times"}</h3>
            <p className="mt-1 text-sm text-mist">{hi ? "हरा = शुभ, लाल = इसमें नया काम शुरू न करें" : "Green = auspicious, red = don't start anything new"}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["abhijit_muhurta", "rahukaal", "yamghant_kaal", "guliKaal"] as const).map((k) => {
                const t = timed(k);
                if (!t?.start) return null;
                const good = k === "abhijit_muhurta";
                return (
                  <div key={k} className={cn("rounded-2xl border p-4", good ? "border-emerald/30 bg-emerald/[.06]" : "border-rose/20 bg-rose/[.05]")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("flex items-center gap-1.5 text-sm font-semibold", good ? "text-emerald" : "text-rose")}>
                        {good ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {KAAL_LABEL[k]}
                      </span>
                      <span className="whitespace-nowrap font-display text-lg text-ivory">{clock(t.start)} – {clock(t.end)}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ivory-2">{ex(k)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* the five limbs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {five.map((f) => {
              const x = pick(f.k);
              if (!x) return null;
              return (
                <div key={f.k} className="lux-card p-5 sm:p-6">
                  <div className="text-[11px] uppercase tracking-[.18em] text-gold">{f.label}</div>
                  <div className="mt-1 font-display text-2xl text-ivory">{String(f.name(x) ?? "")}</div>
                  {x.end_time && <div className="mt-1 flex items-center gap-1.5 text-xs text-mist"><Clock className="h-3.5 w-3.5" /> {hi ? "समाप्ति" : "till"} {hm(x.end_time)}</div>}
                  <p className="mt-3 flex gap-1.5 rounded-xl bg-gold/[.07] p-2.5 text-[12.5px] leading-relaxed text-ivory-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {ex(f.k)}</p>
                  {f.more(x) && <p className="mt-3 text-sm leading-relaxed text-ivory-2">{String(f.more(x))}</p>}
                </div>
              );
            })}
          </div>

          <div className="lux-card p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["sun_sign", hi ? "सूर्य राशि" : "Sun sign"], ["moon_sign", hi ? "चंद्र राशि" : "Moon sign"], ["vikram_samvat", hi ? "विक्रम संवत" : "Vikram samvat"], ["shaka_samvat", hi ? "शक संवत" : "Shaka samvat"], ["ayana", hi ? "अयन" : "Ayana"]]
                .filter(([k]) => d[k] !== undefined && typeof d[k] !== "object")
                .map(([k, l]) => (
                  <div key={k} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-3">
                    <div className="text-[10px] uppercase tracking-[.16em] text-mist">{l}</div>
                    <div className="mt-1 text-ivory">{String(d[k])}</div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
