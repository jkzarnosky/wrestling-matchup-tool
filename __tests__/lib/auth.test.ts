import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { otpCodes, users } from "../../db/schema";
import { createTestDb } from "../db/test-db";
import { RateLimitError, destroySession, getSessionUser, requestLoginCode, verifyLoginCode } from "../../lib/auth";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function insertUser(db: TestDb, email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, role: "admin", firstName: "Jack", lastName: "Z" })
    .returning();
  return user;
}

/** Reads the plaintext code back out via console.warn's dev-fallback log, since RESEND_API_KEY
 * isn't set in tests -- lib/email.ts logs the code instead of sending it. */
async function requestAndCaptureCode(db: TestDb, email: string): Promise<string> {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  await requestLoginCode(db, email);
  const message = warnSpy.mock.calls.at(-1)?.[0] as string;
  warnSpy.mockRestore();
  const match = message?.match(/Login code for .+: (\d{6})/);
  if (!match) throw new Error(`Couldn't extract code from log message: ${message}`);
  return match[1];
}

describe("lib/auth", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("does nothing for an email with no matching user", async () => {
    await requestLoginCode(db, "nobody@example.com");
    const rows = await db.select().from(otpCodes);
    expect(rows).toHaveLength(0);
  });

  it("rate-limits after 5 code requests within the window", async () => {
    const user = await insertUser(db, "admin@example.com");
    for (let i = 0; i < 5; i++) {
      await requestLoginCode(db, user.email);
    }
    await expect(requestLoginCode(db, user.email)).rejects.toThrow(RateLimitError);
  });

  it("verifies a correct code and creates a usable session", async () => {
    const user = await insertUser(db, "admin@example.com");
    const code = await requestAndCaptureCode(db, user.email);

    const cookieValue = await verifyLoginCode(db, user.email, code);
    expect(cookieValue).not.toBeNull();

    const sessionUser = await getSessionUser(db, cookieValue!);
    expect(sessionUser?.email).toBe(user.email);
  });

  it("rejects an incorrect code", async () => {
    const user = await insertUser(db, "admin@example.com");
    await requestAndCaptureCode(db, user.email);

    const cookieValue = await verifyLoginCode(db, user.email, "000000");
    expect(cookieValue).toBeNull();
  });

  it("rejects a code that's already been used", async () => {
    const user = await insertUser(db, "admin@example.com");
    const code = await requestAndCaptureCode(db, user.email);

    const first = await verifyLoginCode(db, user.email, code);
    expect(first).not.toBeNull();

    const second = await verifyLoginCode(db, user.email, code);
    expect(second).toBeNull();
  });

  it("rejects an expired code", async () => {
    const user = await insertUser(db, "admin@example.com");
    const code = await requestAndCaptureCode(db, user.email);

    await db.update(otpCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(otpCodes.userId, user.id));

    const cookieValue = await verifyLoginCode(db, user.email, code);
    expect(cookieValue).toBeNull();
  });

  it("rejects a tampered session cookie", async () => {
    const user = await insertUser(db, "admin@example.com");
    const code = await requestAndCaptureCode(db, user.email);
    const cookieValue = await verifyLoginCode(db, user.email, code);

    const tampered = cookieValue!.slice(0, -1) + (cookieValue!.at(-1) === "a" ? "b" : "a");
    const sessionUser = await getSessionUser(db, tampered);
    expect(sessionUser).toBeNull();
  });

  it("logs out by destroying the session", async () => {
    const user = await insertUser(db, "admin@example.com");
    const code = await requestAndCaptureCode(db, user.email);
    const cookieValue = await verifyLoginCode(db, user.email, code);

    await destroySession(db, cookieValue!);

    const sessionUser = await getSessionUser(db, cookieValue!);
    expect(sessionUser).toBeNull();
  });
});
