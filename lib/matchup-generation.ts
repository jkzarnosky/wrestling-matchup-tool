import { eq, inArray } from "drizzle-orm";
import { matchupRunPairings, matchupRunTeams, matchupRuns, teams, wrestlers } from "../db/schema";
import type { AppDb } from "../db/types";
import { calculateAge } from "./age-bracket";
import { ValidationError } from "./matchup-runs";
import type { WeightDiffMode } from "./matchup-runs";

export interface WrestlerForMatching {
  id: number;
  teamId: number;
  birthday: Date;
  weightLbs: number;
  skillLevel: number;
  sex: "M" | "F";
}

export interface MatchingThresholds {
  ageDiffYears: number;
  skillDiffLevels: number;
  weightDiffMode: WeightDiffMode;
  weightDiffValue: number;
}

export interface Pairing {
  wrestlerOneId: number;
  wrestlerTwoId: number;
}

export interface GenerationResult {
  pairs: Pairing[];
  outlierIds: number[];
}

function weightWithinThreshold(a: WrestlerForMatching, b: WrestlerForMatching, thresholds: MatchingThresholds): boolean {
  const diff = Math.abs(a.weightLbs - b.weightLbs);
  if (thresholds.weightDiffMode === "flat") return diff <= thresholds.weightDiffValue;
  // Percent is relative to the lighter wrestler's weight -- the standard convention real weight-class
  // allowances use, not an average or the heavier wrestler's weight. See DECISIONS.md.
  const percentDiff = (diff / Math.min(a.weightLbs, b.weightLbs)) * 100;
  return percentDiff <= thresholds.weightDiffValue;
}

/** Cross-team only -- "matches wrestlers *across* selected teams" (AC); a weekly dual is against
 * other clubs, never a teammate. Not spelled out as explicitly as the other rules, but the
 * strongest reading of "across teams" and how a real weekly dual actually works. See DECISIONS.md. */
function isEligible(
  a: WrestlerForMatching,
  b: WrestlerForMatching,
  thresholds: MatchingThresholds,
  asOf: Date
): boolean {
  if (a.id === b.id) return false;
  if (a.teamId === b.teamId) return false;
  if (Math.abs(calculateAge(a.birthday, asOf) - calculateAge(b.birthday, asOf)) > thresholds.ageDiffYears) return false;
  if (Math.abs(a.skillLevel - b.skillLevel) > thresholds.skillDiffLevels) return false;
  if (!weightWithinThreshold(a, b, thresholds)) return false;
  return true;
}

/** Tries to rescue exactly two remaining outliers by splitting one existing pair between them --
 * the minimal repair that's actually possible post-greedy, since there's no third free wrestler to
 * complete a single-outlier repair with. Mutates `pairs` in place and returns whether it found one;
 * caller loops this until it stops finding swaps (each swap strictly reduces outliers by 2, so it
 * terminates quickly). See DECISIONS.md for why this bounded local search was chosen over a full
 * optimal-matching algorithm. */
function tryOneRepair(
  outliers: WrestlerForMatching[],
  pairs: Pairing[],
  byId: Map<number, WrestlerForMatching>,
  thresholds: MatchingThresholds,
  asOf: Date
): boolean {
  for (let i = 0; i < outliers.length; i++) {
    for (let j = i + 1; j < outliers.length; j++) {
      const o1 = outliers[i];
      const o2 = outliers[j];
      for (let p = 0; p < pairs.length; p++) {
        const x = byId.get(pairs[p].wrestlerOneId)!;
        const y = byId.get(pairs[p].wrestlerTwoId)!;
        if (isEligible(o1, x, thresholds, asOf) && isEligible(o2, y, thresholds, asOf)) {
          pairs[p] = { wrestlerOneId: o1.id, wrestlerTwoId: x.id };
          pairs.push({ wrestlerOneId: o2.id, wrestlerTwoId: y.id });
          return true;
        }
        if (isEligible(o1, y, thresholds, asOf) && isEligible(o2, x, thresholds, asOf)) {
          pairs[p] = { wrestlerOneId: o1.id, wrestlerTwoId: y.id };
          pairs.push({ wrestlerOneId: o2.id, wrestlerTwoId: x.id });
          return true;
        }
      }
    }
  }
  return false;
}

/** Pure, DB-free matching algorithm -- greedy nearest-weight pass (sorted by weight, same-sex
 * preferred when available, cross-team + thresholds enforced), then a bounded local-repair pass.
 * See DECISIONS.md for the algorithm-choice writeup (plain greedy vs. this vs. full optimal
 * weighted matching / Blossom). `asOf` is only a parameter so tests don't depend on the real
 * calendar date. */
export function generatePairings(
  wrestlerList: WrestlerForMatching[],
  thresholds: MatchingThresholds,
  asOf: Date = new Date()
): GenerationResult {
  const sorted = [...wrestlerList].sort((a, b) => a.weightLbs - b.weightLbs || a.id - b.id);
  const matched = new Set<number>();
  const pairs: Pairing[] = [];

  for (const w of sorted) {
    if (matched.has(w.id)) continue;
    const candidates = sorted.filter((other) => !matched.has(other.id) && isEligible(w, other, thresholds, asOf));
    if (candidates.length === 0) continue;

    const sameSex = candidates.filter((c) => c.sex === w.sex);
    const pool = sameSex.length > 0 ? sameSex : candidates;
    const best = pool.reduce((closest, c) =>
      Math.abs(c.weightLbs - w.weightLbs) < Math.abs(closest.weightLbs - w.weightLbs) ? c : closest
    );

    matched.add(w.id);
    matched.add(best.id);
    pairs.push({ wrestlerOneId: w.id, wrestlerTwoId: best.id });
  }

  const byId = new Map(wrestlerList.map((w) => [w.id, w]));
  let outliers = sorted.filter((w) => !matched.has(w.id));
  while (outliers.length >= 2 && tryOneRepair(outliers, pairs, byId, thresholds, asOf)) {
    const stillMatched = new Set(pairs.flatMap((p) => [p.wrestlerOneId, p.wrestlerTwoId]));
    outliers = wrestlerList.filter((w) => !stillMatched.has(w.id));
  }

  return { pairs, outlierIds: outliers.map((w) => w.id) };
}

