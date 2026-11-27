import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Neon: migrations use the DIRECT (non-pooled) connection string.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL?.replace("-pooler", "");
if (!url) throw new Error("Set DATABASE_URL (run `neon env pull`) to run migrations");
const pool = new Pool({ connectionString: url });
await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
await pool.end();
console.log("Migrations applied.");
