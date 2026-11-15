import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { env } from "./env";

/* =====================================================================
 * Automatic, idempotent database migrations.
 *
 *  - database/schema.sql          CREATE TABLE IF NOT EXISTS … (the whole schema)
 *  - database/migrations/*.sql    later ALTERs, run once each in name order (tracked in schema_meta)
 *  - default data                 report catalogue, welcome coupon, first admin (INSERT IGNORE)
 *
 * Runs on every Vercel build (`npm run vercel-build` → scripts/migrate.mts) AND lazily on the
 * first DB call of a server instance (safety net). A content hash in schema_meta makes the
 * runtime check a single SELECT once everything is up to date. Safe to run concurrently.
 * ===================================================================== */

const root = process.cwd();
const readSql = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

function migrationFiles() {
  const dir = path.join(root, "database/migrations");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d+[\w-]*\.sql$/.test(f)).sort();
}

async function fingerprint() {
  const h = crypto.createHash("sha256").update(readSql("database/schema.sql"));
  for (const f of migrationFiles()) h.update(f).update(readSql(`database/migrations/${f}`));
  // new default reports must reach existing databases too (they're INSERT IGNORE'd by slug)
  const { DEFAULT_SERVICES } = await import("./services");
  h.update(DEFAULT_SERVICES.map((x) => x.slug).join(","));
  return h.digest("hex").slice(0, 16);
}

async function connect() {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: env.db.ssl ? (env.db.sslCa ? { ca: env.db.sslCa } : { rejectUnauthorized: false }) : undefined,
    multipleStatements: true, // only this private, migration-only connection — never the app pool
    timezone: "Z",
    connectTimeout: 15_000,
  });
  await conn.query("SET time_zone = '+00:00', SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION', SESSION wait_timeout = 120");
  return conn;
}

export type MigrateResult = { ran: boolean; version: string; steps: string[] };

export async function migrate(opts: { force?: boolean; log?: (m: string) => void } = {}): Promise<MigrateResult> {
  const log = opts.log ?? (() => {});
  const version = await fingerprint();
  const conn = await connect();
  const steps: string[] = [];
  try {
    if (!opts.force) {
      const [rows] = await conn.query("SELECT meta_value FROM schema_meta WHERE meta_key = 'schema_hash'").catch(() => [[]]);
      if ((rows as { meta_value: string }[])[0]?.meta_value === version) return { ran: false, version, steps };
    }
    await conn.query(readSql("database/schema.sql"));
    steps.push("schema.sql");
    log("✓ schema applied");

    for (const f of migrationFiles()) {
      const key = `migration:${f}`;
      const [done] = await conn.query("SELECT 1 FROM schema_meta WHERE meta_key = ?", [key]);
      if ((done as unknown[]).length) continue;
      await conn.query(readSql(`database/migrations/${f}`));
      await conn.query("INSERT IGNORE INTO schema_meta (meta_key, meta_value) VALUES (?, ?)", [key, new Date().toISOString()]);
      steps.push(f);
      log(`✓ migration ${f}`);
    }

    // ---- default data (never overwrites what the admin changed) ----
    const { DEFAULT_SERVICES } = await import("./services");
    for (const s of DEFAULT_SERVICES) {
      await conn.query(
        `INSERT IGNORE INTO services (slug, title, title_hi, tagline, description, features, category, input_kind, provider_endpoint, languages, pages_hint,
                                     price_paise, mrp_paise, icon, accent, status, featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [s.slug, s.title, s.titleHi ?? null, s.tagline ?? null, s.description ?? null, JSON.stringify(s.features), s.category, s.inputKind, s.endpoint, s.languages.join(","), s.pagesHint ?? null,
         s.price, s.mrp ?? null, s.icon, s.accent, s.status, s.featured ? 1 : 0, s.sortOrder],
      );
    }
    await conn.query("INSERT IGNORE INTO coupons (code, title, discount_type, value, max_discount, per_user_limit) VALUES ('ASTRO10', '10% off your first report', 'percent', 10, 200, 1)");
    await conn.query("INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('site_name', ?)", [env.appNameDefault]);

    const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
    const pass = process.env.SEED_ADMIN_PASSWORD || "";
    if (email && pass) {
      const { encrypt, blindIndex, hashPassword } = await import("./crypto");
      const [admins] = await conn.query("SELECT id FROM admins WHERE email_bidx = ?", [blindIndex("email", email)]);
      if (!(admins as unknown[]).length) {
        await conn.query(
          "INSERT INTO admins (name_enc, email_enc, email_bidx, password_hash, role, permissions, password_changed_at) VALUES (?,?,?,?,?,?, UTC_TIMESTAMP())",
          [await encrypt("Super Admin"), await encrypt(email), blindIndex("email", email), await hashPassword(pass), "admin", "[]"],
        );
        steps.push("seed admin");
        log(`✓ seeded admin ${email}`);
      }
    }
    await conn.query(
      "INSERT INTO schema_meta (meta_key, meta_value) VALUES ('schema_hash', ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)",
      [version],
    );
    return { ran: true, version, steps };
  } finally {
    await conn.end().catch(() => {});
  }
}

/* ---- lazy runtime safety net: once per server instance ---- */
declare global {
  var __kmMigrated: Promise<void> | undefined;
}
export function ensureSchema(): Promise<void> {
  if (process.env.DB_AUTO_MIGRATE === "off") return Promise.resolve();
  globalThis.__kmMigrated ??= migrate()
    .then((r) => {
      if (r.ran) console.log(`[db] migrated to ${r.version}: ${r.steps.join(", ")}`);
    })
    .catch((e) => {
      globalThis.__kmMigrated = undefined; // retry on the next request
      console.error("[db] auto-migration failed:", (e as Error).message);
    });
  return globalThis.__kmMigrated;
}
