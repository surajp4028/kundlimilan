"use client";
import { Fragment, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* =====================================================================
 * Generic, safe renderer for AstrologyAPI JSON:
 *  - strings are shown as text (HTML tags stripped — never injected)
 *  - SVG charts/maps are shown through <img src="data:…"> (scripts can't run inside an <img>)
 *  - arrays of flat objects → tables, nested objects → titled sub-cards, booleans → Yes/No badges
 * ===================================================================== */

type Lang = "en" | "hi";
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const HIDE = /^(img_url|.*_key|.*millisecond.*|status|include_meta|is_ending_next_day|gem_key|.*_url|grade_score_scale|catalog_type|result|category|finding_count_by_grade|planet_id|sign_id|dasha_id)$/i;

const LABELS: Record<string, [string, string]> = {
  present: ["Present", "उपस्थित"], is_present: ["Present", "उपस्थित"], one_line: ["Summary", "सारांश"], report: ["Report", "रिपोर्ट"],
  summary: ["Summary", "सारांश"], description: ["Details", "विवरण"], title: ["Title", "शीर्षक"], planet: ["Planet", "ग्रह"], planet_name: ["Planet", "ग्रह"],
  start: ["Start", "आरंभ"], end: ["End", "समाप्ति"], start_date: ["Start", "आरंभ"], end_date: ["End", "समाप्ति"], start_time: ["From", "से"], end_time: ["To", "तक"],
  date: ["Date", "तिथि"], time: ["Time", "समय"], score: ["Score", "स्कोर"], sign: ["Sign", "राशि"], sign_name: ["Sign", "राशि"], house: ["House", "भाव"],
  name: ["Name", "नाम"], duration: ["Duration", "अवधि"], remedies: ["Remedies", "उपाय"], remedy: ["Remedy", "उपाय"], effects: ["Effects", "प्रभाव"],
  manglik_status: ["Manglik status", "मांगलिक स्थिति"], percentage_manglik_present: ["Manglik %", "मांगलिक प्रतिशत"], is_mars_manglik_cancelled: ["Cancelled?", "दोष निरस्त?"],
  manglik_report: ["Report", "रिपोर्ट"], major: ["Mahadasha", "महादशा"], minor: ["Antardasha", "अंतर्दशा"], sub_minor: ["Pratyantar", "प्रत्यंतर"],
  muhurta: ["Muhurat", "मुहूर्त"], hora: ["Hora", "होरा"], day: ["Day", "दिन"], night: ["Night", "रात"], prediction: ["Prediction", "फल"],
  health: ["Health", "स्वास्थ्य"], emotions: ["Emotions", "भावनाएँ"], profession: ["Career", "करियर"], luck: ["Luck", "भाग्य"], personal_life: ["Personal life", "निजी जीवन"], travel: ["Travel", "यात्रा"],
  wear_finger: ["Finger", "उंगली"], wear_metal: ["Metal", "धातु"], wear_day: ["Day to wear", "धारण दिन"], semi_gem: ["Substitute", "उपरत्न"], weight_caret: ["Weight (carat)", "वज़न (कैरेट)"],
  gem_deity: ["Deity", "देवता"], LIFE: ["Life stone", "जीवन रत्न"], BENEFIC: ["Benefic stone", "शुभ रत्न"], LUCKY: ["Lucky stone", "भाग्य रत्न"],
  recommend: ["Recommendation", "सुझाव"], detail: ["Details", "विवरण"], suggestions: ["Suggestions", "सुझाव"], muhurtas: ["Dates", "तिथियाँ"], yogas: ["Dates", "तिथियाँ"],
  festivals: ["Festivals", "त्योहार"], count: ["Count", "संख्या"], is_late_night: ["Late night", "देर रात"], nakshatra: ["Nakshatra", "नक्षत्र"],
  findings: ["Findings", "दोष"], finding_title: ["Finding", "दोष"], display_name: ["Item", "स्थान"], direction: ["Direction", "दिशा"], current_impact: ["Impact", "प्रभाव"],
  overall_assessment: ["Overall", "कुल परिणाम"], score_percentage: ["Score %", "स्कोर %"], result_label: ["Result", "परिणाम"], performance_band: ["Band", "श्रेणी"],
};

const pretty = (k: string, lang: Lang) => LABELS[k]?.[lang === "hi" ? 1 : 0] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const clean = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").trim();
const isPrim = (v: Json): v is string | number | boolean | null => v === null || typeof v !== "object";
const isSvg = (v: Json) => typeof v === "string" && /^\s*<svg[\s>]/i.test(v);

function Yes({ v, lang }: { v: boolean; lang: Lang }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", v ? "bg-emerald/12 text-emerald" : "bg-ink/[.06] text-mist")}>
      {v ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {v ? (lang === "hi" ? "हाँ" : "Yes") : lang === "hi" ? "नहीं" : "No"}
    </span>
  );
}

function Prim({ v, lang }: { v: string | number | boolean | null; lang: Lang }) {
  if (v === null || v === "") return <span className="text-dim">—</span>;
  if (typeof v === "boolean") return <Yes v={v} lang={lang} />;
  if (typeof v === "number") return <span className="tabular-nums">{Number.isInteger(v) ? v : Math.round(v * 100) / 100}</span>;
  // machine codes like "working_for_you" → "Working for you"
  if (/^[a-z]+(_[a-z]+)+$/.test(v)) return <span>{v[0].toUpperCase() + v.slice(1).replace(/_/g, " ")}</span>;
  return <span className="whitespace-pre-line">{clean(v)}</span>;
}

function SvgImage({ svg }: { svg: string }) {
  // wide maps (astrocartography ~1200×460) stay readable on phones: keep a minimum width and scroll sideways
  const m = /viewBox="[\d.\s-]+?\s([\d.]+)\s+([\d.]+)"/.exec(svg) || /width="([\d.]+)"[^>]*height="([\d.]+)"/.exec(svg);
  const wide = m ? Number(m[1]) / Number(m[2]) > 1.6 : false;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Chart" className={cn("mx-auto h-auto", wide ? "w-[860px] max-w-none sm:w-full sm:max-w-full" : "w-full max-w-md")} />
  );
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-white p-2">
      {wide ? (
        <>
          <div className="no-scrollbar overflow-x-auto overscroll-x-contain">{img}</div>
          <p className="mt-1 text-center text-[11px] text-mist sm:hidden">← swipe the map · मानचित्र खिसकाएँ →</p>
        </>
      ) : (
        img
      )}
    </div>
  );
}

