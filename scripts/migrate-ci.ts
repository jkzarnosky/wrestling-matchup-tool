// Applies db/migrations/*.sql in order against whatever DATABASE_URL points at, using the plain
// node-postgres driver. `drizzle-kit migrate` (npm run db:migrate) picks @neondatabase/serverless,
// which only speaks to Neon over a websocket, so it can't hit a plain Postgres server -- this
// script exists so CI can run migrations against a real Postgres container. Same migrator + same
// SQL files, just a different connection.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local"); // local runs; CI sets DATABASE_URL directly
} catch {
  // no .env.local -- rely on real env vars
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
await pool.end();

console.log("Migrations applied cleanly.");
