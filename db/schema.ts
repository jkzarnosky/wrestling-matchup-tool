import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

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
