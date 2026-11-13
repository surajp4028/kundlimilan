import type { NextRequest } from "next/server";
import { ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { listOrders } from "@/lib/server/admin/queries";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin("orders.view");
  return ok(await listOrders(req.nextUrl.searchParams));
});
