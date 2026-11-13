import "server-only";
import { exec, query, queryOne } from "../db";
import { blindIndex, decrypt, isUid } from "../crypto";
import { maskEmail, maskPhone, parseIdentifier } from "../validators";

/*
 * Admin-only read models. Data is stored KMS-encrypted; values are decrypted here
 * for authorised agents. Admins (and staff with `users.contact`) see full values;
 * other staff get masked contact details.
 * Search is exact-match through blind indexes (encrypted data can't be LIKE-searched).
 */

export function paging(sp: URLSearchParams, defSize = 20) {
  const page = Math.max(1, Math.min(10_000, parseInt(sp.get("page") || "1", 10) || 1));
  const size = Math.max(5, Math.min(100, parseInt(sp.get("size") || String(defSize), 10) || defSize));
  return { page, size, offset: (page - 1) * size };
}

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]{3,45}$/i;

async function contact(emailEnc: string | null, phoneEnc: string | null, full: boolean) {
  const [email, phone] = await Promise.all([decrypt(emailEnc), decrypt(phoneEnc)]);
  return {
    email: email ? (full ? email : maskEmail(email)) : null,
    phone: phone ? (full ? phone : maskPhone(phone)) : null,
  };
}

/** Builds a WHERE clause for user search: ASTRO id, email, mobile, IP or exact full name. */
function userSearch(q: string, alias = "u") {
  const v = q.trim();
  if (!v) return null;
  if (isUid(v)) return { sql: `${alias}.uid = ?`, params: [v.toUpperCase()] };
  const id = parseIdentifier(v);
  if (id) return { sql: `${alias}.${id.channel === "email" ? "email_bidx" : "phone_bidx"} = ?`, params: [blindIndex(id.channel, id.value)] };
  if (IP_RE.test(v)) return { sql: `${alias}.last_login_ip_bidx = ?`, params: [blindIndex("ip", v)] };
  return { sql: `${alias}.name_bidx = ?`, params: [blindIndex("name", v)] };
}

