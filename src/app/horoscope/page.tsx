import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHero, SiteShell } from "@/components/site/shell";
import { HoroscopeTool } from "@/components/astro/daily";
import { getSetting } from "@/lib/server/settings";

export const metadata = { title: "Daily Horoscope", description: "Daily, tomorrow's and weekly horoscope for all 12 zodiac signs." };
export default async function Page() {
  if ((await getSetting("tool_horoscope")) !== "on") notFound();
  return (
    <SiteShell>
      <PageHero eyebrow="Rashifal" title="Your daily" accent="horoscope" subtitle="Personal life, career, health, emotions, travel and luck — for today, tomorrow and the week ahead." />
      <Suspense>
        <HoroscopeTool />
      </Suspense>
    </SiteShell>
  );
}
