ALTER TABLE "quests" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "archived_at" timestamp with time zone;