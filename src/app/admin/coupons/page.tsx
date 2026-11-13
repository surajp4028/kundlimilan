import { guardPage } from "@/lib/server/admin/guard";
import { CouponsView } from "@/components/admin/coupons";
import { Forbidden } from "@/components/admin/ui";

export default async function Page() {
  const { allowed } = await guardPage("coupons.manage");
  return allowed ? <CouponsView /> : <Forbidden />;
}
