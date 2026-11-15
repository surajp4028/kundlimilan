"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, BookOpen, Calendar, Clock, Flame, Gem, Globe2, Hash, Heart, Home, Orbit, ScrollText, Search, Sparkles, Star, Sun, type LucideIcon } from "lucide-react";
import { GROUPS, TOOLS, type GroupKey } from "@/lib/tools-catalog";
import { cn } from "@/lib/utils";

export const TOOL_ICONS: Record<string, LucideIcon> = {
  flame: Flame, gem: Gem, clock: Clock, orbit: Orbit, chart: BarChart3, scroll: ScrollText, book: BookOpen, hash: Hash, sun: Sun, home: Home, globe: Globe2,
  calendar: Calendar, sparkles: Sparkles, star: Star, heart: Heart,
};

/** Grid of catalogue tools, grouped. `group` + `exclude` → "more in this group" strip under a tool. */
export function ToolsHub({ off = [], group, exclude, compact, limit }: { off?: string[]; group?: GroupKey; exclude?: string; compact?: boolean; limit?: number }) {
  const [q, setQ] = useState("");
  const [g, setG] = useState<GroupKey | "all">("all");
  const offSet = useMemo(() => new Set(off), [off]);
  let list = TOOLS.filter((t) => !offSet.has(t.slug) && t.slug !== exclude && (!group || t.group === group));
  if (!compact) {
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((t) => `${t.en} ${t.hi} ${t.blurb} ${t.blurbHi}`.toLowerCase().includes(s));
    if (g !== "all") list = list.filter((t) => t.group === g);
  }
  if (limit) list = list.slice(0, limit);
  const groups = (Object.keys(GROUPS) as GroupKey[]).filter((k) => TOOLS.some((t) => t.group === k && !offSet.has(t.slug)));

  if (compact) {
    if (!list.length) return null;
    return (
      <section className="mx-auto max-w-5xl px-4 sm:px-8">
        <h2 className="font-display text-2xl text-ivory">More {group ? GROUPS[group].en.toLowerCase() : "tools"} · और टूल</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((t, i) => <ToolCard key={t.slug} t={t} i={i} />)}</div>
        <div className="mt-6 text-center"><Link href="/tools" className="btn-ghost inline-flex">All tools · सभी टूल <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — manglik, muhurat, vastu, रत्न…" className="field !pl-11" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { href: "/kundli", en: "Free Kundli", hi: "कुंडली", i: Sparkles },
          { href: "/matching", en: "Kundli Milan", hi: "मिलान", i: Heart },
          { href: "/horoscope", en: "Rashifal", hi: "राशिफल", i: Sun },
          { href: "/panchang", en: "Panchang", hi: "पंचांग", i: Calendar },
          { href: "/numerology", en: "Numerology", hi: "अंक ज्योतिष", i: Hash },
          { href: "/reports/palm-reading", en: "Palm Reading", hi: "हस्तरेखा", i: Star },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="flex flex-col items-center gap-1 rounded-2xl border border-gold/20 bg-white/80 px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50">
            <x.i className="h-5 w-5 text-gold" />
            <span className="text-sm font-semibold leading-tight text-ivory">{x.hi}</span>
            <span className="text-[10.5px] text-mist">{x.en}</span>
          </Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-1 sm:flex-wrap sm:justify-center">
        {(["all", ...groups] as const).map((k) => (
          <button key={k} type="button" onClick={() => setG(k)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm transition", g === k ? "border-[#c58b1d] bg-gradient-to-b from-gold-light to-gold-bright font-semibold text-ongold" : "border-ink/[.08] bg-white text-ivory-2 hover:border-gold/50")}>
            {k === "all" ? "All · सभी" : `${GROUPS[k].hi}`}
          </button>
        ))}
      </div>
      {groups
        .filter((k) => list.some((t) => t.group === k))
        .map((k) => {
          const Icon = TOOL_ICONS[GROUPS[k].icon] || Sparkles;
          return (
            <section key={k} className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-gold-light to-gold-bright text-ongold"><Icon className="h-[18px] w-[18px]" /></span>
                <h2 className="font-display text-2xl text-ivory">{GROUPS[k].hi} <span className="text-base text-mist">· {GROUPS[k].en}</span></h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.filter((t) => t.group === k).map((t, i) => <ToolCard key={t.slug} t={t} i={i} />)}
              </div>
            </section>
          );
        })}
      {!list.length && <p className="mt-10 text-center text-mist">No tool matches “{q}”.</p>}
    </div>
  );
}

export function ToolCard({ t, i = 0 }: { t: (typeof TOOLS)[number]; i?: number }) {
  const Icon = TOOL_ICONS[t.icon] || Sparkles;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
      <Link href={`/tools/${t.slug}`} className="lux-card group flex h-full items-start gap-4 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/[.08] text-gold"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-display text-xl leading-tight text-ivory">{t.hi}</span>
            {t.popular && <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-[#fbe7b8]">Popular</span>}
          </span>
          <span className="block text-xs font-semibold text-gold-2">{t.en}</span>
          <span className="mt-1 block text-[13px] leading-snug text-mist">{t.blurbHi}</span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gold transition group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}
