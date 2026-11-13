import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Compass, Lock, ScrollText, Sparkles } from "lucide-react";
import { PageHero, Section, SiteShell } from "@/components/site/shell";
import { getPublicSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "About us" };

export default async function Page() {
  const s = await getPublicSettings();
  return (
    <SiteShell>
      <PageHero eyebrow={`About ${s.site_name}`} title="Ancient wisdom," accent="modern clarity" subtitle={s.site_description} />
      <Section>
        <div className="lux-card grid items-center gap-8 overflow-hidden p-6 sm:p-10 md:grid-cols-[1fr_280px]">
          <div className="space-y-4 text-[15px] leading-[1.85] text-ivory-2">
            <p>{s.site_name} brings classical Vedic astrology to your phone — precise calculations from your exact birth time and place, presented with the care a sacred tradition deserves.</p>
            <p>Every chart uses the Lahiri ayanamsha and a historical time-zone correction for your birth place. Our reports are prepared automatically and delivered as beautiful PDFs you can keep, print and share with family.</p>
            <p>We take privacy seriously: your birth details and reports are encrypted and stored only for you.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/reports" className="btn-gold">Explore reports</Link>
              <Link href="/contact" className="btn-ghost">Contact us</Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-[5/6] w-56 sm:w-full">
            <Image src="/brand/ganesh-gold-800.png" alt="Lord Ganesha" fill sizes="280px" className="object-contain" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Compass, t: "Precise", d: "Exact coordinates and historical time zones for every birth place." },
            { i: ScrollText, t: "Detailed", d: "Reports from 8 to 60+ pages — charts, dashas, doshas and remedies." },
            { i: Lock, t: "Private", d: "Encrypted storage; reports downloadable only from your account." },
            { i: Sparkles, t: "Bilingual", d: "Read your reports in English or Hindi." },
          ].map((x) => (
            <div key={x.t} className="lux-card p-5">
              <x.i className="h-6 w-6 text-gold" />
              <div className="mt-3 font-display text-2xl text-ivory">{x.t}</div>
              <p className="mt-1 text-sm text-mist">{x.d}</p>
            </div>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
