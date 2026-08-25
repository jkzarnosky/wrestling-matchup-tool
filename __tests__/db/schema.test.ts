import { beforeEach, describe, expect, it } from "vitest";
import { teams, users } from "../../db/schema";
import { createTestDb } from "./test-db";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("users/teams schema", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates an Admin with no team", async () => {
    const [admin] = await db
      .insert(users)
      .values({ email: "admin@example.com", role: "admin", firstName: "Jack", lastName: "Z" })
      .returning();

    expect(admin.teamId).toBeNull();
  });

  it("creates a Team Rep with a team", async () => {
    const [team] = await db.insert(teams).values({ name: "Ironclad", conference: "National" }).returning();

    const [rep] = await db
      .insert(users)
      .values({ email: "rep@example.com", role: "team_rep", firstName: "Sam", lastName: "Rep", teamId: team.id })
      .returning();

    expect(rep.teamId).toBe(team.id);
  });

  it("rejects an Admin with a team assigned", async () => {
    const [team] = await db.insert(teams).values({ name: "Ironclad", conference: "National" }).returning();

    await expect(
      db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "Jack", lastName: "Z", teamId: team.id })
    ).rejects.toThrow();
  });

  it("rejects a Team Rep with no team", async () => {
    await expect(
      db.insert(users).values({ email: "rep@example.com", role: "team_rep", firstName: "Sam", lastName: "Rep" })
    ).rejects.toThrow();
  });

  it("rejects a duplicate email", async () => {
    await db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "Jack", lastName: "Z" });

    await expect(
      db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "Someone", lastName: "Else" })
    ).rejects.toThrow();
  });
});