export async function dashboardStats(full: boolean) {
  const [u] = await query<{ total: number; active: number; today: number; week: number }>(
    `SELECT COUNT(*) total, SUM(status='active') active,
            SUM(created_at >= UTC_DATE()) today, SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) week FROM users`,
  );
  const [s] = await query<{ live: number; logins24: number }>(
    `SELECT SUM(revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() AND last_seen_at > UTC_TIMESTAMP() - INTERVAL 30 MINUTE) live,
            SUM(created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY) logins24 FROM user_sessions`,
  );
  const [o] = await query<{ paid: number; revenue: number; today_rev: number; today_n: number; month_rev: number; ready: number; failed: number; generating: number; refunded: number }>(
    `SELECT SUM(payment_status IN ('paid','refunded')) paid,
            COALESCE(SUM(CASE WHEN payment_status='paid' THEN amount_paise END),0) revenue,
            COALESCE(SUM(CASE WHEN payment_status='paid' AND paid_at >= UTC_DATE() THEN amount_paise END),0) today_rev,
            SUM(payment_status='paid' AND paid_at >= UTC_DATE()) today_n,
            COALESCE(SUM(CASE WHEN payment_status='paid' AND paid_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY THEN amount_paise END),0) month_rev,
            SUM(report_status='ready') ready, SUM(payment_status='paid' AND report_status='failed') failed,
            SUM(report_status='generating') generating, SUM(status='refunded') refunded
       FROM orders`,
  );
  const byService = await query<{ service: string; title: string; n: number; revenue: number }>(
    `SELECT service_slug service, MAX(title) title, COUNT(*) n, COALESCE(SUM(amount_paise),0) revenue
       FROM orders WHERE payment_status='paid' GROUP BY service_slug ORDER BY revenue DESC`,
  );
  const daily = await query<{ d: string; n: number; revenue: number }>(
    `SELECT DATE_FORMAT(paid_at + INTERVAL 330 MINUTE, '%Y-%m-%d') d, COUNT(*) n, COALESCE(SUM(amount_paise),0) revenue FROM orders
      WHERE payment_status='paid' AND paid_at >= UTC_DATE() - INTERVAL 13 DAY GROUP BY d ORDER BY d`,
  );
  const signups = await query<{ d: string; n: number }>(
    `SELECT DATE_FORMAT(created_at + INTERVAL 330 MINUTE, '%Y-%m-%d') d, COUNT(*) n FROM users
      WHERE created_at >= UTC_DATE() - INTERVAL 13 DAY GROUP BY d ORDER BY d`,
  );
  const [api] = await query<{ calls: number; cached: number; pdf: number; errors: number }>(
    `SELECT SUM(kind='json' AND outcome IN ('ok','error')) calls, SUM(outcome='cache') cached, SUM(kind='pdf' AND outcome='ok') pdf, SUM(outcome='error') errors
       FROM astro_api_calls WHERE created_at >= UTC_DATE()`,
  );
  const recentOrders = await query<{ order_ref: string; title: string; status: string; report_status: string; amount_paise: number; created_at: Date; user_uid: string; name_enc: string | null; user_id: number }>(
    `SELECT o.order_ref, o.title, o.status, o.report_status, o.amount_paise, o.created_at, o.user_uid, u.name_enc, u.id user_id
       FROM orders o JOIN users u ON u.uid = o.user_uid WHERE o.payment_status <> 'unpaid' ORDER BY o.id DESC LIMIT 8`,
  );
  const recentRows = await query<{ id: number; uid: string; name_enc: string | null; email_enc: string | null; phone_enc: string | null; last_location_enc: string | null; created_at: Date }>(
    "SELECT id, uid, name_enc, email_enc, phone_enc, last_location_enc, created_at FROM users ORDER BY id DESC LIMIT 6",
  );
  const recent = await Promise.all(
    recentRows.map(async (r) => ({
      id: r.id, uid: r.uid, name: (await decrypt(r.name_enc)) || null, location: (await decrypt(r.last_location_enc)) || null, created_at: r.created_at,
      ...(await contact(r.email_enc, r.phone_enc, full)),
    })),
  );
  const n = (v: unknown) => Number(v || 0);
  return {
    users: { total: n(u?.total), active: n(u?.active), today: n(u?.today), week: n(u?.week) },
    sessions: { live: n(s?.live), logins24: n(s?.logins24) },
    orders: { paid: n(o?.paid), revenuePaise: n(o?.revenue), todayRevenuePaise: n(o?.today_rev), todayCount: n(o?.today_n), monthRevenuePaise: n(o?.month_rev), ready: n(o?.ready), failed: n(o?.failed), generating: n(o?.generating), refunded: n(o?.refunded) },
    api: { calls: n(api?.calls), cached: n(api?.cached), pdf: n(api?.pdf), errors: n(api?.errors) },
    byService: byService.map((r) => ({ service: r.service, title: r.title, count: n(r.n), revenuePaise: n(r.revenue) })),
    daily: daily.map((r) => ({ date: r.d, count: n(r.n), revenuePaise: n(r.revenue) })),
    signups: signups.map((r) => ({ date: r.d, count: n(r.n) })),
    recentOrders: await Promise.all(recentOrders.map(async ({ name_enc, ...r }) => ({ ...r, name: (await decrypt(name_enc)) || null }))),
    recent,
  };
}

