import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { exec, query, queryOne } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { couponInput, couponValues } from "./schema";
import type { CouponRow } from "@/lib/server/coupons";

export const GET = route(async () => {
  await requireAdmin("coupons.manage");
  const rows = await query<CouponRow & { reserved: number; used: number; discount: number }>(
    `SELECT c.*, (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.status = 'reserved') reserved,
            (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.status = 'used') used,
            (SELECT COALESCE(SUM(r.discount_paise),0) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.status = 'used') discount
       FROM coupons c ORDER BY c.id DESC`,
  );
  return ok({ coupons: rows.map((c) => ({ ...c, value: Number(c.value), max_discount: c.max_discount != null ? Number(c.max_discount) : null, min_order: c.min_order != null ? Number(c.min_order) : null, reserved: Number(c.reserved), used: Number(c.used), discount: Number(c.discount) })) });
});

export const POST = route(async (req: NextRequest) => {
  const a = await requireAdmin("coupons.manage");
  const b = await readJson(req, couponInput);
  if (await queryOne("SELECT id FROM coupons WHERE code = ?", [b.code])) throw new ApiError(409, "CODE_TAKEN", "This code already exists.");
  const v = couponValues(b);
  const r = await exec(
    `INSERT INTO coupons (code, title, discount_type, value, max_discount, min_order, service_slug, per_user_limit, total_limit, user_uid, status, starts_at, expires_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [...v, a.id],
  );
  await audit({ actorType: "admin", actorId: a.id, action: "coupon.create", targetType: "coupon", targetId: r.insertId, ip: getClientIp(req.headers), meta: { code: b.code } });
  return ok({ id: r.insertId });
});
