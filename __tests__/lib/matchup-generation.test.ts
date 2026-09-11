// Tier 1 (below): pure functions, no DB. generatePairings/assignMats take plain objects and a fixed
// `asOf` date, so every case is exactly reproducible -- no pglite, no real calendar dependency.
// Tier 2 (bottom of file): DB orchestration -- fetching the right roster, requiring thresholds,
// persisting/clearing, hydrating for display. Doesn't re-verify algorithm correctness, that's Tier 1's job.
import { beforeEach, describe, expect, it } from "vitest";
import { teams, users, wrestlers } from "../../db/schema";
import { createTestDb } from "../db/test-db";
import { assignMats, generatePairings, generateMatchupRunPairings, getMatchupSheet, type WrestlerForMatching } from "../../lib/matchup-generation";
import { ValidationError, createMatchupRun, setMatchupRunThresholds } from "../../lib/matchup-runs";

const ASOF = new Date("2027-01-01");

// Birthday that makes a wrestler exactly `age` years old as of ASOF.
function bday(age: number): Date {
  return new Date(`${2027 - age}-06-15`);
}

function wrestler(overrides: Partial<WrestlerForMatching> & { id: number }): WrestlerForMatching {
  return {
    teamId: 1,
    birthday: bday(9),
    weightLbs: 70,
    skillLevel: 2,
    sex: "M",
    ...overrides,
  };
}

const flatThresholds = (weightDiffValue: number) =>
  ({ ageDiffYears: 1, skillDiffLevels: 1, weightDiffMode: "flat" as const, weightDiffValue });

