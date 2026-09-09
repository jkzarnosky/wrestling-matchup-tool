import { beforeEach, describe, expect, it } from "vitest";
import { teams, users } from "../../db/schema";
import { createTestDb } from "../db/test-db";
import {
  ValidationError,
  createMatchupRun,
  getMatchupRunById,
  setMatchupRunThresholds,
} from "../../lib/matchup-runs";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function setup(db: TestDb) {
  const teamRows = await db
    .insert(teams)
    .values([
      { name: "Ironclad Wrestling Club", conference: "National" },
      { name: "Northgate Grapplers", conference: "National" },
      { name: "Summit Youth Wrestling", conference: "American" },
      { name: "River Valley Wrestling", conference: "American" },
      { name: "Fifth Team", conference: "American" },
    ])
    .returning();
  const [admin] = await db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "A", lastName: "B" }).returning();
  return { teamRows, admin };
}

describe("createMatchupRun", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates a run with 2 attending teams", async () => {
    const { teamRows, admin } = await setup(db);
    const ids = [teamRows[0].id, teamRows[1].id];

    const run = await createMatchupRun(db, ids, admin.id);

    expect(run.createdBy).toBe(admin.id);
    expect(run.teams.map((t) => t.id).sort()).toEqual(ids.sort());
  });

  it("creates a run with 4 attending teams (the max)", async () => {
    const { teamRows, admin } = await setup(db);
    const ids = teamRows.slice(0, 4).map((t) => t.id);

    const run = await createMatchupRun(db, ids, admin.id);
    expect(run.teams).toHaveLength(4);
  });

  it("rejects fewer than 2 teams", async () => {
    const { teamRows, admin } = await setup(db);
    await expect(createMatchupRun(db, [teamRows[0].id], admin.id)).rejects.toThrow(ValidationError);
  });

  it("rejects more than 4 teams", async () => {
    const { teamRows, admin } = await setup(db);
    const ids = teamRows.map((t) => t.id); // 5 teams
    await expect(createMatchupRun(db, ids, admin.id)).rejects.toThrow(ValidationError);
  });

  it("rejects a duplicate team id in the selection", async () => {
    const { teamRows, admin } = await setup(db);
    await expect(createMatchupRun(db, [teamRows[0].id, teamRows[0].id, teamRows[1].id], admin.id)).rejects.toThrow(
      ValidationError
    );
  });

  it("rejects a nonexistent team id", async () => {
    const { teamRows, admin } = await setup(db);
    await expect(createMatchupRun(db, [teamRows[0].id, 999999], admin.id)).rejects.toThrow(ValidationError);
  });

  it("a Team Rep can select teams other than their own", async () => {
    const { teamRows, admin: _admin } = await setup(db);
    const [rep] = await db
      .insert(users)
      .values({ email: "rep@example.com", role: "team_rep", firstName: "R", lastName: "S", teamId: teamRows[0].id })
      .returning();

    // Rep's own team is teamRows[0], but they select two *other* teams entirely.
    const run = await createMatchupRun(db, [teamRows[1].id, teamRows[2].id], rep.id);
    expect(run.teams.map((t) => t.id).sort()).toEqual([teamRows[1].id, teamRows[2].id].sort());
  });
});

describe("getMatchupRunById", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("returns null for a nonexistent run", async () => {
    expect(await getMatchupRunById(db, 999999)).toBeNull();
  });

  it("returns the run with its attending teams", async () => {
    const { teamRows, admin } = await setup(db);
    const created = await createMatchupRun(db, [teamRows[0].id, teamRows[2].id], admin.id);

    const fetched = await getMatchupRunById(db, created.id);
    expect(fetched).toMatchObject({ id: created.id, createdBy: admin.id });
    expect(fetched!.teams.map((t) => t.id).sort()).toEqual([teamRows[0].id, teamRows[2].id].sort());
  });

  it("thresholds are null until explicitly set", async () => {
    const { teamRows, admin } = await setup(db);
    const created = await createMatchupRun(db, [teamRows[0].id, teamRows[1].id], admin.id);
    expect(created).toMatchObject({
      ageDiffYears: null,
      skillDiffLevels: null,
      weightDiffMode: null,
      weightDiffValue: null,
      matCount: null,
    });
  });
});

const validThresholds = { ageDiffYears: 1, skillDiffLevels: 1, weightDiffMode: "percent", weightDiffValue: 10, matCount: 3 };

describe("setMatchupRunThresholds", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("throws for a nonexistent run", async () => {
    await expect(setMatchupRunThresholds(db, 999999, validThresholds)).rejects.toThrow(ValidationError);
  });

  it("sets all five thresholds", async () => {
    const { teamRows, admin } = await setup(db);
    const run = await createMatchupRun(db, [teamRows[0].id, teamRows[1].id], admin.id);

    const updated = await setMatchupRunThresholds(db, run.id, validThresholds);
    expect(updated).toMatchObject(validThresholds);
    expect(updated.teams).toHaveLength(2); // still carries the run's teams
  });

  it("can be called again to change previously-set thresholds", async () => {
    const { teamRows, admin } = await setup(db);
    const run = await createMatchupRun(db, [teamRows[0].id, teamRows[1].id], admin.id);
    await setMatchupRunThresholds(db, run.id, validThresholds);

    const updated = await setMatchupRunThresholds(db, run.id, { ...validThresholds, ageDiffYears: 2, matCount: 5 });
    expect(updated).toMatchObject({ ageDiffYears: 2, matCount: 5 });
  });

  it.each([
    ["negative age diff", { ...validThresholds, ageDiffYears: -1 }],
    ["non-integer age diff", { ...validThresholds, ageDiffYears: 1.5 }],
    ["negative skill diff", { ...validThresholds, skillDiffLevels: -1 }],
    ["invalid weight diff mode", { ...validThresholds, weightDiffMode: "kg" }],
    ["zero weight diff", { ...validThresholds, weightDiffValue: 0 }],
    ["negative weight diff", { ...validThresholds, weightDiffValue: -5 }],
    ["zero mat count", { ...validThresholds, matCount: 0 }],
    ["non-integer mat count", { ...validThresholds, matCount: 2.5 }],
  ])("rejects %s", async (_label, badInput) => {
    const { teamRows, admin } = await setup(db);
    const run = await createMatchupRun(db, [teamRows[0].id, teamRows[1].id], admin.id);
    await expect(setMatchupRunThresholds(db, run.id, badInput)).rejects.toThrow(ValidationError);
  });
});
