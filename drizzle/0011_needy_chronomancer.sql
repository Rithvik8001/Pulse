CREATE TABLE "quest_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"weekdays" smallint,
	"times_per_week" smallint,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quest_schedules_kind_check" CHECK ("quest_schedules"."kind" in ('daily', 'weekdays', 'weekly', 'paused')),
	CONSTRAINT "quest_schedules_shape_check" CHECK ((
        ("quest_schedules"."kind" = 'weekdays' and "quest_schedules"."weekdays" between 1 and 127 and "quest_schedules"."times_per_week" is null)
        or ("quest_schedules"."kind" = 'weekly' and "quest_schedules"."times_per_week" between 1 and 6 and "quest_schedules"."weekdays" is null)
        or ("quest_schedules"."kind" in ('daily', 'paused') and "quest_schedules"."weekdays" is null and "quest_schedules"."times_per_week" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "quest_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quest_schedules" ADD CONSTRAINT "quest_schedules_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_schedules" ADD CONSTRAINT "quest_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quest_schedules_user_id_idx" ON "quest_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quest_schedules_quest_effective_unique" ON "quest_schedules" USING btree ("quest_id","effective_from");--> statement-breakpoint
CREATE POLICY "quest_schedules_select_own" ON "quest_schedules" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "quest_schedules"."user_id");--> statement-breakpoint
CREATE POLICY "quest_schedules_insert_own" ON "quest_schedules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "quest_schedules"."user_id");--> statement-breakpoint
CREATE POLICY "quest_schedules_update_own" ON "quest_schedules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "quest_schedules"."user_id") WITH CHECK ((select auth.uid()) = "quest_schedules"."user_id");--> statement-breakpoint
CREATE POLICY "quest_schedules_delete_own" ON "quest_schedules" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "quest_schedules"."user_id");--> statement-breakpoint
INSERT INTO "quest_schedules" ("quest_id", "user_id", "kind", "effective_from")
SELECT q."id", q."user_id", 'daily',
  LEAST(
    (q."created_at" AT TIME ZONE COALESCE(us."time_zone", 'UTC'))::date,
    COALESCE((SELECT min(c."local_date") FROM "check_ins" c WHERE c."quest_id" = q."id"), 'infinity'::date)
  )
FROM "quests" q
LEFT JOIN "user_settings" us ON us."user_id" = q."user_id"
ON CONFLICT ("quest_id", "effective_from") DO NOTHING;
--> statement-breakpoint
INSERT INTO "quest_schedules" ("quest_id", "user_id", "kind", "effective_from")
SELECT q."id", q."user_id", 'paused', (q."archived_at" AT TIME ZONE COALESCE(us."time_zone", 'UTC'))::date
FROM "quests" q
LEFT JOIN "user_settings" us ON us."user_id" = q."user_id"
WHERE q."status" = 'archived' AND q."archived_at" IS NOT NULL
ON CONFLICT ("quest_id", "effective_from") DO UPDATE SET "kind" = 'paused', "weekdays" = NULL, "times_per_week" = NULL;
