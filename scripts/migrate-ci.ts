// Applies db/migrations/*.sql in order against whatever DATABASE_URL points at, using the plain
// node-postgres driver. `drizzle-kit migrate` picks @neondatabase/serverless (the app's runtime
// driver) which only speaks to Neon over a websocket, so it can't hit a plain Postgres server --
// this script exists solely so CI can run migrations against a real Postgres container. Same
// migrator + same SQL files drizzle-kit would use, just a different connection.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./db/migrations" });
await pool.end();

console.log("Migrations applied cleanly.");
