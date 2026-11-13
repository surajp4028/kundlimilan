import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { getService, getServiceById, saveService, serviceInput } from "@/lib/server/services";
import { exec, queryOne } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";

type Ctx = { params: Promise<{ id: string }> };
const sid = (s: string) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "BAD_ID", "Invalid id");
  return n;
};

export const PUT = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("services.manage");
  const id = sid((await params).id);
  const cur = await getServiceById(id);
  if (!cur) throw new ApiError(404, "NOT_FOUND", "Report not found");
  const body = await readJson(req, serviceInput);
  const other = await getService(body.slug);
  if (other && other.id !== id) throw new ApiError(409, "SLUG_TAKEN", "Another report already uses this slug.");
  await saveService(body, a.id, id);
  await audit({ actorType: "admin", actorId: a.id, action: "service.update", targetType: "service", targetId: id, ip: getClientIp(req.headers), meta: { slug: body.slug, price: body.price, status: body.status, priceBefore: cur.price } });
  return ok({});
});

/** Delete only when no order uses it — otherwise it's disabled (orders keep their history). */
export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("services.manage");
  const id = sid((await params).id);
  const used = await queryOne<{ n: number }>("SELECT COUNT(*) n FROM orders WHERE service_id = ?", [id]);
  if (Number(used?.n || 0) > 0) {
    await exec("UPDATE services SET status = 'disabled' WHERE id = ?", [id]);
    await audit({ actorType: "admin", actorId: a.id, action: "service.disable", targetType: "service", targetId: id, ip: getClientIp(req.headers) });
    return ok({ disabled: true });
  }
  await exec("DELETE FROM services WHERE id = ?", [id]);
  await audit({ actorType: "admin", actorId: a.id, action: "service.delete", targetType: "service", targetId: id, ip: getClientIp(req.headers) });
  return ok({ deleted: true });
});
