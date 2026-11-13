import type { NextRequest } from "next/server";
import { ApiError, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { query, queryOne } from "@/lib/server/db";
import { decrypt } from "@/lib/server/crypto";
import { decryptInput, ORDER_REF_RE, type OrderRow } from "@/lib/server/orders";
import { listOrderAttempts } from "@/lib/server/payments/attempts";
import { listRefunds } from "@/lib/server/payments/refunds";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { can } from "@/lib/permissions";
import { maskEmail, maskPhone } from "@/lib/server/validators";

type Ctx = { params: Promise<{ ref: string }> };

/** Full order view for the console: birth details, payment attempts, provider logs, refunds, report. */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("orders.view");
  const ref = (await params).ref;
  if (!ORDER_REF_RE.test(ref)) throw new ApiError(404, "NOT_FOUND", "Order not found");
  const o = await queryOne<OrderRow & { user_id: number; name_enc: string | null; email_enc: string | null; phone_enc: string | null }>(
    "SELECT o.*, u.id user_id, u.name_enc, u.email_enc, u.phone_enc FROM orders o JOIN users u ON u.uid = o.user_uid WHERE o.order_ref = ?",
    [ref],
  );
  if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found");
  const full = can(a, "users.contact");
  const [email, phone] = [await decrypt(o.email_enc), await decrypt(o.phone_enc)];
  const report = await queryOne<{ size_bytes: number; download_count: number; last_downloaded_at: Date | null; created_at: Date; sha256: string | null }>(
    "SELECT size_bytes, download_count, last_downloaded_at, created_at, sha256 FROM reports WHERE order_ref = ?", [ref]);
  const logs = can(a, "payments.view")
    ? await Promise.all(
        (await query<{ id: number; provider: string; direction: string; action: string; http_status: number | null; outcome: string; external_id: string | null; latency_ms: number | null; request_enc: string | null; response_enc: string | null; created_at: Date }>(
          "SELECT id, provider, direction, action, http_status, outcome, external_id, latency_ms, request_enc, response_enc, created_at FROM payment_logs WHERE order_ref = ? ORDER BY id", [ref],
        )).map(async ({ request_enc, response_enc, ...l }) => ({ ...l, request: (await decrypt(request_enc)) || null, response: (await decrypt(response_enc)) || null })),
      )
    : [];
  await audit({ actorType: "admin", actorId: a.id, action: "order.view", targetType: "order", targetId: ref, ip: getClientIp(req.headers) });
  const { input_enc: _i, subject_enc, name_enc: _n, email_enc: _e, phone_enc: _p, ...rest } = o;
  return ok({
    order: { ...rest, subject: (await decrypt(subject_enc)) || null },
    customer: { id: o.user_id, uid: o.user_uid, name: (await decrypt(o.name_enc)) || null, email: email ? (full ? email : maskEmail(email)) : null, phone: phone ? (full ? phone : maskPhone(phone)) : null },
    input: await decryptInput(o),
    report: report ? { ...report, url: `/api/admin/orders/${ref}/report` } : null,
    attempts: can(a, "payments.view") ? await listOrderAttempts(ref) : [],
    refunds: await listRefunds(ref),
    logs,
  });
});
