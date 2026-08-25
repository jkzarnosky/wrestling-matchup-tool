import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "team_rep"]);

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  conference: text("conference").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    teamId: integer("team_id").references(() => teams.id),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check(
      "team_id_matches_role",
      sql`(${table.role} = 'admin' AND ${table.teamId} IS NULL) OR (${table.role} = 'team_rep' AND ${table.teamId} IS NOT NULL)`
    ),
  ]
);

// One-time login codes, emailed to a user. Code itself is never stored -- only its hash, so a DB
// leak doesn't hand out usable codes (short-lived and single-use anyway, but no reason not to).
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  codeHash: text("code_hash").notNull(),
  requestedIp: text("requested_ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sessions are DB-backed (not stateless JWTs) so a session can be revoked -- see DECISIONS.md.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random token; also the (HMAC-signed) cookie value
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pending invites live in their own table rather than as incomplete `users` rows -- a `users`
// row always represents a real account with a real name; "pending vs accepted" is which table
// the invite is in, not an inferred state on a nullable column.
export const invites = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull(),
    teamId: integer("team_id").references(() => teams.id),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invites_token_unique").on(table.token),
    check(
      "invite_team_id_matches_role",
      sql`(${table.role} = 'admin' AND ${table.teamId} IS NULL) OR (${table.role} = 'team_rep' AND ${table.teamId} IS NOT NULL)`
    ),
  ]
);
