import { guardPage } from "@/lib/server/admin/guard";
import { AstroUsage } from "@/components/admin/astro-usage";
import { Forbidden } from "@/components/admin/ui";

export default async function Page() {
  const { allowed } = await guardPage("api.view");
  return allowed ? <AstroUsage /> : <Forbidden />;
}
