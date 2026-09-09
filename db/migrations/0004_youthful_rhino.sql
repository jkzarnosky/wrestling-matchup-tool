CREATE TABLE "matchup_run_teams" (
	"run_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "matchup_run_teams_run_id_team_id_pk" PRIMARY KEY("run_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "matchup_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matchup_run_teams" ADD CONSTRAINT "matchup_run_teams_run_id_matchup_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."matchup_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchup_run_teams" ADD CONSTRAINT "matchup_run_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD CONSTRAINT "matchup_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;