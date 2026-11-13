import type { Metadata } from "next";
import { PageHero, Section, SiteShell } from "@/components/site/shell";
import { ServiceCard } from "@/components/astro/service-card";
import { listActiveServices, publicService } from "@/lib/server/services";

export const metadata: Metadata = { title: "Astrology reports", description: "Kundli Milan, Pro Kundli and more — detailed PDF reports from your exact birth details." };

export default async function Page() {
  const services = (await listActiveServices()).map(publicService);
  return (
    <SiteShell>
      <PageHero eyebrow="Premium reports" title="Reports that" accent="reveal" subtitle="Choose a report, share birth details, pay securely — your PDF is ready in minutes and stays in your account forever." />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.slug} s={s} i={i} />
          ))}
        </div>
        {services.length === 0 && <p className="py-20 text-center text-mist">New reports are coming soon.</p>}
      </Section>
    </SiteShell>
  );
}
