import { eq, inArray } from "drizzle-orm";
import { matchupRunTeams, matchupRuns, teams } from "../db/schema";
import type { AppDb } from "../db/types";

export class ValidationError extends Error {}

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;

export type WeightDiffMode = "flat" | "percent";

// "Sensible defaults" per the AC -- suggested starting values the Hosting Team Rep sees pre-filled
// in the form (lib/matchup-runs.ts is the single source of truth, the UI imports these rather than
// hardcoding its own copy). Not DB defaults: a run's threshold columns stay NULL until explicitly
// set via setMatchupRunThresholds, even if that happens to be with these exact values.
export const DEFAULT_AGE_DIFF_YEARS = 1;
export const DEFAULT_SKILL_DIFF_LEVELS = 1;
export const DEFAULT_WEIGHT_DIFF_MODE: WeightDiffMode = "percent";
export const DEFAULT_WEIGHT_DIFF_VALUE = 10;

export interface MatchupRunWithTeams {
  id: number;
  createdBy: number;
  createdAt: Date;
  teams: (typeof teams.$inferSelect)[];
  ageDiffYears: number | null;
  skillDiffLevels: number | null;
  weightDiffMode: WeightDiffMode | null;
  weightDiffValue: number | null;
  matCount: number | null;
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

interface ThresholdInput {
  ageDiffYears?: unknown;
  skillDiffLevels?: unknown;
  weightDiffMode?: unknown;
  weightDiffValue?: unknown;
  matCount?: unknown;
}

/** Epic 2 story "Configure weekly matching thresholds" -- separate action from run creation, not
 * folded into it, so the three Epic 2 stories each own a distinct step of the same run rather than
 * one story's endpoint growing to cover the next one's scope. Callable more than once (a Rep
 * realizing they need to widen a threshold shouldn't need to start a new run). */
export async function setMatchupRunThresholds(
  db: AppDb,
  runId: number,
  input: ThresholdInput
): Promise<MatchupRunWithTeams> {
  const existing = await getMatchupRunById(db, runId);
  if (!existing) throw new ValidationError("Matchup run not found.");

  const ageDiffYears = Number(input.ageDiffYears);
  if (!Number.isInteger(ageDiffYears) || ageDiffYears < 0) {
    throw new ValidationError("Age difference must be a non-negative whole number of years.");
  }

  const skillDiffLevels = Number(input.skillDiffLevels);
  if (!Number.isInteger(skillDiffLevels) || skillDiffLevels < 0) {
    throw new ValidationError("Skill-level difference must be a non-negative whole number.");
  }

  if (input.weightDiffMode !== "flat" && input.weightDiffMode !== "percent") {
    throw new ValidationError('Weight difference mode must be "flat" or "percent".');
  }
  const weightDiffMode: WeightDiffMode = input.weightDiffMode;

  const weightDiffValue = Number(input.weightDiffValue);
  if (!Number.isFinite(weightDiffValue) || weightDiffValue <= 0) {
    throw new ValidationError("Weight difference must be a positive number.");
  }

  const matCount = Number(input.matCount);
  if (!Number.isInteger(matCount) || matCount < 1) {
    throw new ValidationError("Number of mats must be a positive whole number.");
  }

  const [updated] = await db
    .update(matchupRuns)
    .set({ ageDiffYears, skillDiffLevels, weightDiffMode, weightDiffValue, matCount })
    .where(eq(matchupRuns.id, runId))
    .returning();

  return { ...existing, ...updated };
}
