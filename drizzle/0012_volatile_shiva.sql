CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device_label" text NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminder_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"local_date" date NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text NOT NULL,
	"habit_count" integer DEFAULT 0 NOT NULL,
	"ai_used" boolean DEFAULT false NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_deliveries_kind_check" CHECK ("reminder_deliveries"."kind" in ('daily', 'evening', 'test')),
	CONSTRAINT "reminder_deliveries_status_check" CHECK ("reminder_deliveries"."status" in ('pending', 'sent', 'error', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_enabled" boolean DEFAULT false NOT NULL,
	"daily_minute" integer DEFAULT 1200 NOT NULL,
	"evening_enabled" boolean DEFAULT false NOT NULL,
	"evening_minute" integer DEFAULT 1230 NOT NULL,
	"soft_prompt_dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_settings_daily_minute_check" CHECK ("reminder_settings"."daily_minute" between 0 and 1425 and "reminder_settings"."daily_minute" % 15 = 0),
	CONSTRAINT "reminder_settings_evening_minute_check" CHECK ("reminder_settings"."evening_minute" between 0 and 1425 and "reminder_settings"."evening_minute" % 15 = 0),
	CONSTRAINT "reminder_settings_order_check" CHECK ("reminder_settings"."evening_minute" > "reminder_settings"."daily_minute")
);
--> statement-breakpoint
ALTER TABLE "reminder_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" DROP CONSTRAINT "ai_usage_buckets_feature_check";--> statement-breakpoint
ALTER TABLE "ai_usage_events" DROP CONSTRAINT "ai_usage_events_feature_check";--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "reminder_deliveries_user_created_idx" ON "reminder_deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_deliveries_dedupe_key_unique" ON "reminder_deliveries" USING btree ("dedupe_key");--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" ADD CONSTRAINT "ai_usage_buckets_feature_check" CHECK ("ai_usage_buckets"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline', 'journal-check-ins', 'reminder-nudge'));--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_feature_check" CHECK ("ai_usage_events"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline', 'journal-check-ins', 'reminder-nudge'));--> statement-breakpoint
CREATE POLICY "push_subscriptions_select_own" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete_own" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "reminder_deliveries_select_own" ON "reminder_deliveries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "reminder_deliveries"."user_id");--> statement-breakpoint
CREATE POLICY "reminder_settings_select_own" ON "reminder_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "reminder_settings"."user_id");--> statement-breakpoint
CREATE POLICY "reminder_settings_insert_own" ON "reminder_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "reminder_settings"."user_id");--> statement-breakpoint
CREATE POLICY "reminder_settings_update_own" ON "reminder_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "reminder_settings"."user_id") WITH CHECK ((select auth.uid()) = "reminder_settings"."user_id");