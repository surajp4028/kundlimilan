"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Clock, FileText, Languages, Lock, Mail, RefreshCcw, Sparkles } from "lucide-react";
import { OrderFlow } from "./order-flow";
import { ACCENTS, ICONS, ServiceCard, type ServiceCardData } from "./service-card";
import { LANGUAGES, inr } from "@/lib/astro";
import { cn } from "@/lib/utils";

export function ReportDetail({ s, others }: { s: ServiceCardData & { description?: string | null }; others: ServiceCardData[] }) {
  const Icon = ICONS[s.icon] || Sparkles;
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const off = s.mrp && s.mrp > s.price ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 sm:pt-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-mist hover:text-gold">
        <ChevronLeft className="h-4 w-4" /> All reports
      </Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_440px] lg:gap-12">
        <div className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-ink/10", ACCENTS[s.accent] || ACCENTS.gold)}>
              <Icon className="h-7 w-7" />
            </span>
            <h1 className="display mt-5 text-[2.6rem] text-ivory sm:text-6xl">{s.title}</h1>
            {s.titleHi && <p className="mt-1 font-deva text-lg text-gold/90">{s.titleHi}</p>}
            {s.tagline && <p className="mt-4 text-[15px] leading-relaxed text-mist sm:text-lg">{s.tagline}</p>}
            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-5xl text-gold-2">{inr(s.price)}</span>
              {off > 0 && (
                <>
                  <span className="text-lg text-dim line-through">{inr(s.mrp!)}</span>
                  <span className="rounded-full bg-emerald/15 px-2.5 py-1 text-xs font-semibold text-emerald">{off}% off</span>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                s.pagesHint && { i: FileText, t: s.pagesHint },
                { i: Languages, t: s.languages.map((l) => LANGUAGES[l]?.split(" (")[0] || l).join(" · ") },
                { i: Clock, t: "Ready in minutes" },
                { i: Mail, t: "Emailed to you" },
              ]
                .filter(Boolean)
                .map((x) => {
                  const b = x as { i: typeof Clock; t: string };
                  return (
                    <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-ink/[.03] px-3 py-1.5 text-xs text-ivory-2">
                      <b.i className="h-3.5 w-3.5 text-gold" /> {b.t}
                    </span>
                  );
                })}
            </div>
          </motion.div>

          {/* order form appears here on phones, beside the content on desktop */}
          {!desktop && (
            <div className="mt-8">
              <OrderFlow s={s} />
            </div>
          )}

          {s.description && (
            <section className="mt-12">
              <p className="eyebrow">About this report</p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.85] text-ivory-2">{s.description}</p>
            </section>
          )}
          {s.features.length > 0 && (
            <section className="mt-10">
              <p className="eyebrow">What's inside</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {s.features.map((f, i) => (
                  <motion.li key={f} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="flex items-start gap-3 rounded-2xl border border-ink/[.07] bg-ink/[.025] p-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15"><Check className="h-4 w-4 text-gold" /></span>
                    <span className="text-sm text-ivory-2">{f}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
          {s.inputKind === "couple" && (
            <section className="mt-10">
              <p className="eyebrow">Sample pages</p>
              <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:mx-0 sm:px-0">
                {["/samples/match-p1.jpg", "/samples/match-p5.jpg", "/samples/match-p14.jpg", "/samples/match-p27.jpg"].map((src) => (
                  <div key={src} className="relative h-64 w-48 shrink-0 overflow-hidden rounded-xl border border-gold/25 shadow-deep">
                    <Image src={src} alt="Sample page" fill sizes="192px" className="object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-dim">Sample with demo names. Your report uses your own details and our branding.</p>
            </section>
          )}
          <section className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { i: Lock, t: "Private & encrypted", d: "Birth details and PDFs are stored encrypted, only for you." },
              { i: RefreshCcw, t: "Refund guarantee", d: "If your report can't be prepared, you get a full refund." },
              { i: Clock, t: "Instant delivery", d: "Automatic generation the moment your payment is confirmed." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-4">
                <x.i className="h-5 w-5 text-gold" />
                <div className="mt-3 text-sm font-semibold text-ivory">{x.t}</div>
                <p className="mt-1 text-xs leading-relaxed text-mist">{x.d}</p>
              </div>
            ))}
          </section>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">{desktop && <OrderFlow s={s} />}</div>
        </aside>
      </div>
      {others.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow">You may also like</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o, i) => (
              <ServiceCard key={o.slug} s={o} i={i} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
