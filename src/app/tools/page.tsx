import { PageHero, SiteShell } from "@/components/site/shell";
import { ToolsHub } from "@/components/astro/tools-hub";
import { getSetting } from "@/lib/server/settings";
import { toolsOff } from "@/lib/tools-catalog";

export const metadata = {
  title: "All Astrology Tools",
  description: "Manglik, Kaal Sarp, Sade Sati, Shubh Muhurat, Choghadiya, Dasha, Lal Kitab, Gemstone, Vastu, divisional charts and more — free, in Hindi and English.",
};

export default async function Page() {
  const off = [...toolsOff(await getSetting("tools_off"))];
  return (
    <SiteShell>
      <PageHero eyebrow="Free tools · मुफ़्त टूल" title="Every answer," accent="one place" subtitle="Dosha checks, muhurat, dasha, remedies, Lal Kitab, Vastu and more — in Hindi or English." />
      <ToolsHub off={off} />
    </SiteShell>
  );
}
