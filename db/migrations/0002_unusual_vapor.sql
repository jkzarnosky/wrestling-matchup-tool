CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"team_id" integer,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_team_id_matches_role" CHECK (("invites"."role" = 'admin' AND "invites"."team_id" IS NULL) OR ("invites"."role" = 'team_rep' AND "invites"."team_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invites_token_unique" ON "invites" USING btree ("token");