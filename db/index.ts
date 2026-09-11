import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local doesn't exist, or Next.js already loaded it into process.env.
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// Neon's serverless (HTTP) driver is the right choice on Vercel -- long-lived TCP connections are a
// problem there -- but it can only talk to Neon/Vercel/Supabase endpoints, not a plain Postgres
// server. So for a non-Neon URL (a local Docker Postgres, or the Postgres service container the CI
// e2e job spins up) fall back to node-postgres over TCP. Detected from the URL; force either side
// with DB_DRIVER=neon | pg. See DECISIONS.md.
const useNeon =
  process.env.DB_DRIVER === "neon" ||
  (process.env.DB_DRIVER !== "pg" && /neon\.tech|vercel|supabase/i.test(url));

export const db = useNeon
  ? drizzleNeon(neon(url), { schema })
  : drizzlePg(new Pool({ connectionString: url }), { schema });
