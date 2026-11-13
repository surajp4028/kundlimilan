import { Suspense } from "react";
import { guardPage } from "@/lib/server/admin/guard";
import { OrdersView } from "@/components/admin/orders";
import { Forbidden } from "@/components/admin/ui";

export default async function Page() {
  const { allowed } = await guardPage("orders.view");
  return allowed ? (
    <Suspense>
      <OrdersView />
    </Suspense>
  ) : (
    <Forbidden />
  );
}