export async function listUsers(sp: URLSearchParams, full: boolean) {
  const { page, size, offset } = paging(sp);
  const where: string[] = [];
  const params: (string | number)[] = [];
  const search = userSearch((sp.get("q") || "").slice(0, 100));
  if (search) {
    where.push(search.sql);
    params.push(...search.params);
  }
  const status = sp.get("status");
  if (status === "active" || status === "inactive" || status === "blocked") {
    where.push("u.status = ?");
    params.push(status);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) n FROM users u ${w}`, params))?.n ?? 0;
  const rows = await query<{
    id: number; uid: string; name_enc: string | null; email_enc: string | null; phone_enc: string | null; email_verified_at: Date | null; phone_verified_at: Date | null;
    status: string; signup_method: string; last_login_at: Date | null; last_login_ip_enc: string | null; last_location_enc: string | null; last_device_enc: string | null;
    created_at: Date; active_sessions: number; orders: number; spent: number; has_avatar: number; avatar_updated_at: Date | null;
  }>(
    `SELECT u.id, u.uid, u.name_enc, u.email_enc, u.phone_enc, u.email_verified_at, u.phone_verified_at, u.status, u.signup_method,
            u.last_login_at, u.last_login_ip_enc, u.last_location_enc, u.last_device_enc, u.created_at,
            (u.avatar_key_enc IS NOT NULL) has_avatar, u.avatar_updated_at,
            (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()) active_sessions,
            (SELECT COUNT(*) FROM orders o WHERE o.user_uid = u.uid AND o.payment_status <> 'unpaid') orders,
            (SELECT COALESCE(SUM(o.amount_paise),0) FROM orders o WHERE o.user_uid = u.uid AND o.payment_status = 'paid') spent
       FROM users u ${w} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );
  const users = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      uid: r.uid,
      name: (await decrypt(r.name_enc)) || null,
      ...(await contact(r.email_enc, r.phone_enc, full)),
      email_verified_at: r.email_verified_at,
      phone_verified_at: r.phone_verified_at,
      status: r.status,
      signup_method: r.signup_method,
      last_login_at: r.last_login_at,
      last_login_ip: (await decrypt(r.last_login_ip_enc)) || null,
      last_location: (await decrypt(r.last_location_enc)) || null,
      last_device: (await decrypt(r.last_device_enc)) || null,
      created_at: r.created_at,
      active_sessions: Number(r.active_sessions),
      orders: Number(r.orders),
      spent: Number(r.spent),
      avatar: r.has_avatar ? adminAvatarUrl(r.id, r.avatar_updated_at) : null,
    })),
  );
  return { users, total: Number(total), page, size };
}

