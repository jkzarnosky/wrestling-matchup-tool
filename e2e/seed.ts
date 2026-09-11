// Wipes the e2e database and seeds a known baseline: 3 teams, an Admin, and wrestlers on two of
// the teams (the third is left empty for the CSV-import journey to import into). Writes the
// resulting IDs to e2e/.artifacts/seed-data.json for the specs to read. Uses node-postgres so it
// works against both a plain Postgres container (CI) and Neon over TCP (local).
import { mkdirSync, writeFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  invites,
  matchupRunPairings,
  matchupRunTeams,
  matchupRuns,
  otpCodes,
  sessions,
  teams,
  users,
  wrestlerHistory,
  wrestlers,
} from "../db/schema";
import { ADMIN_EMAIL, TEAM_NAMES } from "./constants";

try {
  process.loadEnvFile(".env.local"); // local runs; CI sets DATABASE_URL directly
} catch {
  // no .env.local -- rely on real env vars
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const pool = new Pool({ connectionString });
const db = drizzle(pool);

// FK order: children before parents.
await db.delete(matchupRunPairings);
await db.delete(wrestlerHistory);
await db.delete(wrestlers);
await db.delete(matchupRunTeams);
await db.delete(matchupRuns);
await db.delete(otpCodes);
await db.delete(sessions);
await db.delete(invites);
await db.delete(users);
await db.delete(teams);

const [ironclad, northgate, riverValley] = await db
  .insert(teams)
  .values([
    { name: TEAM_NAMES.ironclad, conference: "National" },
    { name: TEAM_NAMES.northgate, conference: "National" },
    { name: TEAM_NAMES.riverValley, conference: "American" },
  ])
  .returning();

await db.insert(users).values({ email: ADMIN_EMAIL, role: "admin", firstName: "E2E", lastName: "Admin" });

// Ironclad vs Northgate: two clean cross-team pairs by weight, plus one wrestler (200 lbs) who has
// no valid match under any sane threshold -> exercises the outlier section on the matchup sheet.
await db.insert(wrestlers).values([
  { teamId: ironclad.id, firstName: "Sam", lastName: "Rivera", birthday: new Date("2016-05-01"), weightLbs: 70, skillLevel: 2, sex: "M" },
  { teamId: ironclad.id, firstName: "Ava", lastName: "Chen", birthday: new Date("2016-08-01"), weightLbs: 72, skillLevel: 2, sex: "F" },
  { teamId: ironclad.id, firstName: "Big", lastName: "Unit", birthday: new Date("2016-01-01"), weightLbs: 200, skillLevel: 1, sex: "M" },
  { teamId: northgate.id, firstName: "Max", lastName: "Kowalski", birthday: new Date("2016-06-01"), weightLbs: 71, skillLevel: 2, sex: "M" },
  { teamId: northgate.id, firstName: "Nia", lastName: "Osei", birthday: new Date("2016-07-01"), weightLbs: 73, skillLevel: 2, sex: "F" },
]);

mkdirSync("e2e/.artifacts", { recursive: true });
writeFileSync(
  "e2e/.artifacts/seed-data.json",
  JSON.stringify({ adminEmail: ADMIN_EMAIL, teams: { ironclad: ironclad.id, northgate: northgate.id, riverValley: riverValley.id } }, null, 2)
);

await pool.end();
console.log("e2e database seeded.");
