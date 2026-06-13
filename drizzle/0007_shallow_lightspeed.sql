CREATE TABLE "ai_usage_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"feature" text NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"estimated_token_count" integer DEFAULT 0 NOT NULL,
	"input_token_count" integer DEFAULT 0 NOT NULL,
	"output_token_count" integer DEFAULT 0 NOT NULL,
	"total_token_count" integer DEFAULT 0 NOT NULL,
	"blocked_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_buckets_scope_type_check" CHECK ("ai_usage_buckets"."scope_type" in ('user', 'global')),
	CONSTRAINT "ai_usage_buckets_feature_check" CHECK ("ai_usage_buckets"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions')),
	CONSTRAINT "ai_usage_buckets_period_check" CHECK ("ai_usage_buckets"."period" in ('day', 'week')),
	CONSTRAINT "ai_usage_buckets_scope_user_check" CHECK ((
        ("ai_usage_buckets"."scope_type" = 'user' and "ai_usage_buckets"."user_id" is not null)
        or ("ai_usage_buckets"."scope_type" = 'global' and "ai_usage_buckets"."user_id" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"status" text NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"estimated_input_tokens" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"finish_reason" text,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_events_feature_check" CHECK ("ai_usage_events"."feature" in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions')),
	CONSTRAINT "ai_usage_events_status_check" CHECK ("ai_usage_events"."status" in ('allowed', 'blocked', 'completed', 'failed')),
	CONSTRAINT "ai_usage_events_period_check" CHECK ("ai_usage_events"."period" in ('day', 'week'))
);
--> statement-breakpoint
ALTER TABLE "ai_usage_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" ADD CONSTRAINT "ai_usage_buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_buckets_user_id_idx" ON "ai_usage_buckets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_buckets_scope_idx" ON "ai_usage_buckets" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_buckets_scope_feature_period_unique" ON "ai_usage_buckets" USING btree ("scope_type","scope_id","feature","period","period_start");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_id_idx" ON "ai_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_events_feature_idx" ON "ai_usage_events" USING btree ("feature");--> statement-breakpoint
CREATE INDEX "ai_usage_events_status_idx" ON "ai_usage_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_usage_events_period_idx" ON "ai_usage_events" USING btree ("period","period_start");--> statement-breakpoint
CREATE POLICY "ai_usage_buckets_select_own" ON "ai_usage_buckets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "ai_usage_buckets"."user_id");--> statement-breakpoint
CREATE POLICY "ai_usage_events_select_own" ON "ai_usage_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "ai_usage_events"."user_id");