import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { getService, listAllServices, saveService, serviceInput } from "@/lib/server/services";
import { query } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";

export const GET = route(async () => {
  await requireAdmin("services.manage");
  const stats = await query<{ service_slug: string; n: number; revenue: number }>(
    "SELECT service_slug, COUNT(*) n, COALESCE(SUM(amount_paise),0) revenue FROM orders WHERE payment_status = 'paid' GROUP BY service_slug",
  );
  const map = new Map(stats.map((s) => [s.service_slug, { orders: Number(s.n), revenue: Number(s.revenue) }]));
  return ok({ services: (await listAllServices()).map((s) => ({ ...s, stats: map.get(s.slug) || { orders: 0, revenue: 0 } })) });
});

export const POST = route(async (req: NextRequest) => {
  const a = await requireAdmin("services.manage");
  const body = await readJson(req, serviceInput);
  if (await getService(body.slug)) throw new ApiError(409, "SLUG_TAKEN", "Another report already uses this slug.");
  const id = await saveService(body, a.id);
  await audit({ actorType: "admin", actorId: a.id, action: "service.create", targetType: "service", targetId: id, ip: getClientIp(req.headers), meta: { slug: body.slug, price: body.price } });
  return ok({ id });
});
