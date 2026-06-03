CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"quest_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"outcome" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "check_ins" FROM "anon";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "check_ins" TO "authenticated";--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_user_id_idx" ON "check_ins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "check_ins_character_id_idx" ON "check_ins" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "check_ins_quest_id_idx" ON "check_ins" USING btree ("quest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_user_quest_date_unique" ON "check_ins" USING btree ("user_id","quest_id","local_date");--> statement-breakpoint
CREATE POLICY "check_ins_select_own" ON "check_ins" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "check_ins"."user_id");--> statement-breakpoint
CREATE POLICY "check_ins_insert_own" ON "check_ins" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "check_ins"."user_id");--> statement-breakpoint
CREATE POLICY "check_ins_update_own" ON "check_ins" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "check_ins"."user_id") WITH CHECK ((select auth.uid()) = "check_ins"."user_id");--> statement-breakpoint
CREATE POLICY "check_ins_delete_own" ON "check_ins" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "check_ins"."user_id");
