CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_settings_select_own" ON "user_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "user_settings"."user_id");--> statement-breakpoint
CREATE POLICY "user_settings_insert_own" ON "user_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "user_settings"."user_id");--> statement-breakpoint
CREATE POLICY "user_settings_update_own" ON "user_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "user_settings"."user_id") WITH CHECK ((select auth.uid()) = "user_settings"."user_id");