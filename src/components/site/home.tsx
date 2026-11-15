"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Camera, CalendarDays, ChevronDown, Clock, Download, FileLock2, Hand, Hash, Heart, ImageIcon, Languages, Lock, ShieldCheck, Sparkles, Star, Sun, Wand2 } from "lucide-react";
import { useSite } from "@/lib/client/providers";
import { SIGNS, inr } from "@/lib/astro";
import { ZodiacWheel } from "@/components/astro/zodiac-wheel";
import { Toran } from "@/components/astro/toran";
import { ZodiacMedallion } from "@/components/astro/zodiac-art";
import { GaneshShowcase } from "@/components/astro/ganesh-showcase";
import { Meteors } from "@/components/ui/meteors";
import { Spotlight } from "@/components/ui/spotlight";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ServiceCard, type ServiceCardData } from "@/components/astro/service-card";
import { PalmArt } from "@/components/astro/palm-art";
import { ToolCard } from "@/components/astro/tools-hub";
import { TOOLS, toolsOff } from "@/lib/tools-catalog";
import { Section, SectionTitle } from "./shell";
import { cn } from "@/lib/utils";

export function Home({ services }: { services: ServiceCardData[] }) {
  const s = useSite();
  const palm = services.find((x) => x.inputKind === "palm");
  const tools: { href: string; on: string; icon: typeof Sparkles; t: string; d: string; tone: string; badge?: string }[] = [
    ...(palm ? [{ href: `/reports/${palm.slug}`, on: "on", icon: Hand, t: "Palm Reading", d: "Click a photo of your palm — get your reading", tone: "from-amber/30", badge: inr(palm.price) }] : []),
    { href: "/kundli", on: s.tool_kundli, icon: Sparkles, t: "Free Kundli", d: "Lagna & Navamsa chart, planets, dasha, Manglik", tone: "from-gold/25" },
    { href: "/matching", on: s.tool_matching, icon: Heart, t: "Kundli Milan", d: "36-guna Ashtakoot score in seconds", tone: "from-rose/25" },
    { href: "/horoscope", on: s.tool_horoscope, icon: Sun, t: "Rashifal", d: "Today, tomorrow & this week", tone: "from-amber/25" },
    { href: "/panchang", on: s.tool_panchang, icon: CalendarDays, t: "Panchang", d: "Tithi, nakshatra, yoga & muhurat", tone: "from-sky/25" },
    { href: "/numerology", on: s.tool_numerology, icon: Hash, t: "Numerology", d: "Your numbers, colours & lucky days", tone: "from-emerald/25" },
  ].filter((t) => t.on === "on");
  const featured = services.find((x) => x.featured && x.inputKind === "couple") || services[0];

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        {/* animated aurora + light sweep + meteors */}
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora-blob absolute -left-[20%] top-[10%] h-[60vw] max-h-[620px] w-[60vw] max-w-[620px] rounded-full bg-[radial-gradient(circle,rgba(255,170,70,.35),transparent_65%)] blur-2xl" />
          <div className="aurora-blob absolute -right-[15%] top-[-10%] h-[55vw] max-h-[560px] w-[55vw] max-w-[560px] rounded-full bg-[radial-gradient(circle,rgba(200,52,31,.16),transparent_65%)] blur-2xl [animation-delay:-6s]" />
          <div className="aurora-blob absolute bottom-[-20%] left-[30%] h-[50vw] max-h-[520px] w-[50vw] max-w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,24,48,.12),transparent_65%)] blur-2xl [animation-delay:-12s]" />
          <Spotlight className="-left-10 -top-40 md:-top-20 md:left-40" fill="#ffb347" />
          <div className="absolute inset-0 overflow-hidden"><Meteors number={14} className="meteor-gold" /></div>
        </div>
        <Toran className="pointer-events-none relative -mt-1 opacity-95" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 pb-16 pt-2 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:pb-24 lg:pt-4">
          <div className="order-2 min-w-0 text-center lg:order-1 lg:text-left">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-deva text-lg tracking-wide text-vermilion sm:text-xl">
              ॥ श्री गणेशाय नमः ॥
            </motion.p>
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mt-4 inline-flex items-center gap-2 overflow-hidden rounded-full border border-gold/30 bg-white/85 px-4 py-1.5 text-[11px] tracking-wide text-gold-2 shadow-sm">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-bright opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-gold-bright" /></span>
              {s.hero_badge}
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-x_3.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </motion.span>
            <h1 className="display mt-5 text-[2.9rem] text-ivory min-[400px]:text-[3.3rem] sm:text-7xl">
              <WordReveal text={s.hero_title} />
            </h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-mist sm:text-lg lg:mx-0">
              {s.hero_subtitle}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              {featured && (
                <Link href={`/reports/${featured.slug}`} className="btn-gold relative text-[15px]">
                  <span className="absolute -inset-1 -z-10 animate-glow rounded-full bg-gold-bright/40 blur-md" />
                  Get {featured.title} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {s.tool_kundli === "on" && (
                <Link href="/kundli" className="btn-ghost text-[15px]">
                  <Sparkles className="h-4 w-4 text-gold" /> Free Kundli
                </Link>
              )}
            </motion.div>
            {tools.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="no-scrollbar -mx-5 mt-7 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-5 pb-1 sm:flex-wrap sm:justify-center lg:mx-0 lg:justify-start lg:px-0">
                {tools.filter((t) => t.href !== "/kundli").map((t) => (
                  <Link key={t.href} href={t.href} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/[.08] bg-white px-4 py-2.5 text-sm text-ivory-2 shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:text-ivory hover:shadow-gold">
                    <t.icon className="h-4 w-4 text-gold" /> {t.t}
                  </Link>
                ))}
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-2 text-center lg:mx-0">
              {[
                { n: 36, suf: "", t: "Guna Milan" },
                { n: 60, suf: "+", t: "page reports" },
                { n: 2, suf: " min", t: "delivery" },
              ].map((b) => (
                <div key={b.t} className="rounded-2xl border border-ink/[.07] bg-white/85 px-2 py-3 shadow-sm">
                  <div className="font-display text-2xl text-maroon"><NumberTicker value={b.n} suffix={b.suf} /></div>
                  <div className="text-[11px] leading-tight text-mist">{b.t}</div>
                </div>
              ))}
            </motion.div>
          </div>
          <div className="relative order-1 mx-auto w-[min(86vw,440px)] lg:order-2 lg:w-full lg:max-w-[500px]">
            {s.hero_mode === "upload" ? (
              <GaneshShowcase src={`/api/public/hero?v=${s.hero_version}`} plaque="गणपति बप्पा मोरया" />
            ) : s.hero_mode === "art" ? (
              <ZodiacWheel src="/brand/ganesh-color-800.png" inset="20%" />
            ) : s.hero_mode === "painting" ? (
              <GaneshShowcase src="/brand/ganesh-painting.jpg" plaque="श्री मंगलमूर्ति" />
            ) : (
              <GaneshShowcase plaque="गणपति बप्पा मोरया" />
            )}
          </div>
        </div>
      </section>

      {/* ---------------- FREE TOOLS ---------------- */}
      {tools.length > 0 && (
        <Section className="pb-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Free tools</p>
              <h2 className="display mt-2 text-3xl text-ivory sm:text-4xl">Start with your <em className="gold-text not-italic">chart</em></h2>
            </div>
          </div>
          <div className={cn("no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0", tools.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5")}>
            {tools.map((t, i) => (
              <motion.div key={t.href} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="w-[68%] shrink-0 snap-start min-[480px]:w-[44%] sm:w-auto">
                <Link href={t.href} className="lux-card group flex h-full flex-col overflow-hidden p-5">
                  <div className={cn("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", t.tone)} />
                  <div className="relative flex items-start justify-between gap-2">
                    <t.icon className="h-7 w-7 text-gold" />
                    {t.badge && <span className="rounded-full bg-gradient-to-b from-gold-light to-gold-bright px-2.5 py-0.5 text-xs font-bold text-ongold shadow-gold">{t.badge}</span>}
                  </div>
                  <div className="relative mt-6 font-display text-2xl text-ivory">{t.t}</div>
                  <p className="relative mt-1 text-[13px] leading-snug text-mist">{t.d}</p>
                  <span className="relative mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gold">
                    Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ---------------- MORE TOOLS ---------------- */}
      <MoreTools />

      {/* ---------------- PALM READING ---------------- */}
      {palm && <PalmPromo s={palm} />}

      {/* ---------------- REPORTS ---------------- */}
      {services.length > 0 && (
        <Section className="pb-24" id="reports">
          <SectionTitle eyebrow="Premium reports" title="Detailed reports," accent="crafted for you" subtitle="Prepared from your exact birth time and place, delivered as a beautiful PDF in minutes — saved in your account forever." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((x, i) => (
              <ServiceCard key={x.slug} s={x} i={i} />
            ))}
          </div>
        </Section>
      )}

      {/* ---------------- RASHIFAL (maroon band) ---------------- */}
      {s.tool_horoscope === "on" && (
        <section className="band-maroon relative mb-24 overflow-hidden py-16 sm:py-20">
          <div className="paisley-edge pointer-events-none absolute inset-x-0 top-0 h-5 opacity-80" />
          <div className="paisley-edge pointer-events-none absolute inset-x-0 bottom-0 h-5 opacity-80" />
          <div className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-[#f7d27a]/15" />
          <div className="pointer-events-none absolute -right-12 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full border border-dashed border-[#f7d27a]/15" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
            <SectionTitle eyebrow="Daily rashifal · दैनिक राशिफल" title="What do the stars say" accent="today?" subtitle="Choose your rashi for today's, tomorrow's and this week's predictions." />
            <RashiCarousel />
          </div>
        </section>
      )}

      {/* ---------------- SAMPLE REPORT ---------------- */}
      <Section className="pb-24">
        <div className="lux-card overflow-hidden p-6 sm:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">See what you get</p>
              <h2 className="display mt-3 text-4xl text-ivory sm:text-5xl">A report you will <em className="gold-text not-italic">keep</em></h2>
              <p className="mt-4 text-[15px] leading-relaxed text-mist">Every report is generated from your exact details and branded for you — charts, dashas, doshas and clear conclusions, in English or Hindi.</p>
              <ul className="mt-6 space-y-3">
                {[
                  { i: Wand2, t: "Ready in minutes, automatically" },
                  { i: Languages, t: "English & हिन्दी" },
                  { i: FileLock2, t: "Stored privately — only you can download it" },
                  { i: BadgeCheck, t: "Secure Razorpay checkout · UPI, cards, net-banking" },
                ].map((x) => (
                  <li key={x.t} className="flex items-center gap-3 text-sm text-ivory-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/20 bg-gold/5"><x.i className="h-4 w-4 text-gold" /></span>
                    {x.t}
                  </li>
                ))}
              </ul>
              {featured && (
                <Link href={`/reports/${featured.slug}`} className="btn-gold mt-8">
                  Order {featured.title} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="relative mx-auto h-[360px] w-full max-w-md sm:h-[440px]">
              {["/samples/match-p14.jpg", "/samples/match-p5.jpg", "/samples/match-p1.jpg"].map((src, i) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 30, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: [-9, 6, -2][i] }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 * i, duration: 0.8 }}
                  className="absolute top-0 h-[330px] w-[255px] overflow-hidden rounded-xl border border-gold/30 shadow-deep sm:h-[400px] sm:w-[310px]"
                  style={{ left: `${[2, 22, 12][i]}%`, zIndex: i }}
                >
                  <Image src={src} alt="Sample report page" fill sizes="310px" className="object-cover" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <Section className="pb-24">
        <SectionTitle eyebrow="Simple & secure" title="Three steps to" accent="clarity" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Share birth details", d: "Name, date, exact time and place — use the smart pickers, or a saved profile.", i: Clock },
            { n: "02", t: "Pay securely", d: "Razorpay checkout with UPI, cards & net-banking. Your price is locked by our server.", i: ShieldCheck },
            { n: "03", t: "Download your PDF", d: "Generated automatically and emailed to you — always available under My Reports.", i: Download },
          ].map((x, i) => (
            <motion.div key={x.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="lux-card p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-5xl text-gold/30">{x.n}</span>
                <x.i className="h-6 w-6 text-gold" />
              </div>
              <h3 className="mt-4 font-display text-2xl text-ivory">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section className="pb-10">
        <SectionTitle eyebrow="Questions" title="Good to" accent="know" />
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map((q) => (
            <Faq key={q.q} q={q.q} a={q.a} />
          ))}
        </div>
      </Section>

      {/* ---------------- CTA ---------------- */}
      <Section className="pt-14">
        <div className="band-maroon relative overflow-hidden rounded-[2rem] border border-[#f7d27a]/30 p-8 text-center shadow-deep sm:p-14">
          <div className="paisley-edge pointer-events-none absolute inset-x-0 top-0 h-5 opacity-70" />
          <Star className="relative mx-auto h-8 w-8 text-[#f7d27a]" fill="currentColor" />
          <h2 className="display relative mt-4 text-4xl text-ivory sm:text-5xl">Begin with a <em className="gold-text not-italic">free Kundli</em></h2>
          <p className="relative mx-auto mt-3 max-w-xl text-mist">No sign-up needed for your first chart. Upgrade to a detailed report any time.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={s.tool_kundli === "on" ? "/kundli" : "/reports"} className="btn-gold">
              Make my Kundli <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/reports" className="btn-ghost">Browse reports</Link>
          </div>
        </div>
      </Section>
    </>
  );
}

/** Auto-scrolling (marquee) + swipeable carousel of rashi medallions — navy discs with gold signs, like a zodiac wheel. */
function RashiCarousel() {
  const card = (z: (typeof SIGNS)[number], k: string) => (
    <Link key={k} href={`/horoscope?sign=${z.key}`} className="group flex w-[9.5rem] shrink-0 flex-col items-center rounded-[1.75rem] border border-[#f7d27a]/25 bg-white/[.06] px-3 pb-5 pt-4 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#f7d27a]/70 hover:bg-white/[.12] sm:w-44">
      <span className="relative transition duration-700 group-hover:rotate-[360deg]">
        <ZodiacMedallion sign={z.key} className="h-24 w-24 sm:h-28 sm:w-28" />
        <span className="absolute inset-0 rounded-full opacity-0 shadow-[0_0_30px_6px_rgba(242,194,75,.55)] transition group-hover:opacity-100" />
      </span>
      <span className="mt-3 font-display text-xl text-ivory">{z.en}</span>
      <span className="font-deva text-sm text-[#f3c262]">{z.hi}</span>
      <span className="mt-1 text-[10px] text-mist">{z.dates}</span>
      <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#f7d27a]/40 px-3 py-1 text-[11px] text-[#f7d27a] transition group-hover:bg-[#f7d27a] group-hover:text-maroon">Today <ArrowRight className="h-3 w-3" /></span>
    </Link>
  );
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:mx-0">
      <div className="mask-fade-x w-max">
        <div className="marquee flex w-max gap-3 px-4 py-3" style={{ ["--marquee" as string]: "60s" }}>
          {SIGNS.map((z) => card(z, z.key))}
          {SIGNS.map((z) => card(z, `${z.key}-2`))}
        </div>
      </div>
    </div>
  );
}

/** Headline words rise in one by one; the last word gets the shimmering gold italic. */
function WordReveal({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.15 + i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn("inline-block", i === words.length - 1 && "gold-text gold-shine italic")}
        >
          {w}
          {i < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </>
  );
}

const FAQ = [
  { q: "How accurate are the reports?", a: "Calculations use the Lahiri ayanamsha with precise planetary positions for your exact birth time, date and place (latitude, longitude and historical time zone). The more exact your birth time, the more precise your Lagna and dasha periods." },
  { q: "How soon will I get my PDF?", a: "Usually within a minute or two after payment. You'll see it on the order page, under My Reports, and we email it to you as well." },
  { q: "I don't know my exact birth time. Can I still order?", a: "Yes — use your best estimate. Matching (Guna Milan) depends mainly on the Moon's position and is less sensitive to small time differences than the Lagna." },
  { q: "Is my data safe?", a: "Your birth details, contact information and reports are encrypted at rest. Reports are stored privately and can only be downloaded from your logged-in account." },
  { q: "What if something goes wrong with my report?", a: "If a report can't be generated we retry automatically and, if it still fails, refund you in full. You can also reach support any time from the Contact page." },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border transition", open ? "border-gold/30 bg-gold/[.04]" : "border-ink/[.08] bg-ink/[.02]")}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-display text-xl text-ivory">{q}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-gold transition", open && "rotate-180")} />
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
        <p className="px-5 pb-5 text-sm leading-relaxed text-mist">{a}</p>
      </motion.div>
    </div>
  );
}

/** Palm reading spotlight: price + "click your palm" CTA with an animated palm scan. */
function PalmPromo({ s }: { s: ServiceCardData }) {
  const off = s.mrp && s.mrp > s.price ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;
  return (
    <Section className="pb-24">
      <div className="band-maroon relative overflow-hidden rounded-[2rem] border border-[#f7d27a]/30 p-6 shadow-deep sm:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden"><Meteors number={8} className="meteor-gold" /></div>
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow !text-[#f7d27a]">New · हस्तरेखा</p>
            <h2 className="display mt-2 text-4xl text-[#fff4e2] sm:text-5xl">Your palm, <em className="gold-text">read in minutes</em></h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#f2d9bd]">
              Click a photo of your palm with your phone — or pick one from your gallery. Get a detailed palm reading PDF: lines, mounts, personality, career, money, love, marriage & health, in Hindi or English.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-[#fbe7b8] sm:grid-cols-2">
              {s.features.slice(0, 6).map((f) => (
                <li key={f} className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-[#f7d27a]" /> {f}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="font-display text-5xl leading-none text-[#ffe9b3]">{inr(s.price)}</span>
              {s.mrp && s.mrp > s.price && <span className="pb-1 text-lg text-[#e8c9aa] line-through">{inr(s.mrp)}</span>}
              {off > 0 && <span className="mb-1 rounded-full bg-emerald px-3 py-1 text-xs font-bold text-white">{off}% OFF</span>}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href={`/reports/${s.slug}#order`} className="btn-gold justify-center text-[15px]"><Camera className="h-5 w-5" /> Click your palm photo</Link>
              <Link href={`/reports/${s.slug}#order`} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f7d27a]/40 px-6 py-3 text-[15px] font-semibold text-[#fbe7b8] transition hover:bg-white/10"><ImageIcon className="h-5 w-5" /> Upload from gallery</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[330px] py-4">
            <div className="absolute inset-0 animate-glow rounded-full bg-[radial-gradient(circle,rgba(255,200,100,.45),transparent_65%)] blur-xl" />
            {/* phone-camera look: the palm inside a viewfinder */}
            <div className="relative mx-auto w-[78%] rounded-[2.2rem] border-[6px] border-[#2b0710] bg-gradient-to-b from-[#fff6e6] to-[#f7dfb5] p-5 shadow-deep">
              <span className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[#2b0710]/70" />
              <PalmArt className="mx-auto mt-3 w-full" scan frame labels />
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border-4 border-[#6e122a]/25 bg-white shadow"><Camera className="h-5 w-5 text-[#6e122a]" /></span>
              </div>
            </div>
            <span className="absolute -left-1 top-10 rounded-full border border-[#f7d27a]/40 bg-[#5a0f22]/85 px-3 py-1 text-xs text-[#fbe7b8] backdrop-blur">📸 हथेली की फ़ोटो भेजें</span>
            <span className="absolute -right-1 bottom-16 rounded-full border border-[#f7d27a]/40 bg-[#5a0f22]/85 px-3 py-1 text-xs text-[#fbe7b8] backdrop-blur">✓ PDF in minutes</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** Popular catalogue tools (dosha, muhurat, dasha, vastu…) with a link to all of them. */
function MoreTools() {
  const s = useSite() as unknown as Record<string, string>;
  const off = toolsOff(s.tools_off);
  const list = TOOLS.filter((t) => t.popular && !off.has(t.slug)).slice(0, 9);
  if (!list.length) return null;
  const total = TOOLS.filter((t) => !off.has(t.slug)).length;
  return (
    <Section className="pb-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{total}+ free tools · मुफ़्त टूल</p>
          <h2 className="display mt-2 text-3xl text-ivory sm:text-4xl">Dosha, muhurat, <em className="gold-text not-italic">remedies</em> & more</h2>
        </div>
        <Link href="/tools" className="btn-ghost hidden sm:inline-flex">All tools <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => <ToolCard key={t.slug} t={t} i={i} />)}
      </div>
      <div className="mt-6 text-center sm:hidden"><Link href="/tools" className="btn-gold inline-flex">All {total} tools · सभी टूल <ArrowRight className="h-4 w-4" /></Link></div>
    </Section>
  );
}
