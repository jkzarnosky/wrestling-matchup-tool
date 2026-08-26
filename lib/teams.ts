import { eq } from "drizzle-orm";
import { teams } from "../db/schema";
import type { AppDb } from "../db/types";

export class ValidationError extends Error {}

interface TeamInput {
  name?: string;
  conference?: string;
}

function validate(input: TeamInput): { name: string; conference: string } {
  const name = input.name?.trim();
  const conference = input.conference?.trim();
  if (!name) throw new ValidationError("Team name is required.");
  if (!conference) throw new ValidationError("Conference is required.");
  return { name, conference };
}

export async function listTeams(db: AppDb) {
  return db.select().from(teams).orderBy(teams.name);
}

export async function createTeam(db: AppDb, input: TeamInput) {
  const values = validate(input);
  const [team] = await db.insert(teams).values(values).returning();
  return team;
}

export async function updateTeam(db: AppDb, id: number, input: TeamInput) {
  const values = validate(input);
  const [team] = await db.update(teams).set(values).where(eq(teams.id, id)).returning();
  if (!team) throw new Error("Team not found.");
  return team;
}
