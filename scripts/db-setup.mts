/**
 * First-time setup (local XAMPP or a fresh cloud DB):  npm run db:setup
 * Creates the database if needed, then runs the same idempotent migration the app runs on deploy.
 */
import { adminConnection, dbName } from "./_env.mjs";

const boot = await adminConnection(false);
await boot.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await boot.end();

const { migrate } = await import("../src/lib/server/migrate.ts");
const r = await migrate({ force: true, log: console.log });
console.log(`✓ ${dbName} ready (schema ${r.version})`);
process.exit(0);
