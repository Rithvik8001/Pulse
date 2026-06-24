CREATE TABLE "identity_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"window_days" integer DEFAULT 90 NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"identity_statement" text NOT NULL,
	"theme_bullets" jsonb NOT NULL,
	"evidence_bullets" jsonb NOT NULL,
	"next_identity_move" text NOT NULL,
	"model_id" text NOT NULL,
	"source_check_in_count" integer NOT NULL,
	"source_journal_count" integer NOT NULL,
	"source_story_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" DROP CONSTRAINT "ai_usage_buckets_feature_check";--> statement-breakpoint
ALTER TABLE "ai_usage_events" DROP CONSTRAINT "ai_usage_events_feature_check";--> statement-breakpoint
ALTER TABLE "identity_snapshots" ADD CONSTRAINT "identity_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_snapshots" ADD CONSTRAINT "identity_snapshots_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_snapshots_user_id_idx" ON "identity_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identity_snapshots_character_id_idx" ON "identity_snapshots" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_snapshots_user_period_unique" ON "identity_snapshots" USING btree ("user_id","period_end","window_days");--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" ADD CONSTRAINT "ai_usage_buckets_feature_check" CHECK ("ai_usage_buckets"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline'));--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_feature_check" CHECK ("ai_usage_events"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline'));--> statement-breakpoint
CREATE POLICY "identity_snapshots_select_own" ON "identity_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "identity_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "identity_snapshots_insert_own" ON "identity_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "identity_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "identity_snapshots_update_own" ON "identity_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "identity_snapshots"."user_id") WITH CHECK ((select auth.uid()) = "identity_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "identity_snapshots_delete_own" ON "identity_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "identity_snapshots"."user_id");