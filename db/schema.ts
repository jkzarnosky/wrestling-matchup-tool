import { sql } from "drizzle-orm";
import { check, date, integer, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const sexEnum = pgEnum("sex", ["M", "F"]);

export const wrestlers = pgTable(
  "wrestlers",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthday: date("birthday", { mode: "date" }).notNull(),
    weightLbs: real("weight_lbs").notNull(),
    skillLevel: integer("skill_level").notNull(), // 1 = expert ... 4 = first-year, do not invert
    sex: sexEnum("sex").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Duplicate rule from the CSV-import AC: same team + name + birthday is the same wrestler.
    uniqueIndex("wrestlers_team_name_birthday_unique").on(
      table.teamId,
      table.firstName,
      table.lastName,
      table.birthday
    ),
    check("wrestlers_weight_positive", sql`${table.weightLbs} > 0`),
    check("wrestlers_skill_level_range", sql`${table.skillLevel} BETWEEN 1 AND 4`),
  ]
);

export const wrestlerHistoryActionEnum = pgEnum("wrestler_history_action", [
  "created_via_import",
  "created_via_ui",
  "edited",
]);

// Creation (either path) writes one marker row, not per-field history -- see DECISIONS.md. Edits
// write one row per changed field (field/oldValue/newValue set; null on marker rows).
export const wrestlerHistory = pgTable("wrestler_history", {
  id: serial("id").primaryKey(),
  wrestlerId: integer("wrestler_id")
    .notNull()
    .references(() => wrestlers.id),
  action: wrestlerHistoryActionEnum("action").notNull(),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: integer("changed_by")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
