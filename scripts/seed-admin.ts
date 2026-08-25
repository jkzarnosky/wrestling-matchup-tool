// Seeds the first Admin user directly, bypassing the invite flow (which requires an
// existing Admin to send it — see BACKLOG.md, Epic .5 "User data model" AC).
import { db } from "../db";
import { users } from "../db/schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

async function main() {
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const firstName = requireEnv("SEED_ADMIN_FIRST_NAME");
  const lastName = requireEnv("SEED_ADMIN_LAST_NAME");

  const [admin] = await db
    .insert(users)
    .values({ email, role: "admin", firstName, lastName })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (admin) {
    console.log(`Seeded Admin: ${admin.email}`);
  } else {
    console.log(`Admin ${email} already exists — nothing to do.`);
  }
}

main();