describe("generatePairings", () => {
  it("pairs two eligible cross-team wrestlers", () => {
    const a = wrestler({ id: 1, teamId: 1, weightLbs: 70 });
    const b = wrestler({ id: 2, teamId: 2, weightLbs: 72 });
    const { pairs, outlierIds } = generatePairings([a, b], flatThresholds(5), ASOF);
    expect(pairs).toEqual([{ wrestlerOneId: 1, wrestlerTwoId: 2 }]);
    expect(outlierIds).toEqual([]);
  });

  it("never pairs two wrestlers on the same team, even if otherwise perfect", () => {
    const a = wrestler({ id: 1, teamId: 1, weightLbs: 70 });
    const b = wrestler({ id: 2, teamId: 1, weightLbs: 70 }); // identical stats, same team
    const { pairs, outlierIds } = generatePairings([a, b], flatThresholds(50), ASOF);
    expect(pairs).toEqual([]);
    expect(outlierIds.sort()).toEqual([1, 2]);
  });

  it("age difference at the threshold boundary is eligible, one year over is not", () => {
    const a = wrestler({ id: 1, teamId: 1, birthday: bday(9) });
    const atBoundary = wrestler({ id: 2, teamId: 2, birthday: bday(10) }); // diff 1, threshold 1
    expect(generatePairings([a, atBoundary], flatThresholds(50), ASOF).pairs).toHaveLength(1);

    const overBoundary = wrestler({ id: 3, teamId: 2, birthday: bday(11) }); // diff 2, threshold 1
    expect(generatePairings([a, overBoundary], flatThresholds(50), ASOF).outlierIds.sort()).toEqual([1, 3]);
  });

  it("skill difference at the threshold boundary is eligible, one level over is not", () => {
    const a = wrestler({ id: 1, teamId: 1, skillLevel: 2 });
    const atBoundary = wrestler({ id: 2, teamId: 2, skillLevel: 3 }); // diff 1, threshold 1
    expect(generatePairings([a, atBoundary], flatThresholds(50), ASOF).pairs).toHaveLength(1);

    const overBoundary = wrestler({ id: 3, teamId: 2, skillLevel: 4 }); // diff 2, threshold 1
    expect(generatePairings([a, overBoundary], flatThresholds(50), ASOF).outlierIds.sort()).toEqual([1, 3]);
  });

  it("flat weight difference at the threshold boundary is eligible, one lb over is not", () => {
    const a = wrestler({ id: 1, teamId: 1, weightLbs: 100 });
    const atBoundary = wrestler({ id: 2, teamId: 2, weightLbs: 105 }); // diff 5, threshold 5
    expect(generatePairings([a, atBoundary], flatThresholds(5), ASOF).pairs).toHaveLength(1);

    const overBoundary = wrestler({ id: 3, teamId: 2, weightLbs: 106 }); // diff 6, threshold 5
    expect(generatePairings([a, overBoundary], flatThresholds(5), ASOF).outlierIds.sort()).toEqual([1, 3]);
  });

  it("percent weight mode is relative to the lighter wrestler, not the heavier or an average", () => {
    // 100 vs 110: diff 10, relative to lighter (100) = 10% exactly -- eligible at a 10% threshold.
    // Relative to the heavier (110) it would be ~9.09% (also under 10, not a useful distinguishing
    // case), so also check a case where the two denominators would disagree: 100 vs 111 is 11% of
    // the lighter (100) -- over a 10% threshold -- but only ~9.9% of the heavier (111), which would
    // wrongly pass if the code used the heavier wrestler as the denominator.
    const thresholds = { ageDiffYears: 1, skillDiffLevels: 1, weightDiffMode: "percent" as const, weightDiffValue: 10 };
    const a = wrestler({ id: 1, teamId: 1, weightLbs: 100 });
    const atBoundary = wrestler({ id: 2, teamId: 2, weightLbs: 110 });
    expect(generatePairings([a, atBoundary], thresholds, ASOF).pairs).toHaveLength(1);

    const overBoundary = wrestler({ id: 3, teamId: 2, weightLbs: 111 });
    expect(generatePairings([a, overBoundary], thresholds, ASOF).outlierIds.sort()).toEqual([1, 3]);
  });

  it("prefers a same-sex match over a closer-weight cross-sex match", () => {
    // w must be lightest (processed first, while both candidates are still available) for this to
    // actually exercise the choice -- otherwise whichever candidate is processed first and has w as
    // its only option would grab w before w gets a say.
    const w = wrestler({ id: 1, teamId: 1, sex: "M", weightLbs: 60 });
    const sameSexFarther = wrestler({ id: 2, teamId: 2, sex: "M", weightLbs: 75 }); // diff 15
    const crossSexNearer = wrestler({ id: 3, teamId: 3, sex: "F", weightLbs: 65 }); // diff 5, closer
    const { pairs, outlierIds } = generatePairings([w, sameSexFarther, crossSexNearer], flatThresholds(20), ASOF);
    expect(pairs).toEqual([{ wrestlerOneId: 1, wrestlerTwoId: 2 }]);
    expect(outlierIds).toEqual([3]);
  });

  it("falls back to a cross-sex match when no same-sex candidate is eligible", () => {
    const w = wrestler({ id: 1, teamId: 1, sex: "M", weightLbs: 100 });
    const crossSexOnly = wrestler({ id: 2, teamId: 2, sex: "F", weightLbs: 102 });
    const { pairs, outlierIds } = generatePairings([w, crossSexOnly], flatThresholds(5), ASOF);
    expect(pairs).toEqual([{ wrestlerOneId: 1, wrestlerTwoId: 2 }]);
    expect(outlierIds).toEqual([]);
  });

  it("flags a wrestler with no eligible candidate at all as an outlier, not silently dropped", () => {
    const a = wrestler({ id: 1, teamId: 1, weightLbs: 70 });
    const tooFar = wrestler({ id: 2, teamId: 2, weightLbs: 200 });
    const { pairs, outlierIds } = generatePairings([a, tooFar], flatThresholds(5), ASOF);
    expect(pairs).toEqual([]);
    expect(outlierIds.sort()).toEqual([1, 2]);
  });

  it("local-repair rescues 2 of 3 greedy outliers by splitting one existing pair; the 3rd is a genuine outlier", () => {
    // Hand-verified adversarial case (found by search, traced by hand -- see DECISIONS.md):
    // eligible pairs under these thresholds are exactly 1-3, 2-3, 2-5, 3-5 (4 has NO eligible
    // partner at all under any arrangement). Greedy processes by weight ascending (3,5,1,2,4):
    // 3 greedily takes its nearest option, 5 (leaving 1 and 2 both stranded, since 3 was their
    // only option too), and 4 is unmatchable regardless. Repair then finds that splitting {3,5}
    // into {1,3}+{2,5} rescues both 1 and 2, leaving only 4 as a true outlier.
    const thresholds = { ageDiffYears: 1, skillDiffLevels: 1, weightDiffMode: "flat" as const, weightDiffValue: 4 };
    const roster: WrestlerForMatching[] = [
      { id: 1, teamId: 3, birthday: bday(8), weightLbs: 68, skillLevel: 2, sex: "M" },
      { id: 2, teamId: 3, birthday: bday(10), weightLbs: 68, skillLevel: 2, sex: "M" },
      { id: 3, teamId: 2, birthday: bday(9), weightLbs: 65, skillLevel: 2, sex: "M" },
      { id: 4, teamId: 2, birthday: bday(8), weightLbs: 74, skillLevel: 3, sex: "M" },
      { id: 5, teamId: 1, birthday: bday(10), weightLbs: 67, skillLevel: 2, sex: "M" },
    ];

    const { pairs, outlierIds } = generatePairings(roster, thresholds, ASOF);

    expect(outlierIds).toEqual([4]);
    const asSet = (p: { wrestlerOneId: number; wrestlerTwoId: number }) => [p.wrestlerOneId, p.wrestlerTwoId].sort();
    expect(pairs.map(asSet).sort()).toEqual([
      [1, 3],
      [2, 5],
    ]);
  });

  it("every wrestler is accounted for exactly once, across pairs and outliers combined", () => {
    const roster: WrestlerForMatching[] = [
      wrestler({ id: 1, teamId: 1, weightLbs: 60 }),
      wrestler({ id: 2, teamId: 2, weightLbs: 62 }),
      wrestler({ id: 3, teamId: 1, weightLbs: 200 }), // outlier, too heavy for anyone
      wrestler({ id: 4, teamId: 3, weightLbs: 61 }),
    ];
    const { pairs, outlierIds } = generatePairings(roster, flatThresholds(5), ASOF);
    const accounted = [...pairs.flatMap((p) => [p.wrestlerOneId, p.wrestlerTwoId]), ...outlierIds].sort();
    expect(accounted).toEqual([1, 2, 3, 4]);
  });
});

