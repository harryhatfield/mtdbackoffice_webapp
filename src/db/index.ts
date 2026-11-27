import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

const folder = path.join(process.cwd(), "drizzle");

async function init() {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Neon (or any Postgres). Use the pooled connection string.
    const pool = new Pool({ connectionString: url, max: 5, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: true } });
    const db = drizzlePg(pool, { schema });
    if (process.env.AUTO_MIGRATE === "1") await migratePg(db, { migrationsFolder: folder });
    return db;
  }
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production (use the Neon pooled connection string)");
  // Local dev: embedded Postgres (WASM), no setup needed.
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: folder });
  return db;
}

type Db = ReturnType<typeof drizzlePg<typeof schema>>;
const g = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__db ??= init() as Promise<Db>;
  return g.__db;
}
export { schema };
