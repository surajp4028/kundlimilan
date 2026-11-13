import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { MatchingTool } from "@/components/astro/tools";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Kundli Milan", description: "Ashtakoot Guna Milan — 36-point marriage compatibility with Manglik check." };
export default async function Page() {
  if ((await getSetting("tool_matching")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Guna Milan" title="Kundli" accent="Milan" subtitle="Ashtakoot matching on all 8 kootas (36 gunas) with Manglik compatibility for the bride and groom." />
      <MatchingTool />
    </SiteShell>
  );
}
