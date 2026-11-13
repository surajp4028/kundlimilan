"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Clock, Compass, HeartPulse, Loader2, MapPin, Moon, Plane, Smile, Sparkles, Sun, Sunrise, Sunset, Clover, Heart, AlertTriangle } from "lucide-react";
import { api, errMsg } from "@/lib/client/api";
import { useSite } from "@/lib/client/providers";
import { SIGNS, isSign, type SignKey } from "@/lib/astro";
import { PlaceSearch, Segmented, type PlaceValue } from "./pickers";
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
type Panch = { date: string; place: string; data: Record<string, unknown> };

const hm = (t?: T) => (t ? `${((t.hour % 24) + 11) % 12 + 1}:${String(t.minute).padStart(2, "0")} ${t.hour % 24 < 12 ? "AM" : "PM"}${t.hour >= 24 ? " (+1)" : ""}` : "");
const clock = (s?: unknown) => {
  if (typeof s !== "string" || !/^\d{1,2}:\d{1,2}/.test(s)) return typeof s === "string" ? s : "";
  const [h, m] = s.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export function PanchangTool() {
  const site = useSite();
  const [place, setPlace] = useState<PlaceValue | null>({ name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, tzId: "Asia/Kolkata" });
  const [lang, setLang] = useState<"en" | "hi">(site.default_language === "hi" ? "hi" : "en");
  const [p, setP] = useState<Panch | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setBusy(true);
    setErr("");
    api<{ panchang: Panch }>("/api/tools/panchang", { body: { place, lang } })
      .then((r) => alive && setP(r.panchang))
      .catch((e) => alive && setErr(errMsg(e)))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [place, lang]);

  const d = (p?.data || {}) as Record<string, unknown>;
  const pick = (k: string) => d[k] as Detail | undefined;
  const five = [
    { k: "tithi", label: "Tithi", name: (x: Detail) => x.details?.tithi_name, more: (x: Detail) => x.details?.special || x.details?.summary },
    { k: "nakshatra", label: "Nakshatra", name: (x: Detail) => x.details?.nak_name, more: (x: Detail) => `Ruler ${x.details?.ruler ?? ""} · Deity ${x.details?.deity ?? ""}` },
    { k: "yog", label: "Yoga", name: (x: Detail) => x.details?.yog_name, more: (x: Detail) => x.details?.special || x.details?.meaning },
    { k: "karan", label: "Karana", name: (x: Detail) => x.details?.karan_name, more: (x: Detail) => x.details?.special },
  ];
  const timed = (k: string) => d[k] as { start?: string; end?: string } | undefined;
  const maah = d.hindu_maah as Record<string, string | boolean> | undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
        <div className="flex-1"><PlaceSearch value={place} onChange={(v) => v && setPlace(v)} placeholder="Choose your city" /></div>
        <Segmented className="w-full sm:w-44" value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }]} />
      </div>
      {err && <p className="mt-6 text-center text-sm text-amber"><AlertTriangle className="mr-1 inline h-4 w-4" />{err}</p>}
      {busy && !p && <div className="mt-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}
      {p && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-8 space-y-4 transition", busy && "opacity-50")}>
          <div className="lux-card overflow-hidden p-6 text-center sm:p-8">
            <p className="eyebrow">{String(d.day || "")}</p>
            <h2 className="display mt-2 text-4xl text-ivory sm:text-5xl">{new Date(p.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</h2>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-mist"><MapPin className="h-4 w-4 text-gold" /> {p.place}</p>
            {maah && <p className="mt-3 text-sm text-gold-2">{String(maah.purnimanta || "")} maas{d.paksha ? ` · ${String(d.paksha)}` : ""}{d.ritu ? ` · ${String(d.ritu)} ritu` : ""}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { i: Sunrise, l: "Sunrise", v: clock(d.sunrise) },
                { i: Sunset, l: "Sunset", v: clock(d.sunset) },
                { i: Moon, l: "Moonrise", v: clock(d.moonrise) },
                { i: Moon, l: "Moonset", v: clock(d.moonset) },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-3">
                  <x.i className="mx-auto h-5 w-5 text-gold" />
                  <div className="mt-1 text-[10px] uppercase tracking-[.16em] text-mist">{x.l}</div>
                  <div className="font-display text-lg text-ivory">{x.v || "—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {five.map((f) => {
              const x = pick(f.k);
              if (!x) return null;
              return (
                <div key={f.k} className="lux-card p-5 sm:p-6">
                  <div className="text-[11px] uppercase tracking-[.18em] text-gold">{f.label}</div>
                  <div className="mt-1 font-display text-2xl text-ivory">{String(f.name(x) ?? "")}</div>
                  {x.end_time && <div className="mt-1 flex items-center gap-1.5 text-xs text-mist"><Clock className="h-3.5 w-3.5" /> till {hm(x.end_time)}</div>}
                  {f.more(x) && <p className="mt-3 text-sm leading-relaxed text-ivory-2">{String(f.more(x))}</p>}
                </div>
              );
            })}
          </div>
          <div className="lux-card p-5 sm:p-7">
            <h3 className="font-display text-2xl text-ivory">Muhurat & kaal</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[["abhijit_muhurta", "Abhijit muhurat", true], ["rahukaal", "Rahu kaal", false], ["guliKaal", "Gulika kaal", false], ["yamghant_kaal", "Yamaganda", false]].map(([k, l, good]) => {
                const t = timed(k as string);
                if (!t?.start) return null;
                return (
                  <div key={k as string} className={cn("flex items-center justify-between rounded-2xl border p-3", good ? "border-emerald/30 bg-emerald/[.06]" : "border-rose/20 bg-rose/[.05]")}>
                    <span className={cn("text-sm", good ? "text-emerald" : "text-rose")}>{l as string}</span>
                    <span className="text-sm text-ivory">{clock(t.start)} – {clock(t.end)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["sun_sign", "Sun sign"], ["moon_sign", "Moon sign"], ["vikram_samvat", "Vikram samvat"], ["shaka_samvat", "Shaka samvat"], ["disha_shool", "Disha shool"], ["ayana", "Ayana"], ["moon_nivas", "Moon nivas"], ["nak_shool", "Nakshatra shool"]]
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
