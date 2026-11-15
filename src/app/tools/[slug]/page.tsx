import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHero, SiteShell } from "@/components/site/shell";
import { ToolRunner } from "@/components/astro/tool-runner";
import { ToolsHub } from "@/components/astro/tools-hub";
import { getSetting } from "@/lib/server/settings";
import { GROUPS, TOOLS, toolBySlug, toolsOff } from "@/lib/tools-catalog";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = toolBySlug((await params).slug);
  return t ? { title: `${t.en} · ${t.hi}`, description: t.blurb } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolBySlug((await params).slug);
  const off = toolsOff(await getSetting("tools_off"));
  if (!tool || off.has(tool.slug)) notFound();
  const g = GROUPS[tool.group];
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-8">
        <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-mist hover:text-gold"><ChevronLeft className="h-4 w-4" /> All tools · सभी टूल</Link>
      </div>
      <PageHero eyebrow={`${g.en} · ${g.hi}`} title={tool.hi} subtitle={`${tool.en} — ${tool.blurbHi}`} />
      <ToolRunner tool={tool} />
      <div className="mt-16">
        <ToolsHub off={[...off]} group={tool.group} exclude={tool.slug} compact />
      </div>
    </SiteShell>
  );
}
