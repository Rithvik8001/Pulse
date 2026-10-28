"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { checkIns, quests } from "@/lib/db/schema";
import { coachActionSchema, type CoachAction } from "@/lib/pulse/coach-core";
import { requireUserId } from "@/lib/pulse/dashboard";
import { isUuid } from "@/lib/pulse/id-core";
import { upsertJournalEntry } from "@/lib/pulse/journal";
import { isLocalDate } from "@/lib/pulse/local-date-core";
import {
  archiveQuest,
  createQuest,
  restoreQuest,
  updateQuestSchedule,
  updateQuestTitle,
} from "@/lib/pulse/quests";
import { hasPushDevice, saveReminderSettingsForUser } from "@/lib/pulse/reminders";
import { reminderSettingsSchema } from "@/lib/pulse/reminders-core";
import { scheduleFromInput } from "@/lib/pulse/schedule-core";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export type CoachConfirmResult = {
  status: "success" | "error";
  message: string;
  questId?: string;
};

export async function confirmPulseCoachAction(
  action: CoachAction,
): Promise<CoachConfirmResult> {
  const parsed = coachActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      status: "error",
      message: "This change could not be made. Ask Pip again.",
    };
  }

  let result: CoachConfirmResult;

  switch (parsed.data.type) {
    case "createQuest":
      result = await createQuest(
        parsed.data.title,
        parsed.data.schedule ? scheduleFromInput(parsed.data.schedule) : undefined,
      );
      break;
    case "updateQuest":
      result = await updateQuestTitle(parsed.data.questId, parsed.data.title);
      break;
    case "archiveQuest":
      result = await archiveQuest(parsed.data.questId);
      break;
    case "restoreQuest":
      result = await restoreQuest(parsed.data.questId);
      break;
    case "updateQuestSchedule":
      result = await updateQuestSchedule(
        parsed.data.questId,
        scheduleFromInput(parsed.data.schedule),
      );
      break;
    case "saveCheckIn":
      result = await saveCoachCheckIn(parsed.data);
      break;
    case "saveJournal":
      result = await upsertJournalEntry(
        parsed.data.localDate,
        parsed.data.body,
      );
      break;
    case "updateReminders":
      result = await saveCoachReminders(parsed.data);
      break;
  }

  revalidatePulseCoachSurfaces();

  return result;
}

async function saveCoachCheckIn(
  action: Extract<CoachAction, { type: "saveCheckIn" }>,
): Promise<CoachConfirmResult> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const localDate = action.localDate;
  const cleanNote = action.note?.trim().replace(/\s+/g, " ") || null;

  if (!isLocalDate(localDate) || localDate > dateContext.today) {
    return {
      status: "error",
      message: "Check-ins can only be saved for today or an earlier day.",
    };
  }

  if (!isUuid(action.questId)) {
    return {
      status: "error",
      message: "This habit is no longer active. Reload the page and try again.",
    };
  }

  if (cleanNote && cleanNote.length > 240) {
    return {
      status: "error",
      message: "Keep the note to 240 characters or fewer.",
    };
  }

  const [quest] = await db
    .select({
      id: quests.id,
      characterId: quests.characterId,
      title: quests.title,
    })
    .from(quests)
    .where(
      and(
        eq(quests.id, action.questId),
        eq(quests.userId, userId),
        eq(quests.status, "active"),
        isNull(quests.archivedAt),
      ),
    )
    .limit(1);

  if (!quest) {
    return {
      status: "error",
      message: "This habit is no longer active. Reload the page and try again.",
    };
  }

  await db
    .insert(checkIns)
    .values({
      userId,
      characterId: quest.characterId,
      questId: quest.id,
      localDate,
      outcome: action.outcome,
      note: cleanNote,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [checkIns.userId, checkIns.questId, checkIns.localDate],
      set: {
        outcome: action.outcome,
        ...(cleanNote ? { note: cleanNote } : {}),
        updatedAt: new Date(),
      },
    });

  return {
    status: "success",
    message: `Saved ${quest.title} as ${action.outcome === "win" ? "done" : "skipped"}.`,
  };
}

async function saveCoachReminders(
  action: Extract<CoachAction, { type: "updateReminders" }>,
): Promise<CoachConfirmResult> {
  const userId = await requireUserId();
  const parsed = reminderSettingsSchema.safeParse(action);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Those reminder times could not be saved. Ask Pip again.",
    };
  }

  await saveReminderSettingsForUser(userId, parsed.data, { dismissPrompt: true });
  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: (await hasPushDevice(userId))
      ? "Reminders saved."
      : "Reminders saved. Turn on notifications in Settings to get them.",
  };
}

function revalidatePulseCoachSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/review");
}
