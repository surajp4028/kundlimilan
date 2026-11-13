import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { NumerologyTool } from "@/components/astro/tools";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Numerology", description: "Your radical, destiny and name numbers with lucky days, colours and stones." };
export default async function Page() {
  if ((await getSetting("tool_numerology")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Ank jyotish" title="Your" accent="numbers" subtitle="Radical, destiny and name numbers — with lucky days, colours, stones and guidance." />
      <NumerologyTool />
    </SiteShell>
  );
}
