CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "journal_entries" FROM "anon";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "journal_entries" TO "authenticated";--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_entries_user_id_idx" ON "journal_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journal_entries_character_id_idx" ON "journal_entries" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "journal_entries_local_date_idx" ON "journal_entries" USING btree ("local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_user_date_unique" ON "journal_entries" USING btree ("user_id","local_date");--> statement-breakpoint
CREATE POLICY "journal_entries_select_own" ON "journal_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "journal_entries"."user_id");--> statement-breakpoint
CREATE POLICY "journal_entries_insert_own" ON "journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "journal_entries"."user_id");--> statement-breakpoint
CREATE POLICY "journal_entries_update_own" ON "journal_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "journal_entries"."user_id") WITH CHECK ((select auth.uid()) = "journal_entries"."user_id");--> statement-breakpoint
CREATE POLICY "journal_entries_delete_own" ON "journal_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "journal_entries"."user_id");
