import "server-only";

import { generateText, Output } from "ai";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { checkIns, journalEntries, quests } from "@/lib/db/schema";
import { logError } from "@/lib/observability/logger";
import { aiModel, hasAiKey, missingAiKeyMessage } from "@/lib/pulse/ai-provider";
import {
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { requireUserId } from "@/lib/pulse/dashboard";
import { isUuid } from "@/lib/pulse/id-core";
import {
  buildJournalCheckInDrafts,
  buildJournalCheckInPrompt,
  cleanJournalCheckInNote,
  journalCheckInModel,
  journalCheckInOutputSchema,
  journalCheckInSaveSchema,
  journalCheckInSystemPrompt,
  type JournalCheckInDraft,
} from "@/lib/pulse/journal-check-ins-core";
import { validateJournalDate } from "@/lib/pulse/journal-core";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export type FindJournalCheckInsResult =
  | { status: "success"; drafts: JournalCheckInDraft[] }
  | { status: "error"; message: string };

export type SaveJournalCheckInsResult = {
  status: "success" | "error";
  message: string;
  savedCount: number;
};

export async function findJournalCheckIns(
  localDate: string,
): Promise<FindJournalCheckInsResult> {
  if (!hasAiKey()) {
    return { status: "error", message: missingAiKeyMessage };
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const dateError = validateJournalDate(localDate, dateContext.today);

  if (dateError) {
    return { status: "error", message: dateError };
  }

  const [[entry], habits, existing] = await Promise.all([
    db
      .select({ body: journalEntries.body })
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.localDate, localDate)))
      .limit(1),
    db
      .select({ id: quests.id, title: quests.title })
      .from(quests)
      .where(and(eq(quests.userId, userId), eq(quests.status, "active"), isNull(quests.archivedAt)))
      .orderBy(asc(quests.position)),
    db
      .select({ questId: checkIns.questId, outcome: checkIns.outcome })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, localDate))),
  ]);

  if (!entry) {
    return { status: "error", message: "Save the entry first, then try again." };
  }

  if (habits.length === 0) {
    return { status: "error", message: "Add a habit on the Habits page first." };
  }

  const prompt = buildJournalCheckInPrompt({ body: entry.body, habits });
  const reservation = await reserveAiUsage({
    userId,
    feature: "journal-check-ins",
    estimatedInputTokens: estimateAiTextTokens(`${journalCheckInSystemPrompt}\n${prompt}`),
    metadata: {
      action: "findJournalCheckIns",
      habitCount: habits.length,
    },
  });

  if (!reservation.allowed) {
    return { status: "error", message: reservation.message };
  }

  try {
    const { output, totalUsage, finishReason } = await generateText({
      model: aiModel(journalCheckInModel),
      output: Output.object({ schema: journalCheckInOutputSchema }),
      system: journalCheckInSystemPrompt,
      prompt,
      providerOptions: reservation.providerOptions,
      maxOutputTokens: reservation.maxOutputTokens,
    });
    await completeAiUsage({
      eventId: reservation.eventId,
      usage: totalUsage,
      finishReason,
    });

    return {
      status: "success",
      drafts: buildJournalCheckInDrafts({ matches: output.matches, habits, existing }),
    };
  } catch (error) {
    logError({
      event: "journal_check_ins_failed",
      message: "Journal check-in matching failed.",
      feature: "journal-check-ins",
      userId,
      error,
      metadata: { habitCount: habits.length },
    });
    await failAiUsage({ eventId: reservation.eventId, error });

    return { status: "error", message: "Pip could not read this entry. Try again." };
  }
}

export async function saveJournalCheckIns(input: unknown): Promise<SaveJournalCheckInsResult> {
  const parsed = journalCheckInSaveSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", message: "Tick at least one check-in, then save.", savedCount: 0 };
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const { localDate, items } = parsed.data;
  const dateError = validateJournalDate(localDate, dateContext.today);

  if (dateError) {
    return { status: "error", message: dateError, savedCount: 0 };
  }

  const questIds = [...new Set(items.map((item) => item.questId))];

  if (questIds.length !== items.length || !questIds.every(isUuid)) {
    return {
      status: "error",
      message: "These check-ins could not be saved. Reload the page and try again.",
      savedCount: 0,
    };
  }

  const savedCount = await db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: quests.id, characterId: quests.characterId })
      .from(quests)
      .where(
        and(
          eq(quests.userId, userId),
          eq(quests.status, "active"),
          isNull(quests.archivedAt),
          inArray(quests.id, questIds),
        ),
      );

    if (owned.length !== questIds.length) {
      return null;
    }

    const characterById = new Map(owned.map((quest) => [quest.id, quest.characterId]));
    const now = new Date();

    for (const item of items) {
      const characterId = characterById.get(item.questId);

      if (!characterId) {
        continue;
      }

      const note = cleanJournalCheckInNote(item.note) || null;

      await tx
        .insert(checkIns)
        .values({
          userId,
          characterId,
          questId: item.questId,
          localDate,
          outcome: item.outcome,
          note,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [checkIns.userId, checkIns.questId, checkIns.localDate],
          set: {
            outcome: item.outcome,
            ...(note ? { note } : {}),
            updatedAt: now,
          },
        });
    }

    return items.length;
  });

  if (savedCount === null) {
    return {
      status: "error",
      message: "One of these habits is no longer active. Reload the page and try again.",
      savedCount: 0,
    };
  }

  return {
    status: "success",
    message: savedCount === 1 ? "Saved 1 check-in." : `Saved ${savedCount} check-ins.`,
    savedCount,
  };
}
