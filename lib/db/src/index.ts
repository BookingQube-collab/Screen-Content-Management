import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type Db = NodePgDatabase<typeof schema>;

let poolInstance: pg.Pool | undefined;
let dbInstance: Db | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

function isSupabaseHost(hostname: string): boolean {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".pooler.supabase.com")
  );
}

/** Normalize Supabase URLs for node-postgres (libpq SSL compat, avoid pg v9 warnings). */
export function resolveDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  if (!isSupabaseHost(url.hostname)) return raw;
  if (!url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

function createPoolConfig(): pg.PoolConfig {
  const connectionString = resolveDatabaseUrl(requireDatabaseUrl());
  const hostname = new URL(connectionString).hostname;
  return {
    connectionString,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ...(isSupabaseHost(hostname)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };
}

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(createPoolConfig());
  }
  return poolInstance;
}

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

/** Lazy DB handle — connects on first use, not at module load. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb() as object, prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

/** Lazy pool — same semantics as before, without connecting at import. */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool() as object, prop, receiver);
    return typeof value === "function" ? value.bind(getPool()) : value;
  },
});

export * from "./schema";
