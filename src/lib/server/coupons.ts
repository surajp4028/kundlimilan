import "server-only";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { exec, query, queryOne } from "./db";
import { ApiError } from "./http";

/* =====================================================================
 * Coupons: percent or fixed ₹ off a report. Optional: max discount, minimum order,
 * one report only, per-customer and total limits, start / expiry, personal codes.
 * Reserved under a row lock at order time; counted as used once paid;
 * released automatically when the order expires unpaid or is fully refunded.
 * ===================================================================== */

export type CouponRow = {
  id: number; code: string; title: string | null; discount_type: "percent" | "fixed"; value: string; max_discount: string | null; min_order: string | null;
  service_slug: string | null; per_user_limit: number | null; total_limit: number | null; user_uid: string | null; status: "active" | "paused";
  starts_at: Date | null; expires_at: Date | null; used_count: number; created_at: Date; updated_at: Date;
};

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);

export function discountFor(c: Pick<CouponRow, "discount_type" | "value" | "max_discount">, pricePaise: number) {
  const v = Number(c.value);
  let off = c.discount_type === "percent" ? Math.round((pricePaise * Math.min(100, Math.max(0, v))) / 100) : Math.round(v * 100);
  if (c.max_discount != null && c.discount_type === "percent") off = Math.min(off, Math.round(Number(c.max_discount) * 100));
  // never below ₹1 to pay (Razorpay minimum)
  return Math.max(0, Math.min(off, pricePaise - 100));
}

async function counts(conn: PoolConnection | null, couponId: number, uid: string) {
  const sql = `SELECT
      SUM(status IN ('reserved','used')) AS total,
      SUM(status IN ('reserved','used') AND user_uid = ?) AS mine
    FROM coupon_redemptions WHERE coupon_id = ?`;
  const row = conn
    ? ((await conn.query<RowDataPacket[]>(sql, [uid, couponId]))[0][0] as { total: number | null; mine: number | null })
    : await queryOne<{ total: number | null; mine: number | null }>(sql, [uid, couponId]);
  return { total: Number(row?.total || 0), mine: Number(row?.mine || 0) };
}

function check(c: CouponRow, uid: string, slug: string, pricePaise: number, used: { total: number; mine: number }) {
  const now = Date.now();
  if (c.status !== "active") return "This coupon is not active.";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "This coupon isn't active yet.";
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return "This coupon has expired.";
  if (c.user_uid && c.user_uid !== uid) return "This coupon isn't valid for your account.";
  if (c.service_slug && c.service_slug !== slug) return "This coupon isn't valid for this report.";
  if (c.min_order != null && pricePaise < Math.round(Number(c.min_order) * 100)) return `Valid on orders above ₹${Number(c.min_order)}.`;
  if (c.total_limit != null && used.total >= c.total_limit) return "This coupon has been fully used.";
  if (c.per_user_limit != null && used.mine >= c.per_user_limit) return "You've already used this coupon.";
  if (discountFor(c, pricePaise) <= 0) return "This coupon gives no discount on this report.";
  return null;
}

/** Preview (no reservation). */
export async function previewCoupon(code: string, uid: string, slug: string, pricePaise: number) {
  const c = await queryOne<CouponRow>("SELECT * FROM coupons WHERE code = ?", [normalizeCode(code)]);
  if (!c) throw new ApiError(404, "COUPON_NOT_FOUND", "Coupon code not found.");
  const err = check(c, uid, slug, pricePaise, await counts(null, c.id, uid));
  if (err) throw new ApiError(422, "COUPON_INVALID", err);
  return { code: c.code, title: c.title, discountPaise: discountFor(c, pricePaise) };
}

/** Re-validates and reserves inside the order transaction (row lock prevents over-use). */
export async function reserveCoupon(conn: PoolConnection, p: { code: string; uid: string; slug: string; pricePaise: number; orderRef: string }) {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT * FROM coupons WHERE code = ? FOR UPDATE", [normalizeCode(p.code)]);
  const c = rows[0] as CouponRow | undefined;
  if (!c) throw new ApiError(404, "COUPON_NOT_FOUND", "Coupon code not found.");
  const err = check(c, p.uid, p.slug, p.pricePaise, await counts(conn, c.id, p.uid));
  if (err) throw new ApiError(422, "COUPON_INVALID", err);
  const discountPaise = discountFor(c, p.pricePaise);
  await conn.query("INSERT INTO coupon_redemptions (coupon_id, code, user_uid, order_ref, discount_paise) VALUES (?,?,?,?,?)", [c.id, c.code, p.uid, p.orderRef, discountPaise]);
  return { code: c.code, discountPaise };
}

export async function markCouponUsed(orderRef: string) {
  const r = await exec("UPDATE coupon_redemptions SET status = 'used', used_at = UTC_TIMESTAMP() WHERE order_ref = ? AND status = 'reserved'", [orderRef]);
  if (r.affectedRows) await exec("UPDATE coupons c JOIN coupon_redemptions r ON r.coupon_id = c.id SET c.used_count = c.used_count + 1 WHERE r.order_ref = ?", [orderRef]);
}

export async function releaseCoupon(orderRef: string) {
  const row = await queryOne<{ status: string; coupon_id: number }>("SELECT status, coupon_id FROM coupon_redemptions WHERE order_ref = ?", [orderRef]);
  if (!row || row.status === "released") return;
  await exec("UPDATE coupon_redemptions SET status = 'released' WHERE order_ref = ?", [orderRef]);
  if (row.status === "used") await exec("UPDATE coupons SET used_count = GREATEST(used_count, 1) - 1 WHERE id = ?", [row.coupon_id]);
}

/** Public offers for a customer (active, not personal to someone else). */
export async function listOffers(uid: string | null) {
  const rows = await query<CouponRow>(
    `SELECT * FROM coupons WHERE status = 'active' AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP()) AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
       AND (user_uid IS NULL OR user_uid = ?) AND (total_limit IS NULL OR used_count < total_limit) ORDER BY id DESC LIMIT 20`,
    [uid ?? ""],
  );
  return rows.map((c) => ({
    code: c.code, title: c.title, type: c.discount_type, value: Number(c.value), maxDiscount: c.max_discount != null ? Number(c.max_discount) : null,
    minOrder: c.min_order != null ? Number(c.min_order) : null, service: c.service_slug, personal: !!c.user_uid, expiresAt: c.expires_at,
  }));
}
