// Wipes and reseeds the configured database back to a clean local-demo baseline: a handful of
// synthetic teams and the Admin account from .env.local. Safe to re-run any time the local demo
// gets messy from clicking around. Only ever touches whatever DATABASE_URL points at -- never run
// this against anything but your own local/dev database.
import { db } from "../db";
import {
  invites,
  matchupRunTeams,
  matchupRuns,
  otpCodes,
  sessions,
  teams,
  users,
  wrestlerHistory,
  wrestlers,
} from "../db/schema";
import { createTeam } from "../lib/teams";

const DEMO_TEAMS = [
  { name: "Ironclad Wrestling Club", conference: "National" },
  { name: "Northgate Grapplers", conference: "National" },
  { name: "Summit Youth Wrestling", conference: "American" },
  { name: "River Valley Wrestling", conference: "American" },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

async function main() {
  console.log("Resetting local demo data...");

  // Order matters -- children before parents, to satisfy foreign keys.
  await db.delete(wrestlerHistory);
  await db.delete(wrestlers);
  await db.delete(matchupRunTeams);
  await db.delete(matchupRuns);
  await db.delete(otpCodes);
  await db.delete(sessions);
  await db.delete(invites);
  await db.delete(users);
  await db.delete(teams);

  for (const team of DEMO_TEAMS) {
    await createTeam(db, team);
  }
  console.log(`Created ${DEMO_TEAMS.length} demo teams.`);

  const [admin] = await db
    .insert(users)
    .values({
      email: requireEnv("SEED_ADMIN_EMAIL"),
      role: "admin",
      firstName: requireEnv("SEED_ADMIN_FIRST_NAME"),
      lastName: requireEnv("SEED_ADMIN_LAST_NAME"),
    })
    .returning();
  console.log(`Seeded Admin: ${admin.email}`);

  console.log("Demo data reset complete.");
}

main();
