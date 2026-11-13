import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/server/session";
import { SiteShell } from "@/components/site/shell";
import { AccountView } from "@/components/site/account-view";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const u = await getSessionUser();
  if (!u) redirect("/login?next=/account");
  return (
    <SiteShell>
      <Suspense>
        <AccountView />
      </Suspense>
    </SiteShell>
  );
}