export async function getUserDetail(id: number, full: boolean) {
  const u = await queryOne<{
    id: number; uid: string; name_enc: string | null; email_enc: string | null; phone_enc: string | null; email_verified_at: Date | null; phone_verified_at: Date | null;
    status: string; signup_method: string; consent_at: Date | null; consent_version: string | null; signup_ip_enc: string | null; last_login_at: Date | null;
    last_login_ip_enc: string | null; last_location_enc: string | null; last_device_enc: string | null; created_at: Date; has_avatar: number; avatar_updated_at: Date | null;
  }>(
    `SELECT id, uid, name_enc, email_enc, phone_enc, email_verified_at, phone_verified_at, status, signup_method, consent_at, consent_version,
            signup_ip_enc, last_login_at, last_login_ip_enc, last_location_enc, last_device_enc, created_at,
            (avatar_key_enc IS NOT NULL) has_avatar, avatar_updated_at FROM users WHERE id = ?`,
    [id],
  );
  if (!u) return null;
  const sessRows = await query<{
    id: number; ip_enc: string | null; location_enc: string | null; device_enc: string | null; user_agent_enc: string | null; client: string; login_method: string;
    created_at: Date; last_seen_at: Date; expires_at: Date; revoked_at: Date | null; revoked_reason: string | null; active: number;
  }>(
    `SELECT id, ip_enc, location_enc, device_enc, user_agent_enc, client, login_method, created_at, last_seen_at, expires_at, revoked_at, revoked_reason,
            (revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()) AS active
       FROM user_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [id],
  );
  const orderRows = await query<{ order_ref: string; service_slug: string; title: string; status: string; payment_status: string; report_status: string; subject_enc: string | null; amount_paise: number; created_at: Date }>(
    "SELECT order_ref, service_slug, title, status, payment_status, report_status, subject_enc, amount_paise, created_at FROM orders WHERE user_uid = ? ORDER BY id DESC LIMIT 50",
    [u.uid],
  );
  const profiles = await query<{ n: number }>("SELECT COUNT(*) n FROM birth_profiles WHERE user_id = ?", [u.id]);
  return {
    user: {
      id: u.id,
      uid: u.uid,
      name: (await decrypt(u.name_enc)) || null,
      ...(await contact(u.email_enc, u.phone_enc, full)),
      email_verified_at: u.email_verified_at,
      phone_verified_at: u.phone_verified_at,
      status: u.status,
      signup_method: u.signup_method,
      consent_at: u.consent_at,
      consent_version: u.consent_version,
      signup_ip: (await decrypt(u.signup_ip_enc)) || null,
      last_login_at: u.last_login_at,
      last_login_ip: (await decrypt(u.last_login_ip_enc)) || null,
      last_location: (await decrypt(u.last_location_enc)) || null,
      last_device: (await decrypt(u.last_device_enc)) || null,
      created_at: u.created_at,
      avatar: u.has_avatar ? adminAvatarUrl(u.id, u.avatar_updated_at) : null,
    },
    sessions: await Promise.all(
      sessRows.map(async ({ ip_enc, location_enc, device_enc, user_agent_enc, ...r }) => ({
        ...r,
        active: Number(r.active),
        ip: await decrypt(ip_enc),
        location: (await decrypt(location_enc)) || null,
        device: (await decrypt(device_enc)) || "Unknown",
        user_agent: await decrypt(user_agent_enc),
      })),
    ),
    orders: await Promise.all(orderRows.map(async ({ subject_enc, ...o }) => ({ ...o, subject: (await decrypt(subject_enc)) || null }))),
    profileCount: Number(profiles[0]?.n || 0),
  };
}

export async function listSessions(sp: URLSearchParams, full: boolean) {
  const { page, size, offset } = paging(sp, 25);
  const kind = sp.get("kind") === "admin" ? "admin" : "user";
  const onlyActive = sp.get("active") === "1";
  const q = (sp.get("q") || "").trim().slice(0, 100);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (onlyActive) where.push("s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()");
  if (q) {
    if (IP_RE.test(q) && !/^\d{10}$/.test(q)) {
      where.push("s.ip_bidx = ?");
      params.push(blindIndex("ip", q));
    } else if (kind === "admin") {
      where.push("a.email_bidx = ?");
      params.push(blindIndex("email", q));
    } else {
      const s = userSearch(q, "u");
      if (s) {
        where.push(s.sql);
        params.push(...s.params);
      }
    }
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const from = kind === "admin" ? `FROM admin_sessions s JOIN admins a ON a.id = s.admin_id ${w}` : `FROM user_sessions s JOIN users u ON u.id = s.user_id ${w}`;
  const cols =
    kind === "admin"
      ? "a.id AS owner_id, a.name_enc, a.email_enc, NULL AS phone_enc, a.role AS ref, 'web' AS client, 'password' AS login_method"
      : "u.id AS owner_id, u.name_enc, u.email_enc, u.phone_enc, u.uid AS ref, s.client, s.login_method";
  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) n ${from}`, params))?.n ?? 0;
  const rows = await query<{
    id: number; owner_id: number; name_enc: string | null; email_enc: string | null; phone_enc: string | null; ref: string; client: string; login_method: string;
    ip_enc: string | null; location_enc: string | null; device_enc: string | null; created_at: Date; last_seen_at: Date; expires_at: Date; revoked_at: Date | null; revoked_reason: string | null; active: number;
  }>(
    `SELECT s.id, ${cols}, s.ip_enc, s.location_enc, s.device_enc, s.created_at, s.last_seen_at, s.expires_at, s.revoked_at, s.revoked_reason,
            (s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()) AS active ${from} ORDER BY s.id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );
  const sessions = await Promise.all(
    rows.map(async (r) => {
      const c = await contact(r.email_enc, r.phone_enc, full || kind === "admin");
      return {
        id: r.id,
        owner_id: r.owner_id,
        name: (await decrypt(r.name_enc)) || null,
        contact: c.email || (c.phone ? `+91 ${c.phone}` : null),
        ref: r.ref,
        client: r.client,
        login_method: r.login_method,
        ip: await decrypt(r.ip_enc),
        location: (await decrypt(r.location_enc)) || null,
        device: (await decrypt(r.device_enc)) || "Unknown",
        created_at: r.created_at,
        last_seen_at: r.last_seen_at,
        revoked_at: r.revoked_at,
        revoked_reason: r.revoked_reason,
        active: Number(r.active),
      };
    }),
  );
  return { kind, sessions, total: Number(total), page, size };
}

export async function listOrders(sp: URLSearchParams) {
  await exec("UPDATE orders SET status = 'cancelled' WHERE status = 'pending' AND payment_status = 'unpaid' AND hold_expires_at < UTC_TIMESTAMP() - INTERVAL 30 MINUTE");
  const { page, size, offset } = paging(sp);
  const where: string[] = [];
  const params: (string | number)[] = [];
  const st = sp.get("status");
  if (st && ["pending", "paid", "completed", "failed", "cancelled", "refunded"].includes(st)) {
    where.push("o.status = ?");
    params.push(st);
  } else if (st === "action") {
    where.push("o.payment_status = 'paid' AND o.report_status <> 'ready' AND o.status <> 'refunded'");
  } else if (st === "refund_pending") {
    where.push("EXISTS (SELECT 1 FROM refunds r WHERE r.order_ref = o.order_ref AND r.status = 'pending')");
  } else if (st !== "all_incl_unpaid") {
    where.push("NOT (o.status = 'cancelled' AND o.payment_status = 'unpaid')");
  }
  const svc = sp.get("service");
  if (svc && /^[a-z0-9-]{2,48}$/.test(svc)) {
    where.push("o.service_slug = ?");
    params.push(svc);
  }
  const range = sp.get("range");
  if (range === "today") where.push("o.created_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY");
  else if (range === "7d") where.push("o.created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY");
  else if (range === "30d") where.push("o.created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY");
  const q = (sp.get("q") || "").trim().slice(0, 60);
  if (q) {
    if (isUid(q)) {
      where.push("o.user_uid = ?");
      params.push(q.toUpperCase());
    } else if (/^pay_[A-Za-z0-9]+$/.test(q)) {
      where.push("o.pay_payment_id = ?");
      params.push(q);
    } else if (/^order_[A-Za-z0-9]+$/.test(q)) {
      where.push("o.pay_order_id = ?");
      params.push(q);
    } else {
      where.push("o.order_ref = ?");
      params.push(q.toUpperCase());
    }
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) n FROM orders o ${w}`, params))?.n ?? 0;
  const rows = await query<{
    id: number; order_ref: string; service_slug: string; title: string; subject_enc: string | null; status: string; payment_status: string; report_status: string; report_attempts: number;
    report_error: string | null; language: string; price_paise: number; discount_paise: number; amount_paise: number; coupon_code: string | null; pay_method: string | null; pay_payment_id: string | null;
    paid_at: Date | null; created_at: Date; user_id: number; user_uid: string; user_name_enc: string | null; refund_processed: number | null; refund_pending: number | null;
  }>(
    `SELECT o.id, o.order_ref, o.service_slug, o.title, o.subject_enc, o.status, o.payment_status, o.report_status, o.report_attempts, o.report_error, o.language,
            o.price_paise, o.discount_paise, o.amount_paise, o.coupon_code, o.pay_method, o.pay_payment_id, o.paid_at, o.created_at, u.id AS user_id, o.user_uid, u.name_enc AS user_name_enc,
            (SELECT SUM(r.amount_paise) FROM refunds r WHERE r.order_ref = o.order_ref AND r.status = 'processed') AS refund_processed,
            (SELECT SUM(r.amount_paise) FROM refunds r WHERE r.order_ref = o.order_ref AND r.status = 'pending') AS refund_pending
       FROM orders o JOIN users u ON u.uid = o.user_uid ${w} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );
  const orders = await Promise.all(
    rows.map(async ({ subject_enc, user_name_enc, refund_processed, refund_pending, ...r }) => ({
      ...r,
      subject: (await decrypt(subject_enc)) || null,
      user_name: (await decrypt(user_name_enc)) || null,
      refund: { processed: Number(refund_processed || 0), pending: Number(refund_pending || 0) },
    })),
  );
  const [chips] = await query<Record<string, number>>(
    `SELECT SUM(NOT (status='cancelled' AND payment_status='unpaid')) \`all\`, SUM(status='completed') completed, SUM(status='paid') paid, SUM(status='pending') pending,
            SUM(status='failed') failed, SUM(status='cancelled' AND payment_status <> 'unpaid') cancelled, SUM(status='refunded') refunded,
            SUM(payment_status='paid' AND report_status <> 'ready' AND status <> 'refunded') action,
            SUM(EXISTS (SELECT 1 FROM refunds r WHERE r.order_ref = orders.order_ref AND r.status = 'pending')) refund_pending
       FROM orders`,
  );
  return { orders, total: Number(total), page, size, counts: Object.fromEntries(Object.entries(chips || {}).map(([k, v]) => [k, Number(v || 0)])) as Record<string, number> };
}

