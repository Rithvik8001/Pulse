CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "characters" FROM "anon";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "characters" TO "authenticated";--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "quests" FROM "anon";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "quests" TO "authenticated";--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "characters_user_id_unique" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quests_user_id_idx" ON "quests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quests_character_id_idx" ON "quests" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quests_character_position_unique" ON "quests" USING btree ("character_id","position");--> statement-breakpoint
CREATE POLICY "characters_select_own" ON "characters" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "characters"."user_id");--> statement-breakpoint
CREATE POLICY "characters_insert_own" ON "characters" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "characters"."user_id");--> statement-breakpoint
CREATE POLICY "characters_update_own" ON "characters" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "characters"."user_id") WITH CHECK ((select auth.uid()) = "characters"."user_id");--> statement-breakpoint
CREATE POLICY "characters_delete_own" ON "characters" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "characters"."user_id");--> statement-breakpoint
CREATE POLICY "quests_select_own" ON "quests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "quests"."user_id");--> statement-breakpoint
CREATE POLICY "quests_insert_own" ON "quests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "quests"."user_id");--> statement-breakpoint
CREATE POLICY "quests_update_own" ON "quests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "quests"."user_id") WITH CHECK ((select auth.uid()) = "quests"."user_id");--> statement-breakpoint
CREATE POLICY "quests_delete_own" ON "quests" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "quests"."user_id");
