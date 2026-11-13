import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { KundliTool } from "@/components/astro/tools";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Free Kundli", description: "Free Janam Kundli with Lagna & Navamsa charts, planets, dasha and Manglik check." };
export default async function Page() {
  if ((await getSetting("tool_kundli")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Janam Kundli" title="Your free" accent="Kundli" subtitle="Lagna & Navamsa charts, planetary positions, current dasha and Manglik check — calculated from your exact birth details." />
      <KundliTool />
    </SiteShell>
  );
}