export async function listAudit(sp: URLSearchParams) {
  const { page, size, offset } = paging(sp, 30);
  const where: string[] = [];
  const params: (string | number)[] = [];
  const actor = sp.get("actor");
  if (actor === "user" || actor === "admin" || actor === "system") {
    where.push("l.actor_type = ?");
    params.push(actor);
  }
  const action = (sp.get("action") || "").trim().slice(0, 40);
  if (action) {
    where.push("l.action LIKE ?");
    params.push(`${action.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) n FROM audit_logs l ${w}`, params))?.n ?? 0;
  const rows = await query<{
    id: number; actor_type: string; actor_id: number | null; action: string; target_type: string | null; target_id: string | null; ip_enc: string | null; meta_enc: string | null;
    created_at: Date; admin_name_enc: string | null; user_name_enc: string | null; user_uid: string | null;
  }>(
    `SELECT l.id, l.actor_type, l.actor_id, l.action, l.target_type, l.target_id, l.ip_enc, l.meta_enc, l.created_at,
            a.name_enc AS admin_name_enc, u.name_enc AS user_name_enc, u.uid AS user_uid
       FROM audit_logs l
       LEFT JOIN admins a ON l.actor_type = 'admin' AND a.id = l.actor_id
       LEFT JOIN users u ON l.actor_type = 'user' AND u.id = l.actor_id
       ${w} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );
  const logs = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      actor_type: r.actor_type,
      actor_id: r.actor_id,
      actor_name:
        r.actor_type === "admin" ? await decrypt(r.admin_name_enc) : r.actor_type === "user" ? (await decrypt(r.user_name_enc)) || r.user_uid : "system",
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      ip: (await decrypt(r.ip_enc)) || null,
      meta: (await decrypt(r.meta_enc)) || null,
      created_at: r.created_at,
    })),
  );
  return { logs, total: Number(total), page, size };
}

/** Admin-side URL for a customer's private profile photo (served after a users.view check). */
export const adminAvatarUrl = (userId: number, updated: Date | null) => `/api/admin/users/${userId}/avatar?v=${updated ? new Date(updated).getTime() : 0}`;
