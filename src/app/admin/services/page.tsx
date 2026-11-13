import { guardPage } from "@/lib/server/admin/guard";
import { ServicesView } from "@/components/admin/services";
import { Forbidden } from "@/components/admin/ui";

export default async function Page() {
  const { allowed } = await guardPage("services.manage");
  return allowed ? <ServicesView /> : <Forbidden />;
}
