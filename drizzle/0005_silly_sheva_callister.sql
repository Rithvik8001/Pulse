DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "quests"
    WHERE "status" NOT IN ('active', 'archived')
  ) THEN
    RAISE EXCEPTION 'Cannot add quests_status_check: invalid quest status exists.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "check_ins"
    WHERE "outcome" NOT IN ('win', 'pass')
  ) THEN
    RAISE EXCEPTION 'Cannot add check_ins_outcome_check: invalid check-in outcome exists.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "user_id"
      FROM "quests"
      WHERE "status" = 'active'
        AND "archived_at" IS NULL
      GROUP BY "user_id"
      HAVING count(*) > 12
    ) AS over_limit
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active Quest limit: a user has more than 12 active Quests.';
  END IF;
END $$;
--> statement-breakpoint
UPDATE "quests"
SET "archived_at" = NULL
WHERE "status" = 'active'
  AND "archived_at" IS NOT NULL;
--> statement-breakpoint
UPDATE "quests"
SET "archived_at" = coalesce("archived_at", "updated_at", now())
WHERE "status" = 'archived'
  AND "archived_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_outcome_check" CHECK ("check_ins"."outcome" in ('win', 'pass'));
--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_status_check" CHECK ("quests"."status" in ('active', 'archived'));
--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_archive_state_check" CHECK ((
  ("quests"."status" = 'active' and "quests"."archived_at" is null)
  or ("quests"."status" = 'archived' and "quests"."archived_at" is not null)
));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_active_quest_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.status = 'active' AND NEW.archived_at IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 12012));

    SELECT count(*)
    INTO active_count
    FROM public.quests
    WHERE user_id = NEW.user_id
      AND status = 'active'
      AND archived_at IS NULL
      AND id <> NEW.id;

    IF active_count >= 12 THEN
      RAISE EXCEPTION 'active quest limit exceeded'
        USING ERRCODE = '23514',
              CONSTRAINT = 'quests_active_limit_check';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS quests_active_limit_trigger ON "quests";
--> statement-breakpoint
CREATE TRIGGER quests_active_limit_trigger
BEFORE INSERT OR UPDATE OF "user_id", "status", "archived_at"
ON "quests"
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_quest_limit();
