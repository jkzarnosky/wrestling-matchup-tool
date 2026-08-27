import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { otpCodes, sessions, users } from "../db/schema";
import { sendLoginCodeEmail } from "./email";
import { signSessionToken, verifySessionToken } from "./session-cookie";

// Loosely typed on purpose: real requests use the Neon-backed db (db/index.ts), tests use an
// in-memory pglite db (__tests__/db/test-db.ts) -- both are drizzle instances over the same
// schema, but their driver-specific generic types don't unify cleanly.
type AppDb = any;

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

export class RateLimitError extends Error {}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function codesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Requests a login code for `email`. Always resolves without error, whether or not the email
 * belongs to a real user -- doesn't reveal which emails are registered. Throws RateLimitError if
 * too many codes have already been requested for this user recently. */
export async function requestLoginCode(db: AppDb, email: string, requestedIp?: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, user.id), gt(otpCodes.createdAt, windowStart)));
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RateLimitError("Too many login codes requested — try again later.");
  }

  const code = generateCode();
  await db.insert(otpCodes).values({
    userId: user.id,
    codeHash: hashCode(code),
    requestedIp: requestedIp ?? null,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  await sendLoginCodeEmail(user.email, code);
}

/** Creates a session for `userId` and returns the signed cookie value to set. Shared by
 * verifyLoginCode and invite-acceptance (lib/invites.ts) -- both end in "now log them in". */
export async function createSessionForUser(db: AppDb, userId: number): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return signSessionToken(sessionId);
}

/** Verifies a login code and, if valid, creates a session. Returns the signed cookie value to
 * set, or null if the email/code combination isn't valid. */
export async function verifyLoginCode(db: AppDb, email: string, code: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return null;

  const candidates = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, user.id), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt));

  const match = candidates.find((row: typeof otpCodes.$inferSelect) => codesMatch(row.codeHash, hashCode(code)));
  if (!match) return null;

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, match.id));

  return createSessionForUser(db, user.id);
}

/** Resolves a session cookie value to its user, or null if the cookie is missing, tampered
 * with, unknown, or expired. */
export async function getSessionUser(db: AppDb, cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const sessionId = verifySessionToken(cookieValue);
  if (!sessionId) return null;

  const [row] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row || row.session.expiresAt.getTime() <= Date.now()) return null;
  return row.user;
}

export async function destroySession(db: AppDb, cookieValue: string | undefined): Promise<void> {
  if (!cookieValue) return;
  const sessionId = verifySessionToken(cookieValue);
  if (!sessionId) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
