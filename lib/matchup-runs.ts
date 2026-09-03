import { eq, inArray } from "drizzle-orm";
import { matchupRunTeams, matchupRuns, teams } from "../db/schema";
import type { AppDb } from "../db/types";

export class ValidationError extends Error {}

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;

export interface MatchupRunWithTeams {
  id: number;
  createdBy: number;
  createdAt: Date;
  teams: (typeof teams.$inferSelect)[];
}

/** Epic 2 story "Select attending teams for the week" -- the Hosting Team Rep (or Admin) picks
 * 2-4 attending teams for a run. Any team in the league is selectable, not just the caller's own --
 * see DECISIONS.md's cross-team read-access call from the Epic 2 AC review. */
export async function createMatchupRun(
  db: AppDb,
  teamIds: number[],
  createdByUserId: number
): Promise<MatchupRunWithTeams> {
  const uniqueIds = [...new Set(teamIds)];
  if (uniqueIds.length !== teamIds.length) {
    throw new ValidationError("Duplicate team selected.");
  }
  if (uniqueIds.length < MIN_TEAMS || uniqueIds.length > MAX_TEAMS) {
    throw new ValidationError(`Select between ${MIN_TEAMS} and ${MAX_TEAMS} attending teams.`);
  }

  const foundTeams = await db.select().from(teams).where(inArray(teams.id, uniqueIds));
  if (foundTeams.length !== uniqueIds.length) {
    throw new ValidationError("One or more selected teams don't exist.");
  }

  const [run] = await db.insert(matchupRuns).values({ createdBy: createdByUserId }).returning();
  await db.insert(matchupRunTeams).values(uniqueIds.map((teamId) => ({ runId: run.id, teamId })));

  // foundTeams comes back in an arbitrary/DB order -- re-sort to match the order teamIds was
  // given in, so the UI shows teams back in the order the Rep picked them.
  const teamsById = new Map(foundTeams.map((team: typeof teams.$inferSelect) => [team.id, team]));
  return { ...run, teams: uniqueIds.map((id) => teamsById.get(id)!) };
}

export async function getMatchupRunById(db: AppDb, id: number): Promise<MatchupRunWithTeams | null> {
  const [run] = await db.select().from(matchupRuns).where(eq(matchupRuns.id, id)).limit(1);
  if (!run) return null;

  const rows = await db
    .select({ team: teams })
    .from(matchupRunTeams)
    .innerJoin(teams, eq(matchupRunTeams.teamId, teams.id))
    .where(eq(matchupRunTeams.runId, id))
    .orderBy(teams.name);

  return { ...run, teams: rows.map((row: { team: typeof teams.$inferSelect }) => row.team) };
}
