import { SiteShell } from "@/components/site/shell";
import { Home } from "@/components/site/home";
import { listActiveServices, publicService } from "@/lib/server/services";

export default async function Page() {
  const services = (await listActiveServices()).map(publicService);
  return (
    <SiteShell>
      <Home services={services} />
    </SiteShell>
  );
}
