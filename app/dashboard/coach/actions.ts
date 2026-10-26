"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { checkIns, quests } from "@/lib/db/schema";
import { coachActionSchema, type CoachAction } from "@/lib/pulse/coach-core";
import { requireUserId } from "@/lib/pulse/dashboard";
import { upsertJournalEntry } from "@/lib/pulse/journal";
import {
  createQuest,
  removeQuest,
  restoreQuest,
  updateQuestTitle,
} from "@/lib/pulse/quests";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export type CoachConfirmResult = {
  status: "success" | "error";
  message: string;
};

export async function confirmPulseCoachAction(
  action: CoachAction,
): Promise<CoachConfirmResult> {
  const parsed = coachActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      status: "error",
      message: "This change could not be made. Ask the assistant again.",
    };
  }

  let result: CoachConfirmResult;

  switch (parsed.data.type) {
    case "createQuest":
      result = await createQuest(parsed.data.title);
      break;
    case "updateQuest":
      result = await updateQuestTitle(parsed.data.questId, parsed.data.title);
      break;
    case "archiveQuest":
      result = await removeQuest(parsed.data.questId);
      break;
    case "restoreQuest":
      result = await restoreQuest(parsed.data.questId);
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
  }

  revalidatePulseCoachSurfaces();

  return result;
}

async function saveCoachCheckIn(
  action: Extract<CoachAction, { type: "saveCheckIn" }>,
): Promise<CoachConfirmResult> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(action.localDate)
    ? action.localDate
    : dateContext.today;
  const cleanNote = action.note?.trim().replace(/\s+/g, " ") || null;

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
        note: cleanNote,
        updatedAt: new Date(),
      },
    });

  return {
    status: "success",
    message: `Saved ${quest.title} as ${action.outcome === "win" ? "done" : "skipped"}.`,
  };
}

function revalidatePulseCoachSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/review");
}
