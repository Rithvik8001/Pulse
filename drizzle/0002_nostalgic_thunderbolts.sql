CREATE TABLE "weekly_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"letter_body" text NOT NULL,
	"pattern_bullets" jsonb NOT NULL,
	"next_quest" text NOT NULL,
	"model_id" text NOT NULL,
	"source_check_in_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_stories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "weekly_stories" FROM "anon";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "weekly_stories" TO "authenticated";--> statement-breakpoint
ALTER TABLE "weekly_stories" ADD CONSTRAINT "weekly_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_stories" ADD CONSTRAINT "weekly_stories_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_stories_user_id_idx" ON "weekly_stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weekly_stories_character_id_idx" ON "weekly_stories" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_stories_user_week_unique" ON "weekly_stories" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE POLICY "weekly_stories_select_own" ON "weekly_stories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "weekly_stories"."user_id");--> statement-breakpoint
CREATE POLICY "weekly_stories_insert_own" ON "weekly_stories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "weekly_stories"."user_id");--> statement-breakpoint
CREATE POLICY "weekly_stories_update_own" ON "weekly_stories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "weekly_stories"."user_id") WITH CHECK ((select auth.uid()) = "weekly_stories"."user_id");--> statement-breakpoint
CREATE POLICY "weekly_stories_delete_own" ON "weekly_stories" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "weekly_stories"."user_id");
