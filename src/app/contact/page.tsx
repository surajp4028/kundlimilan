import type { Metadata } from "next";
import { SiteShell } from "@/components/site/shell";
import { ContactView } from "@/components/site/contact-view";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <SiteShell>
      <ContactView />
    </SiteShell>
  );
}
