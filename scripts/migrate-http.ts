// Same as migrate.ts, but over HTTPS (port 443) via Neon's serverless driver.
// Use where raw Postgres (port 5432) is blocked, e.g. CI sandboxes:
//   NODE_USE_ENV_PROXY=1 DATABASE_URL=... npm run db:migrate:http
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL");
await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
console.log("Migrations applied (HTTP).");