function Table({ rows, lang }: { rows: { [k: string]: Json }[]; lang: Lang }) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !HIDE.test(k));
  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className="border-b border-gold/20 bg-gold/[.07] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gold-2 first:rounded-tl-xl last:rounded-tr-xl">{pretty(c, lang)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-ink/[.02]">
              {cols.map((c) => (
                <td key={c} className="border-b border-ink/[.05] px-3 py-2 align-top text-ivory">
                  {isPrim(r[c] ?? null) ? <Prim v={(r[c] ?? null) as string | number | boolean | null} lang={lang} /> : <span className="text-xs text-ivory-2">{flat(r[c])}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const flat = (v: Json | undefined): string =>
  v === undefined || v === null ? "" : isPrim(v) ? clean(String(v)) : Array.isArray(v) ? v.map(flat).filter(Boolean).join(", ") : Object.entries(v).filter(([k]) => !HIDE.test(k)).map(([k, x]) => `${k.replace(/_/g, " ")}: ${flat(x)}`).join(" · ");

function Node({ v, lang, depth = 0 }: { v: Json; lang: Lang; depth?: number }): ReactNode {
  if (isSvg(v)) return <SvgImage svg={v as string} />;
  if (isPrim(v)) {
    if (typeof v === "string" && clean(v).length > 60) return <p className="whitespace-pre-line text-[15px] leading-relaxed text-ivory-2">{clean(v)}</p>;
    return <Prim v={v} lang={lang} />;
  }
  if (Array.isArray(v)) {
    if (!v.length) return <p className="text-sm text-mist">{lang === "hi" ? "कुछ नहीं मिला" : "Nothing found"}</p>;
    if (v.every(isPrim)) {
      const long = v.some((x) => typeof x === "string" && clean(x).length > 60);
      return long ? (
        <ul className="space-y-2">{v.map((x, i) => <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ivory-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /><Prim v={x as string} lang={lang} /></li>)}</ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">{v.map((x, i) => <span key={i} className="rounded-full border border-gold/25 bg-gold/[.06] px-3 py-1 text-sm text-ivory"><Prim v={x as string} lang={lang} /></span>)}</div>
      );
    }
    const objs = v.filter((x): x is { [k: string]: Json } => !!x && typeof x === "object" && !Array.isArray(x));
    const flatRows = objs.length === v.length && objs.every((o) => Object.entries(o).filter(([k]) => !HIDE.test(k)).every(([, x]) => isPrim(x) || (Array.isArray(x) && x.every(isPrim) && x.length <= 6)));
    const width = new Set(objs.flatMap((o) => Object.keys(o).filter((k) => !HIDE.test(k)))).size;
    const longText = objs.some((o) => Object.values(o).some((x) => typeof x === "string" && clean(x).length > 90));
    if (flatRows && width <= 9 && !longText) return <Table rows={objs} lang={lang} />;
    return <div className="space-y-3">{v.map((x, i) => <Card key={i} lang={lang} depth={depth + 1}><Node v={x} lang={lang} depth={depth + 1} /></Card>)}</div>;
  }
  // object
  const entries = Object.entries(v).filter(([k, x]) => !HIDE.test(k) && x !== null && x !== "");
  if (typeof v.title === "string" && typeof v.description === "string") {
    return (
      <div>
        <h4 className="font-display text-xl text-ivory">{clean(v.title)}</h4>
        <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ivory-2">{clean(v.description)}</p>
      </div>
    );
  }
  const prims = entries.filter(([, x]) => isPrim(x) && !(typeof x === "string" && clean(x).length > 60) && !isSvg(x));
  const rest = entries.filter((e) => !prims.includes(e));
  return (
    <div className="space-y-4">
      {prims.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {prims.map(([k, x]) =>
            typeof x === "number" && /percent/i.test(k) && x >= 0 && x <= 100 ? (
              <div key={k} className="rounded-xl border border-ink/[.06] bg-ink/[.02] px-3 py-2 sm:col-span-2">
                <div className="flex items-baseline justify-between text-[12px] text-mist"><span>{pretty(k, lang)}</span><b className="font-display text-xl text-ivory">{Math.round(x)}%</b></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[.07]">
                  <div className={cn("h-full rounded-full", x >= 70 ? "bg-emerald" : x >= 40 ? "bg-amber" : "bg-rose")} style={{ width: `${Math.max(3, x)}%` }} />
                </div>
              </div>
            ) : (
            <div key={k} className="flex items-baseline justify-between gap-3 rounded-xl border border-ink/[.06] bg-ink/[.02] px-3 py-2">
              <dt className="text-[12px] text-mist">{pretty(k, lang)}</dt>
              <dd className="text-right text-sm font-medium text-ivory"><Prim v={x as string} lang={lang} /></dd>
            </div>
            ),
          )}
        </dl>
      )}
      {rest.map(([k, x]) => (
        <Fragment key={k}>
          {isSvg(x) ? (
            <SvgImage svg={x as string} />
          ) : (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-gold">{pretty(k, lang)}</div>
              <Node v={x} lang={lang} depth={depth + 1} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function Card({ children, depth = 0, lang: _l }: { children: ReactNode; depth?: number; lang: Lang }) {
  return <div className={cn("rounded-2xl border p-4", depth > 1 ? "border-ink/[.06] bg-white/70" : "border-gold/15 bg-gold/[.03]")}>{children}</div>;
}

export type ToolSection = { endpoint: string; en: string; hi: string; data?: unknown; error?: string };

export function ToolResult({ sections, lang }: { sections: ToolSection[]; lang: Lang }) {
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <section key={s.endpoint} className="lux-card overflow-hidden p-5 sm:p-7">
          <h3 className="mb-4 font-display text-2xl text-ivory">{lang === "hi" ? s.hi : s.en}</h3>
          {s.error ? (
            <p className="flex items-center gap-2 text-sm text-amber"><AlertTriangle className="h-4 w-4" /> {s.error}</p>
          ) : (
            <Node v={s.data as Json} lang={lang} />
          )}
        </section>
      ))}
    </div>
  );
}
