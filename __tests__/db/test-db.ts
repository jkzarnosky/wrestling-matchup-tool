import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../db/schema";

/** A fresh, migrated, in-memory Postgres (via pglite) for one test. Real Postgres
 * semantics (enums, CHECK constraints, unique indexes) without a live DB or secrets. */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}