/** Round-robin mat assignment across `matCount` mats, in the order `generatePairings` produced --
 * not optimized for anything beyond even spread. See DECISIONS.md. */
export function assignMats(pairs: Pairing[], matCount: number): (Pairing & { matNumber: number })[] {
  return pairs.map((pair, index) => ({ ...pair, matNumber: (index % matCount) + 1 }));
}

export interface WrestlerSummary {
  id: number;
  firstName: string;
  lastName: string;
  teamName: string;
  weightLbs: number;
  skillLevel: number;
  sex: "M" | "F";
}

export interface MatchupSheetPairing {
  matNumber: number;
  wrestlerOne: WrestlerSummary;
  wrestlerTwo: WrestlerSummary;
}

export interface MatchupSheet {
  pairings: MatchupSheetPairing[]; // sorted by mat number
  outliers: WrestlerSummary[];
}

/** Epic 2 story "Generate weekly matchups" -- runs the algorithm against every wrestler on the
 * run's attending teams, assigns mats, and persists the result. Idempotent: clears this run's
 * previous pairings first, so re-running after fixing a wrestler's weight needs no manual cleanup. */
export async function generateMatchupRunPairings(db: AppDb, runId: number): Promise<MatchupSheet> {
  const [run] = await db.select().from(matchupRuns).where(eq(matchupRuns.id, runId)).limit(1);
  if (!run) throw new ValidationError("Matchup run not found.");
  if (run.ageDiffYears === null || run.matCount === null) {
    throw new ValidationError("Set thresholds before generating matchups.");
  }

  const teamRows = await db
    .select({ teamId: matchupRunTeams.teamId })
    .from(matchupRunTeams)
    .where(eq(matchupRunTeams.runId, runId));
  const teamIds = teamRows.map((row: { teamId: number }) => row.teamId);

  const roster: WrestlerForMatching[] =
    teamIds.length === 0 ? [] : await db.select().from(wrestlers).where(inArray(wrestlers.teamId, teamIds));

  const thresholds: MatchingThresholds = {
    ageDiffYears: run.ageDiffYears,
    skillDiffLevels: run.skillDiffLevels,
    weightDiffMode: run.weightDiffMode,
    weightDiffValue: run.weightDiffValue,
  };

  const { pairs, outlierIds } = generatePairings(roster, thresholds);
  const assigned = assignMats(pairs, run.matCount);

  await db.delete(matchupRunPairings).where(eq(matchupRunPairings.runId, runId));
  if (assigned.length > 0) {
    await db.insert(matchupRunPairings).values(
      assigned.map((p) => ({ runId, matNumber: p.matNumber, wrestlerOneId: p.wrestlerOneId, wrestlerTwoId: p.wrestlerTwoId }))
    );
  }
  if (outlierIds.length > 0) {
    await db.insert(matchupRunPairings).values(outlierIds.map((id) => ({ runId, wrestlerOneId: id })));
  }

  return getMatchupSheet(db, runId);
}

/** Reads back a run's current pairings (generated or not) with names/teams hydrated for display --
 * used both right after generation and on a plain page load, without regenerating. */
export async function getMatchupSheet(db: AppDb, runId: number): Promise<MatchupSheet> {
  const rows = await db.select().from(matchupRunPairings).where(eq(matchupRunPairings.runId, runId));
  if (rows.length === 0) return { pairings: [], outliers: [] };

  const wrestlerIds = [...new Set(rows.flatMap((r: typeof matchupRunPairings.$inferSelect) => [r.wrestlerOneId, r.wrestlerTwoId]))].filter(
    (id): id is number => id !== null
  );
  const wrestlerRows = await db
    .select({ wrestler: wrestlers, teamName: teams.name })
    .from(wrestlers)
    .innerJoin(teams, eq(wrestlers.teamId, teams.id))
    .where(inArray(wrestlers.id, wrestlerIds));

  const summaryById = new Map<number, WrestlerSummary>(
    wrestlerRows.map((row: { wrestler: typeof wrestlers.$inferSelect; teamName: string }) => [
      row.wrestler.id,
      {
        id: row.wrestler.id,
        firstName: row.wrestler.firstName,
        lastName: row.wrestler.lastName,
        teamName: row.teamName,
        weightLbs: row.wrestler.weightLbs,
        skillLevel: row.wrestler.skillLevel,
        sex: row.wrestler.sex,
      },
    ])
  );

  const pairings: MatchupSheetPairing[] = rows
    .filter((r: typeof matchupRunPairings.$inferSelect) => r.wrestlerTwoId !== null)
    .map((r: typeof matchupRunPairings.$inferSelect) => ({
      matNumber: r.matNumber!,
      wrestlerOne: summaryById.get(r.wrestlerOneId)!,
      wrestlerTwo: summaryById.get(r.wrestlerTwoId!)!,
    }))
    .sort((a: MatchupSheetPairing, b: MatchupSheetPairing) => a.matNumber - b.matNumber);

  const outliers: WrestlerSummary[] = rows
    .filter((r: typeof matchupRunPairings.$inferSelect) => r.wrestlerTwoId === null)
    .map((r: typeof matchupRunPairings.$inferSelect) => summaryById.get(r.wrestlerOneId)!);

  return { pairings, outliers };
}
