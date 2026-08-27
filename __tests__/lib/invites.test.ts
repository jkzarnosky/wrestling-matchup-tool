import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { invites, teams, users } from "../../db/schema";
import { createTestDb } from "../db/test-db";
import { ValidationError, acceptInvite, createInvite, listInvites } from "../../lib/invites";
import { getSessionUser } from "../../lib/auth";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function insertTeam(db: TestDb) {
  const [team] = await db.insert(teams).values({ name: "Ironclad", conference: "National" }).returning();
  return team;
}

/** Captures the invite URL/token from the dev-fallback console.warn, since RESEND_API_KEY isn't
 * set in tests. */
async function createInviteAndCaptureToken(db: TestDb, input: Parameters<typeof createInvite>[1]) {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const invite = await createInvite(db, input);
  warnSpy.mockRestore();
  return invite.token as string;
}

describe("lib/invites", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates a Team Rep invite tied to a team", async () => {
    const team = await insertTeam(db);
    const invite = await createInvite(db, { email: "rep@example.com", role: "team_rep", teamId: team.id });
    expect(invite).toMatchObject({ email: "rep@example.com", role: "team_rep", teamId: team.id });
  });

  it("creates an Admin invite with no team", async () => {
    const invite = await createInvite(db, { email: "admin2@example.com", role: "admin" });
    expect(invite.teamId).toBeNull();
  });

  it("rejects a Team Rep invite with no team", async () => {
    await expect(createInvite(db, { email: "rep@example.com", role: "team_rep" })).rejects.toThrow(ValidationError);
  });

  it("rejects an Admin invite with a team", async () => {
    const team = await insertTeam(db);
    await expect(createInvite(db, { email: "admin2@example.com", role: "admin", teamId: team.id })).rejects.toThrow(
      ValidationError
    );
  });

  it("rejects inviting an email that's already a user", async () => {
    await db.insert(users).values({ email: "admin@example.com", role: "admin", firstName: "Jack", lastName: "Z" });
    await expect(createInvite(db, { email: "admin@example.com", role: "admin" })).rejects.toThrow(ValidationError);
  });

  it("accepts a valid invite: creates the user, marks accepted, logs them in", async () => {
    const team = await insertTeam(db);
    const token = await createInviteAndCaptureToken(db, { email: "rep@example.com", role: "team_rep", teamId: team.id });

    const cookieValue = await acceptInvite(db, token, { firstName: "Sam", lastName: "Rep" });
    expect(cookieValue).not.toBeNull();

    const sessionUser = await getSessionUser(db, cookieValue!);
    expect(sessionUser).toMatchObject({ email: "rep@example.com", firstName: "Sam", lastName: "Rep", teamId: team.id });

    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    expect(invite.acceptedAt).not.toBeNull();
  });

  it("rejects accepting the same invite twice", async () => {
    const token = await createInviteAndCaptureToken(db, { email: "admin2@example.com", role: "admin" });
    await acceptInvite(db, token, { firstName: "A", lastName: "B" });

    const second = await acceptInvite(db, token, { firstName: "C", lastName: "D" });
    expect(second).toBeNull();
  });

  it("rejects an expired invite", async () => {
    const token = await createInviteAndCaptureToken(db, { email: "admin2@example.com", role: "admin" });
    await db.update(invites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invites.token, token));

    const result = await acceptInvite(db, token, { firstName: "A", lastName: "B" });
    expect(result).toBeNull();
  });

  it("rejects an unknown token", async () => {
    const result = await acceptInvite(db, "not-a-real-token", { firstName: "A", lastName: "B" });
    expect(result).toBeNull();
  });

  it("lists invites", async () => {
    await createInviteAndCaptureToken(db, { email: "admin2@example.com", role: "admin" });
    const list = await listInvites(db);
    expect(list).toHaveLength(1);
  });
});
