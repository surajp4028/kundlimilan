import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { PanchangTool } from "@/components/astro/daily";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Today's Panchang", description: "Tithi, nakshatra, yoga, karana, sunrise, Rahu kaal and Abhijit muhurat for your city." };
export default async function Page() {
  if ((await getSetting("tool_panchang")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Hindu calendar" title="Today's" accent="Panchang" subtitle="Tithi, nakshatra, yoga, karana and auspicious timings for your city." />
      <PanchangTool />
    </SiteShell>
  );
}
