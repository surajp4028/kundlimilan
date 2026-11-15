import "server-only";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { env } from "./env";
import { attachDatabasePool } from "@vercel/functions";
import { ensureSchema } from "./migrate";

/**
 * Raw-SQL data layer (no ORM). ALWAYS use placeholders (?) — never string-concat user input.
 * mysql2 escapes every `?` value server-side-safe; identifiers are never taken from user input.
 */
/** Same behaviour on local MariaDB and cloud MySQL 8 (Aiven). */
export const SQL_MODE = "STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION";

declare global {
  var __kmPool: Pool | undefined;
}

const onVercel = !!process.env.VERCEL;
/**
 * Server-side idle limit for our sessions. On serverless a frozen instance can't close its sockets,
 * and the MySQL default (8 h) lets them pile up until "Too many connections" (Aiven free plan ≈ 46).
 */
const WAIT_TIMEOUT = Math.max(30, Number(process.env.DB_WAIT_TIMEOUT) || (onVercel ? 120 : 28800));

function createPool(): Pool {
  const p = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: env.db.ssl ? (env.db.sslCa ? { ca: env.db.sslCa } : { rejectUnauthorized: false }) : undefined,
    connectionLimit: Math.max(1, Number(process.env.DB_POOL) || (onVercel ? 2 : 10)),
    // serverless: don't keep idle sockets around — close them after 10 s
    ...(onVercel ? { maxIdle: 0, idleTimeout: 10_000 } : {}),
    enableKeepAlive: true,
    connectTimeout: 15_000,
    waitForConnections: true,
    charset: "utf8mb4",
    timezone: "Z", // store/read DATETIME as UTC
    dateStrings: false,
    multipleStatements: false, // defence-in-depth against stacked-query injection
    namedPlaceholders: false,
  });
  // All DATETIME/TIMESTAMP values are UTC end-to-end (UI converts to IST for display).
  // The event hands over the core (callback) connection, so this query is fire-and-forget.
  p.on("connection", (conn) => {
    // UTC + one predictable sql_mode everywhere (Aiven defaults to ANSI mode: ANSI_QUOTES, PIPES_AS_CONCAT…)
    (conn as unknown as { query: (sql: string) => void }).query(`SET time_zone = '+00:00', SESSION sql_mode = '${SQL_MODE}', SESSION wait_timeout = ${WAIT_TIMEOUT}`);
  });
  // Vercel Fluid compute: release idle pool connections before the instance is suspended
  if (onVercel) attachDatabasePool(p);
  return p;
}

export const pool: Pool = globalThis.__kmPool ?? createPool();

if (process.env.NODE_ENV !== "production") globalThis.__kmPool = pool;

type Params = (string | number | boolean | null | Date | Buffer)[];

export async function query<T = RowDataPacket>(sql: string, params: Params = []): Promise<T[]> {
  await ensureSchema();
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function queryOne<T = RowDataPacket>(sql: string, params: Params = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params: Params = []): Promise<ResultSetHeader> {
  await ensureSchema();
  const [res] = await pool.query<ResultSetHeader>(sql, params);
  return res;
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  await ensureSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** UTC "YYYY-MM-DD HH:MM:SS" for DATETIME columns. */
export function sqlDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
