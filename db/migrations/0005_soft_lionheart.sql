CREATE TYPE "public"."weight_diff_mode" AS ENUM('flat', 'percent');--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD COLUMN "age_diff_years" integer;--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD COLUMN "skill_diff_levels" integer;--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD COLUMN "weight_diff_mode" "weight_diff_mode";--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD COLUMN "weight_diff_value" real;--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD COLUMN "mat_count" integer;--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD CONSTRAINT "matchup_runs_age_diff_non_negative" CHECK ("matchup_runs"."age_diff_years" >= 0);--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD CONSTRAINT "matchup_runs_skill_diff_non_negative" CHECK ("matchup_runs"."skill_diff_levels" >= 0);--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD CONSTRAINT "matchup_runs_weight_diff_positive" CHECK ("matchup_runs"."weight_diff_value" > 0);--> statement-breakpoint
ALTER TABLE "matchup_runs" ADD CONSTRAINT "matchup_runs_mat_count_positive" CHECK ("matchup_runs"."mat_count" >= 1);