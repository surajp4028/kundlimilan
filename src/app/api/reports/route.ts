import { ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { listUserReports } from "@/lib/server/orders";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ reports: await listUserReports(user.uid) });
});
