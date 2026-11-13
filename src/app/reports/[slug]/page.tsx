import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/shell";
import { ReportDetail } from "@/components/astro/report-detail";
import { getService, listActiveServices, publicService } from "@/lib/server/services";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await getService((await params).slug);
  return s ? { title: s.title, description: s.tagline || undefined } : {};
}

export default async function Page({ params }: P) {
  const s = await getService((await params).slug);
  if (!s || s.status !== "active") notFound();
  const others = (await listActiveServices()).filter((x) => x.slug !== s.slug).slice(0, 3).map(publicService);
  return (
    <SiteShell>
      <ReportDetail s={{ ...publicService(s), description: s.description }} others={others} />
    </SiteShell>
  );
}
