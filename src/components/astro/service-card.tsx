"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Calendar, Check, Crown, FileText, Flame, Gem, Hash, Heart, Moon, Orbit, ScrollText, Sparkles, Star, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/astro";

export type ServiceCardData = {
  slug: string; title: string; titleHi: string | null; tagline: string | null; features: string[]; category: string; inputKind: string;
  pagesHint: string | null; price: number; mrp: number | null; icon: string; accent: string; featured: boolean; languages: string[]; description?: string | null;
};

export const ICONS: Record<string, LucideIcon> = { sparkles: Sparkles, heart: Heart, sun: Sun, moon: Moon, star: Star, orbit: Orbit, gem: Gem, calendar: Calendar, hash: Hash, scroll: ScrollText, crown: Crown, flame: Flame };
export const ACCENTS: Record<string, string> = {
  gold: "from-gold/30 to-gold-3/5 text-gold",
  rose: "from-rose/30 to-rose/5 text-rose",
  violet: "from-violet/30 to-violet/5 text-violet",
  sky: "from-sky/30 to-sky/5 text-sky",
  emerald: "from-emerald/30 to-emerald/5 text-emerald",
  amber: "from-amber/30 to-amber/5 text-amber",
};

export function ServiceCard({ s, i = 0, compact = false }: { s: ServiceCardData; i?: number; compact?: boolean }) {
  const Icon = ICONS[s.icon] || Sparkles;
  const off = s.mrp && s.mrp > s.price ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.06, duration: 0.5 }} className="h-full">
      <Link href={`/reports/${s.slug}`} className={cn("lux-card group flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 sm:p-6", s.featured && "shadow-gold")}>
        {s.featured && <span className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-gold-light to-gold-bright px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ongold">Bestseller</span>}
        <span className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-ink/10", ACCENTS[s.accent] || ACCENTS.gold)}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-display text-[1.7rem] leading-tight text-ivory">{s.title}</h3>
        {s.titleHi && <p className="font-deva text-sm text-gold/80">{s.titleHi}</p>}
        {s.tagline && <p className="mt-2 text-sm leading-relaxed text-mist">{s.tagline}</p>}
        {!compact && s.features.length > 0 && (
          <ul className="mt-4 space-y-2">
            {s.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-ivory-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {f}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-6">
          <div className="hairline mb-4" />
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-gold-2">{inr(s.price)}</span>
                {off > 0 && <span className="text-sm text-dim line-through">{inr(s.mrp!)}</span>}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-mist">
                {off > 0 && <span className="rounded-full bg-emerald/15 px-2 py-0.5 font-semibold text-emerald">{off}% off</span>}
                {s.pagesHint && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {s.pagesHint}
                  </span>
                )}
              </div>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 text-gold transition group-hover:bg-gold-bright group-hover:text-ongold">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
