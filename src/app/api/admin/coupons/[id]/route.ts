import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { exec, queryOne } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { couponInput, couponValues } from "../schema";

type Ctx = { params: Promise<{ id: string }> };
const cid = (s: string) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "BAD_ID", "Invalid id");
  return n;
};

export const PUT = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("coupons.manage");
  const id = cid((await params).id);
  const b = await readJson(req, couponInput);
  const other = await queryOne<{ id: number }>("SELECT id FROM coupons WHERE code = ?", [b.code]);
  if (other && other.id !== id) throw new ApiError(409, "CODE_TAKEN", "This code already exists.");
  const r = await exec(
    `UPDATE coupons SET code=?, title=?, discount_type=?, value=?, max_discount=?, min_order=?, service_slug=?, per_user_limit=?, total_limit=?, user_uid=?, status=?, starts_at=?, expires_at=? WHERE id = ?`,
    [...couponValues(b), id],
  );
  if (!r.affectedRows) throw new ApiError(404, "NOT_FOUND", "Coupon not found");
  await audit({ actorType: "admin", actorId: a.id, action: "coupon.update", targetType: "coupon", targetId: id, ip: getClientIp(req.headers), meta: { code: b.code, status: b.status } });
  return ok({});
});

export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("coupons.manage");
  const id = cid((await params).id);
  const used = await queryOne<{ n: number }>("SELECT COUNT(*) n FROM coupon_redemptions WHERE coupon_id = ? AND status IN ('reserved','used')", [id]);
  if (Number(used?.n || 0) > 0) {
    await exec("UPDATE coupons SET status = 'paused' WHERE id = ?", [id]);
    return ok({ paused: true });
  }
  await exec("DELETE FROM coupons WHERE id = ?", [id]);
  await audit({ actorType: "admin", actorId: a.id, action: "coupon.delete", targetType: "coupon", targetId: id, ip: getClientIp(req.headers) });
  return ok({ deleted: true });
});
