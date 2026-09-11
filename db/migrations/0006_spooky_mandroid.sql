CREATE TABLE "matchup_run_pairings" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"mat_number" integer,
	"wrestler_one_id" integer NOT NULL,
	"wrestler_two_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matchup_run_pairings_no_self_match" CHECK ("matchup_run_pairings"."wrestler_one_id" != "matchup_run_pairings"."wrestler_two_id"),
	CONSTRAINT "matchup_run_pairings_mat_iff_matched" CHECK (("matchup_run_pairings"."wrestler_two_id" IS NULL AND "matchup_run_pairings"."mat_number" IS NULL) OR ("matchup_run_pairings"."wrestler_two_id" IS NOT NULL AND "matchup_run_pairings"."mat_number" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "matchup_run_pairings" ADD CONSTRAINT "matchup_run_pairings_run_id_matchup_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."matchup_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchup_run_pairings" ADD CONSTRAINT "matchup_run_pairings_wrestler_one_id_wrestlers_id_fk" FOREIGN KEY ("wrestler_one_id") REFERENCES "public"."wrestlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchup_run_pairings" ADD CONSTRAINT "matchup_run_pairings_wrestler_two_id_wrestlers_id_fk" FOREIGN KEY ("wrestler_two_id") REFERENCES "public"."wrestlers"("id") ON DELETE no action ON UPDATE no action;