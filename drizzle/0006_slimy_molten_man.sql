CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"recipient" text NOT NULL,
	"resend_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_type_check" CHECK ("email_deliveries"."type" in ('welcome', 'weekly_digest')),
	CONSTRAINT "email_deliveries_status_check" CHECK ("email_deliveries"."status" in ('pending', 'sent', 'error', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "email_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"product_emails_enabled" boolean DEFAULT true NOT NULL,
	"weekly_digest_enabled" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"welcome_email_sent_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_deliveries_user_id_idx" ON "email_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_type_idx" ON "email_deliveries" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_dedupe_key_unique" ON "email_deliveries" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "email_preferences_user_id_unique" ON "email_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_preferences_unsubscribe_token_unique" ON "email_preferences" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE POLICY "email_deliveries_select_own" ON "email_deliveries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "email_deliveries"."user_id");--> statement-breakpoint
CREATE POLICY "email_preferences_select_own" ON "email_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "email_preferences"."user_id");--> statement-breakpoint
CREATE POLICY "email_preferences_insert_own" ON "email_preferences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "email_preferences"."user_id");--> statement-breakpoint
CREATE POLICY "email_preferences_update_own" ON "email_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "email_preferences"."user_id") WITH CHECK ((select auth.uid()) = "email_preferences"."user_id");