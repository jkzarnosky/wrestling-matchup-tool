import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local doesn't exist, or Next.js already loaded it into process.env.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