describe("assignMats", () => {
  it("assigns mats round-robin in pair order", () => {
    const pairs = [
      { wrestlerOneId: 1, wrestlerTwoId: 2 },
      { wrestlerOneId: 3, wrestlerTwoId: 4 },
      { wrestlerOneId: 5, wrestlerTwoId: 6 },
      { wrestlerOneId: 7, wrestlerTwoId: 8 },
    ];
    const assigned = assignMats(pairs, 3);
    expect(assigned.map((p) => p.matNumber)).toEqual([1, 2, 3, 1]);
  });

  it("assigns every pair to mat 1 when there's only one mat", () => {
    const pairs = [
      { wrestlerOneId: 1, wrestlerTwoId: 2 },
      { wrestlerOneId: 3, wrestlerTwoId: 4 },
    ];
    expect(assignMats(pairs, 1).map((p) => p.matNumber)).toEqual([1, 1]);
  });

  it("returns an empty array for no pairs", () => {
    expect(assignMats([], 3)).toEqual([]);
  });
});

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

function birthdayForAge(age: number): Date {
  const now = new Date();
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
}

describe("generateMatchupRunPairings / getMatchupSheet (DB)", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  async function setup() {
    const [teamA, teamB, teamC] = await db
      .insert(teams)
      .values([
        { name: "Team A", conference: "National" },
        { name: "Team B", conference: "National" },
        { name: "Team C (not attending)", conference: "American" },
      ])
      .returning();
    const [admin] = await db
      .insert(users)
      .values({ email: "admin@example.com", role: "admin", firstName: "A", lastName: "B" })
      .returning();
    return { teamA, teamB, teamC, admin };
  }

  const generousThresholds = { ageDiffYears: 2, skillDiffLevels: 2, weightDiffMode: "flat" as const, weightDiffValue: 20 };

  it("throws if thresholds haven't been set yet", async () => {
    const { teamA, teamB, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    await expect(generateMatchupRunPairings(db, run.id)).rejects.toThrow(ValidationError);
  });

  it("throws for a nonexistent run", async () => {
    await expect(generateMatchupRunPairings(db, 999999)).rejects.toThrow(ValidationError);
  });

  it("only matches wrestlers from the run's attending teams, ignoring other teams entirely", async () => {
    const { teamA, teamB, teamC, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    await setMatchupRunThresholds(db, run.id, { ...generousThresholds, matCount: 2 });

    await db.insert(wrestlers).values([
      { teamId: teamA.id, firstName: "A1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 70, skillLevel: 2, sex: "M" },
      { teamId: teamB.id, firstName: "B1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 71, skillLevel: 2, sex: "M" },
      // Not attending this run -- must never appear in pairings OR outliers, not even considered.
      { teamId: teamC.id, firstName: "C1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 70, skillLevel: 2, sex: "M" },
    ]);

    const sheet = await generateMatchupRunPairings(db, run.id);
    expect(sheet.pairings).toHaveLength(1);
    expect(sheet.outliers).toHaveLength(0);
    const names = [sheet.pairings[0].wrestlerOne.firstName, sheet.pairings[0].wrestlerTwo.firstName].sort();
    expect(names).toEqual(["A1", "B1"]);
  });

  it("persists mat assignment and hydrates team names via getMatchupSheet", async () => {
    const { teamA, teamB, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    await setMatchupRunThresholds(db, run.id, { ...generousThresholds, matCount: 1 });

    await db.insert(wrestlers).values([
      { teamId: teamA.id, firstName: "A1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 70, skillLevel: 2, sex: "M" },
      { teamId: teamB.id, firstName: "B1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 71, skillLevel: 2, sex: "M" },
    ]);

    await generateMatchupRunPairings(db, run.id);
    const sheet = await getMatchupSheet(db, run.id);
    expect(sheet.pairings).toHaveLength(1);
    expect(sheet.pairings[0].matNumber).toBe(1);
    expect([sheet.pairings[0].wrestlerOne.teamName, sheet.pairings[0].wrestlerTwo.teamName].sort()).toEqual([
      "Team A",
      "Team B",
    ]);
  });

  it("flags an unmatchable wrestler as an outlier via the persisted sheet", async () => {
    const { teamA, teamB, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    await setMatchupRunThresholds(db, run.id, {
      ageDiffYears: 1,
      skillDiffLevels: 1,
      weightDiffMode: "flat",
      weightDiffValue: 5,
      matCount: 1,
    });

    await db.insert(wrestlers).values([
      { teamId: teamA.id, firstName: "Solo", lastName: "X", birthday: birthdayForAge(10), weightLbs: 200, skillLevel: 2, sex: "M" },
      { teamId: teamB.id, firstName: "TooLight", lastName: "X", birthday: birthdayForAge(10), weightLbs: 70, skillLevel: 2, sex: "M" },
    ]);

    const sheet = await generateMatchupRunPairings(db, run.id);
    expect(sheet.pairings).toHaveLength(0);
    expect(sheet.outliers.map((w) => w.firstName).sort()).toEqual(["Solo", "TooLight"]);
  });

  it("is idempotent: re-generating clears the previous result instead of appending to it", async () => {
    const { teamA, teamB, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    await setMatchupRunThresholds(db, run.id, { ...generousThresholds, matCount: 1 });

    await db.insert(wrestlers).values([
      { teamId: teamA.id, firstName: "A1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 70, skillLevel: 2, sex: "M" },
      { teamId: teamB.id, firstName: "B1", lastName: "X", birthday: birthdayForAge(10), weightLbs: 71, skillLevel: 2, sex: "M" },
    ]);

    await generateMatchupRunPairings(db, run.id);
    const secondResult = await generateMatchupRunPairings(db, run.id);
    expect(secondResult.pairings).toHaveLength(1); // not 2 -- cleared, not appended to
  });

  it("returns an empty sheet before anything has been generated", async () => {
    const { teamA, teamB, admin } = await setup();
    const run = await createMatchupRun(db, [teamA.id, teamB.id], admin.id);
    expect(await getMatchupSheet(db, run.id)).toEqual({ pairings: [], outliers: [] });
  });
});
