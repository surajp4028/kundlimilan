import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/shell";
import { OrderStatus } from "@/components/astro/order-status";
import { getSessionUser } from "@/lib/server/session";
import { orderForUser, publicOrder } from "@/lib/server/orders";

type P = { params: Promise<{ ref: string }> };
export const metadata = { title: "Your order" };

export default async function Page({ params }: P) {
  const ref = (await params).ref;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orders/${encodeURIComponent(ref)}`);
  const o = await orderForUser(ref, user.uid);
  if (!o) redirect("/account?tab=orders");
  return (
    <SiteShell>
      <OrderStatus initial={JSON.parse(JSON.stringify(await publicOrder(o)))} />
    </SiteShell>
  );
}
