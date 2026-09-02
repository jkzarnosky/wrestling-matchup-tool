CREATE TYPE "public"."sex" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."wrestler_history_action" AS ENUM('created_via_import', 'created_via_ui', 'edited');--> statement-breakpoint
CREATE TABLE "wrestler_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"wrestler_id" integer NOT NULL,
	"action" "wrestler_history_action" NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"changed_by" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wrestlers" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birthday" date NOT NULL,
	"weight_lbs" real NOT NULL,
	"skill_level" integer NOT NULL,
	"sex" "sex" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wrestlers_weight_positive" CHECK ("wrestlers"."weight_lbs" > 0),
	CONSTRAINT "wrestlers_skill_level_range" CHECK ("wrestlers"."skill_level" BETWEEN 1 AND 4)
);
--> statement-breakpoint
ALTER TABLE "wrestler_history" ADD CONSTRAINT "wrestler_history_wrestler_id_wrestlers_id_fk" FOREIGN KEY ("wrestler_id") REFERENCES "public"."wrestlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wrestler_history" ADD CONSTRAINT "wrestler_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wrestlers" ADD CONSTRAINT "wrestlers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wrestlers_team_name_birthday_unique" ON "wrestlers" USING btree ("team_id","first_name","last_name","birthday");