import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { teams, users, wrestlerHistory, wrestlers } from "../../db/schema";
import { createTestDb } from "../db/test-db";
import { ValidationError, createWrestler, importWrestlersFromCsv, listWrestlers, updateWrestler } from "../../lib/wrestlers";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const HEADER = "team,first_name,last_name,birthday,weight,skill_level,sex";

async function setup(db: TestDb) {
  const [team] = await db.insert(teams).values({ name: "Ironclad Wrestling Club", conference: "National" }).returning();
  const [admin] = await db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "A", lastName: "B" }).returning();
  return { team, admin };
}

describe("importWrestlersFromCsv", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("throws for a nonexistent team", async () => {
    await expect(importWrestlersFromCsv(db, 999, HEADER, 1)).rejects.toThrow(ValidationError);
  });

  it("creates valid rows and writes a creation-marker history entry", async () => {
    const { team, admin } = await setup(db);
    const csv = `${HEADER}\n${team.name},Sam,Rep,2018-03-20,55,3,M`;

    const summary = await importWrestlersFromCsv(db, team.id, csv, admin.id);

    expect(summary).toMatchObject({ createdCount: 1, duplicateCount: 0, invalidCount: 0 });
    const roster = await listWrestlers(db, team.id);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({ firstName: "Sam", lastName: "Rep", weightLbs: 55, skillLevel: 3, sex: "M" });

    const history = await db.select().from(wrestlerHistory).where(eq(wrestlerHistory.wrestlerId, roster[0].id));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ action: "created_via_import", changedBy: admin.id, field: null });
  });

  it("matches team name trimmed and case-insensitively", async () => {
    const { team, admin } = await setup(db);
    const csv = `${HEADER}\n  ironclad wrestling club  ,Sam,Rep,2018-03-20,55,3,M`;

    const summary = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(summary.createdCount).toBe(1);
  });

  it("ignores an age_bracket column if present", async () => {
    const { team, admin } = await setup(db);
    const csv = `${HEADER},age_bracket\n${team.name},Sam,Rep,2018-03-20,55,3,M,Midget`;

    const summary = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(summary.createdCount).toBe(1);
  });

  it.each([
    ["missing required field", `${teamPlaceholder()},Sam,,2018-03-20,55,3,M`, "Missing required field"],
    ["mismatched team", "Some Other Team,Sam,Rep,2018-03-20,55,3,M", "doesn't match"],
    ["unparseable birthday", `${teamPlaceholder()},Sam,Rep,not-a-date,55,3,M`, "Invalid birthday"],
    ["future birthday", `${teamPlaceholder()},Sam,Rep,2099-01-01,55,3,M`, "must be a past date"],
    ["non-positive weight", `${teamPlaceholder()},Sam,Rep,2018-03-20,0,3,M`, "Invalid weight"],
    ["out-of-range skill_level", `${teamPlaceholder()},Sam,Rep,2018-03-20,55,5,M`, "Invalid skill_level"],
    ["invalid sex", `${teamPlaceholder()},Sam,Rep,2018-03-20,55,3,X`, "Invalid sex"],
  ])("rejects a row with %s", async (_label, rowTemplate, expectedReasonSubstring) => {
    const { team, admin } = await setup(db);
    const row = rowTemplate.replace(teamPlaceholder(), team.name);
    const csv = `${HEADER}\n${row}`;

    const summary = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(summary).toMatchObject({ createdCount: 0, invalidCount: 1 });
    expect(summary.rows[0].reason).toContain(expectedReasonSubstring);
  });

  it("rejects a duplicate within the same file", async () => {
    const { team, admin } = await setup(db);
    const row = `${team.name},Sam,Rep,2018-03-20,55,3,M`;
    const csv = `${HEADER}\n${row}\n${row}`;

    const summary = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(summary).toMatchObject({ createdCount: 1, duplicateCount: 1, invalidCount: 0 });
  });

  it("rejects a duplicate against an existing wrestler on re-import", async () => {
    const { team, admin } = await setup(db);
    const csv = `${HEADER}\n${team.name},Sam,Rep,2018-03-20,55,3,M`;

    const first = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(first.createdCount).toBe(1);

    const second = await importWrestlersFromCsv(db, team.id, csv, admin.id);
    expect(second).toMatchObject({ createdCount: 0, duplicateCount: 1 });

    const roster = await listWrestlers(db, team.id);
    expect(roster).toHaveLength(1); // not overwritten/duplicated
  });
});

// Small helper so the AC-driven table above reads without repeating the team name everywhere.
function teamPlaceholder(): string {
  return "__TEAM__";
}

const validInput = { first_name: "Sam", last_name: "Rep", birthday: "2018-03-20", weight: "55", skill_level: "3", sex: "M" };

describe("createWrestler", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates a wrestler and writes a created_via_ui marker (not full field history)", async () => {
    const { team, admin } = await setup(db);
    const wrestler = await createWrestler(db, team.id, validInput, admin.id);

    expect(wrestler).toMatchObject({ firstName: "Sam", lastName: "Rep", weightLbs: 55, skillLevel: 3, sex: "M" });

    const history = await db.select().from(wrestlerHistory).where(eq(wrestlerHistory.wrestlerId, wrestler.id));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ action: "created_via_ui", field: null, changedBy: admin.id });
  });

  it("rejects invalid input with the same validation as CSV import", async () => {
    const { team, admin } = await setup(db);
    await expect(createWrestler(db, team.id, { ...validInput, skill_level: "9" }, admin.id)).rejects.toThrow(
      ValidationError
    );
  });

  it("rejects a duplicate on the same team", async () => {
    const { team, admin } = await setup(db);
    await createWrestler(db, team.id, validInput, admin.id);
    await expect(createWrestler(db, team.id, validInput, admin.id)).rejects.toThrow(ValidationError);
  });
});

describe("updateWrestler", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("updates fields and writes one history row per changed field", async () => {
    const { team, admin } = await setup(db);
    const wrestler = await createWrestler(db, team.id, validInput, admin.id);

    const updated = await updateWrestler(db, wrestler.id, { ...validInput, weight: "60", skill_level: "2" }, admin.id);
    expect(updated).toMatchObject({ weightLbs: 60, skillLevel: 2 });

    const history = await db
      .select()
      .from(wrestlerHistory)
      .where(eq(wrestlerHistory.wrestlerId, wrestler.id));
    const edits = history.filter((h) => h.action === "edited");
    expect(edits).toHaveLength(2);
    expect(edits.map((e) => e.field).sort()).toEqual(["skillLevel", "weightLbs"]);
    expect(edits.find((e) => e.field === "weightLbs")).toMatchObject({ oldValue: "55", newValue: "60" });
  });

  it("writes no history row when nothing actually changed", async () => {
    const { team, admin } = await setup(db);
    const wrestler = await createWrestler(db, team.id, validInput, admin.id);

    await updateWrestler(db, wrestler.id, validInput, admin.id);

    const history = await db.select().from(wrestlerHistory).where(eq(wrestlerHistory.wrestlerId, wrestler.id));
    expect(history.filter((h) => h.action === "edited")).toHaveLength(0);
  });

  it("throws for a nonexistent wrestler", async () => {
    const { admin } = await setup(db);
    await expect(updateWrestler(db, 999, validInput, admin.id)).rejects.toThrow(ValidationError);
  });

  it("rejects invalid input", async () => {
    const { team, admin } = await setup(db);
    const wrestler = await createWrestler(db, team.id, validInput, admin.id);
    await expect(updateWrestler(db, wrestler.id, { ...validInput, sex: "X" }, admin.id)).rejects.toThrow(
      ValidationError
    );
  });
});
