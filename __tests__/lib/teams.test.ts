import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { ValidationError, createTeam, listTeams, updateTeam } from "../../lib/teams";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("lib/teams", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates a team", async () => {
    const team = await createTeam(db, { name: "Ironclad", conference: "National" });
    expect(team).toMatchObject({ name: "Ironclad", conference: "National" });
  });

  it("rejects a team with no name", async () => {
    await expect(createTeam(db, { name: "  ", conference: "National" })).rejects.toThrow(ValidationError);
  });

  it("rejects a team with no conference", async () => {
    await expect(createTeam(db, { name: "Ironclad", conference: "" })).rejects.toThrow(ValidationError);
  });

  it("updates a team's name and conference", async () => {
    const team = await createTeam(db, { name: "Ironclad", conference: "National" });
    const updated = await updateTeam(db, team.id, { name: "Ironclad Wrestling Club", conference: "American" });
    expect(updated).toMatchObject({ name: "Ironclad Wrestling Club", conference: "American" });
  });

  it("rejects updating a nonexistent team", async () => {
    await expect(updateTeam(db, 999, { name: "Ghost", conference: "National" })).rejects.toThrow("Team not found.");
  });

  it("lists teams alphabetically by name", async () => {
    await createTeam(db, { name: "Summit", conference: "National" });
    await createTeam(db, { name: "Ironclad", conference: "American" });
    const teams = await listTeams(db);
    expect(teams.map((t: { name: string }) => t.name)).toEqual(["Ironclad", "Summit"]);
  });
});
