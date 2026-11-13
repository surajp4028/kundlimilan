/**
 * Runs on every deploy (Vercel uses `npm run vercel-build`):  npm run db:migrate
 * Idempotent — creates missing tables, applies new database/migrations/*.sql once, seeds defaults.
 * A failure doesn't block the deploy unless MIGRATE_STRICT=1 (the app retries on its first request).
 */
import "./_env.mjs";

try {
  const { migrate } = await import("../src/lib/server/migrate.ts");
  const r = await migrate({ log: console.log });
  console.log(r.ran ? `✓ database migrated (${r.version}): ${r.steps.join(", ")}` : `✓ database already up to date (${r.version})`);
} catch (e) {
  console.error("✗ database migration failed:", (e as Error).message);
  if (process.env.MIGRATE_STRICT === "1") process.exit(1);
}
process.exit(0);
