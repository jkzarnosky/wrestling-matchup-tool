import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { invites, users } from "../db/schema";
import type { AppDb } from "../db/types";
import { createSessionForUser } from "./auth";
import { sendInviteEmail } from "./email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days -- not specified in the AC, see DECISIONS.md

export class ValidationError extends Error {}

interface CreateInviteInput {
  email?: string;
  role?: string;
  teamId?: number | null;
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function createInvite(db: AppDb, input: CreateInviteInput) {
  const email = input.email?.trim();
  if (!email) throw new ValidationError("Email is required.");
  if (input.role !== "admin" && input.role !== "team_rep") {
    throw new ValidationError("Role must be admin or team_rep.");
  }
  if (input.role === "team_rep" && !input.teamId) {
    throw new ValidationError("Team Reps must be invited to a team.");
  }
  if (input.role === "admin" && input.teamId) {
    throw new ValidationError("Admins can't be assigned a team.");
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    throw new ValidationError("This email already has an account.");
  }

  const token = randomBytes(32).toString("hex");
  const [invite] = await db
    .insert(invites)
    .values({
      email,
      role: input.role,
      teamId: input.role === "team_rep" ? input.teamId : null,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();

  await sendInviteEmail(email, `${appUrl()}/invite/${token}`);
  return invite;
}

export async function listInvites(db: AppDb) {
  return db.select().from(invites).orderBy(invites.createdAt);
}

/** Accepts an invite: creates the real user account and logs them in. Returns the signed
 * session cookie value, or null if the token is unknown, already used, or expired. */
export async function acceptInvite(
  db: AppDb,
  token: string,
  input: { firstName?: string; lastName?: string }
): Promise<string | null> {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  if (!firstName || !lastName) throw new ValidationError("First and last name are required.");

  const [invite] = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt.getTime() <= Date.now()) return null;

  const [user] = await db
    .insert(users)
    .values({ email: invite.email, role: invite.role, teamId: invite.teamId, firstName, lastName })
    .returning();

  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));

  return createSessionForUser(db, user.id);
}
