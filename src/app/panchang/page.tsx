import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { PanchangTool } from "@/components/astro/daily";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Panchang", description: "Panchang for any date — tithi, nakshatra, yoga, karana, Rahu kaal, Abhijit muhurat and which direction is good for travel." };
export default async function Page() {
  if ((await getSetting("tool_panchang")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Hindu calendar" title="Daily" accent="Panchang" subtitle="Any date, your city — auspicious times, travel direction and what each term means." />
      <PanchangTool />
    </SiteShell>
  );
}
