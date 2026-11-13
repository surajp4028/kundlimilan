import type { ReactNode } from "react";
import { PageHero, SiteShell } from "./shell";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <SiteShell>
      <PageHero eyebrow="Legal" title={title} subtitle={`Last updated ${updated}`} />
      <div className="mx-auto max-w-3xl px-4">
        <article className="lux-card prose-lux p-6 sm:p-10 [&_h2:first-child]:mt-0">{children}</article>
      </div>
    </SiteShell>
  );
}
