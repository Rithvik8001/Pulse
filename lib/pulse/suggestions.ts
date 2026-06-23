import "server-only";

import { generateText, Output } from "ai";
import { and, count, eq, gte, isNull, max, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { checkIns, quests } from "@/lib/db/schema";
import { logError } from "@/lib/observability/logger";
import {
  AiLimitReachedError,
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { requireUserId } from "@/lib/pulse/dashboard";
import {
  offsetLocalDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";
import { activeQuestLimit } from "@/lib/pulse/quests";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";

export type SuggestionType = "archive" | "reword" | "restore";

export type QuestSuggestion = {
  type: SuggestionType;
  questId: string;
  questTitle: string;
  reason: string;
};

type ActiveQuestRow = {
  id: string;
  title: string;
  createdAt: Date;
  lastCheckInDate: string | null;
  totalCheckInCount: number;
  recentCheckInCount: number;
  recentWinCount: number;
};

type ArchivedQuestRow = {
  id: string;
  title: string;
  archivedAt: Date | null;
  totalCheckInCount: number;
  allTimeWinCount: number;
};

export type SuggestionsRawData = {
  activeQuests: ActiveQuestRow[];
  archivedQuests: ArchivedQuestRow[];
  activeQuestCount: number;
  sevenDaysAgo: string;
  fourteenDaysAgo: string;
  twentyOneDaysAgo: string;
  thirtyDaysAgo: string;
};

export class MissingAiKeyError extends Error {
  constructor() {
    super(
      "Add AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN to your environment to generate reword suggestions.",
    );
    this.name = "MissingAiKeyError";
  }
}

export async function getSuggestionsData(): Promise<SuggestionsRawData> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getSuggestionsDataForUser(userId, dateContext);
}

export async function getSuggestionsDataForUser(
  userId: string,
  dateContext: UserLocalDateContext,
): Promise<SuggestionsRawData> {
  const sevenDaysAgo = offsetLocalDate(dateContext.today, -7);
  const fourteenDaysAgo = offsetLocalDate(dateContext.today, -14);
  const twentyOneDaysAgo = offsetLocalDate(dateContext.today, -21);
  const thirtyDaysAgo = offsetLocalDate(dateContext.today, -30);

  const [activeRows, archivedRows] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        createdAt: quests.createdAt,
        lastCheckInDate: max(checkIns.localDate),
        totalCheckInCount: count(checkIns.id),
        recentCheckInCount: sql<number>`count(${checkIns.id}) FILTER (
          WHERE ${checkIns.localDate} >= ${thirtyDaysAgo}
        )::int`,
        recentWinCount: sql<number>`count(${checkIns.id}) FILTER (
          WHERE ${checkIns.localDate} >= ${thirtyDaysAgo}
          AND ${checkIns.outcome} = 'win'
        )::int`,
      })
      .from(quests)
      .leftJoin(checkIns, eq(checkIns.questId, quests.id))
      .where(
        and(
          eq(quests.userId, userId),
          eq(quests.status, "active"),
          isNull(quests.archivedAt),
        ),
      )
      .groupBy(quests.id),
    db
      .select({
        id: quests.id,
        title: quests.title,
        archivedAt: quests.archivedAt,
        totalCheckInCount: count(checkIns.id),
        allTimeWinCount: sql<number>`count(${checkIns.id}) FILTER (
          WHERE ${checkIns.outcome} = 'win'
        )::int`,
      })
      .from(quests)
      .leftJoin(checkIns, eq(checkIns.questId, quests.id))
      .where(and(eq(quests.userId, userId), eq(quests.status, "archived")))
      .groupBy(quests.id),
  ]);

  return {
    activeQuests: activeRows as ActiveQuestRow[],
    archivedQuests: archivedRows as ArchivedQuestRow[],
    activeQuestCount: activeRows.length,
    sevenDaysAgo,
    fourteenDaysAgo,
    twentyOneDaysAgo,
    thirtyDaysAgo,
  };
}

export function computeSuggestions(raw: SuggestionsRawData): QuestSuggestion[] {
  const {
    activeQuests,
    archivedQuests,
    activeQuestCount,
    sevenDaysAgo,
    fourteenDaysAgo,
    twentyOneDaysAgo,
  } = raw;

  const sevenDaysCutoff = parseLocalDate(sevenDaysAgo);
  const fourteenDaysCutoff = parseLocalDate(fourteenDaysAgo);
  const twentyOneDaysAgoDate = parseLocalDate(twentyOneDaysAgo);

  const archiveCandidates: QuestSuggestion[] = [];
  const rewordCandidates: QuestSuggestion[] = [];
  const archivedQuestIds = new Set<string>();

  for (const quest of activeQuests) {
    const isOldEnoughForArchive = quest.createdAt < sevenDaysCutoff;
    const isOldEnoughForNeverStarted = quest.createdAt < fourteenDaysCutoff;
    const missedSevenPlusDays =
      quest.lastCheckInDate === null || quest.lastCheckInDate < sevenDaysAgo;
    const neverStarted =
      quest.totalCheckInCount === 0 && isOldEnoughForNeverStarted;

    if (isOldEnoughForArchive && (missedSevenPlusDays || neverStarted)) {
      archiveCandidates.push({
        type: "archive",
        questId: quest.id,
        questTitle: quest.title,
        reason:
          "Missed 7+ days in a row — consider putting this Quest to rest.",
      });
      archivedQuestIds.add(quest.id);
      continue;
    }

    const hasEnoughData = quest.recentCheckInCount >= 7;
    const lowWinRate =
      hasEnoughData && quest.recentWinCount / quest.recentCheckInCount < 0.3;

    if (lowWinRate) {
      rewordCandidates.push({
        type: "reword",
        questId: quest.id,
        questTitle: quest.title,
        reason:
          "Under 30% wins in the last 30 days — this Quest might need a smaller target.",
      });
    }
  }

  const restoreCandidates: QuestSuggestion[] = [];

  if (activeQuestCount < activeQuestLimit) {
    for (const quest of archivedQuests) {
      const hasHistory = quest.totalCheckInCount > 0;
      const goodWinRate =
        hasHistory && quest.allTimeWinCount / quest.totalCheckInCount > 0.5;
      const recentlyArchived =
        quest.archivedAt !== null && quest.archivedAt > twentyOneDaysAgoDate;

      if (goodWinRate || recentlyArchived) {
        restoreCandidates.push({
          type: "restore",
          questId: quest.id,
          questTitle: quest.title,
          reason: goodWinRate
            ? "You had a strong track record here — want to bring it back?"
            : "Archived recently — still want to work on this?",
        });
      }
    }
  }

  return [
    ...archiveCandidates,
    ...restoreCandidates,
    ...rewordCandidates,
  ].slice(0, 3);
}

const rewordSchema = z.object({
  alternatives: z.array(z.string().min(1).max(80)).min(2).max(3),
});

export async function getRewordOptions(questId: string): Promise<string[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new MissingAiKeyError();
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const thirtyDaysAgo = offsetLocalDate(dateContext.today, -30);

  const [questRow] = await db
    .select({ id: quests.id, title: quests.title })
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
    .limit(1);

  if (!questRow) {
    throw new Error("Quest not found.");
  }

  const passNoteRows = await db
    .select({ note: checkIns.note })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.questId, questId),
        eq(checkIns.userId, userId),
        eq(checkIns.outcome, "pass"),
        gte(checkIns.localDate, thirtyDaysAgo),
      ),
    )
    .limit(20);

  const passNotes = passNoteRows
    .map((r) => r.note)
    .filter((n): n is string => n !== null && n.trim().length > 0);
  const truncatedPassNotes = passNotes.slice(0, 10).map(truncateRewordNote);
  const system =
    "You are Pulse, a habit coach. Suggest shorter, more achievable rewordings of a user's quest. Keep each under 80 characters. Be concrete and kind.";
  const prompt = buildRewordPrompt(questRow.title, truncatedPassNotes);
  const reservation = await reserveAiUsage({
    userId,
    feature: "reword-suggestions",
    estimatedInputTokens: estimateAiTextTokens(`${system}\n${prompt}`),
    metadata: {
      action: "getRewordOptions",
      passNoteCount: truncatedPassNotes.length,
    },
  });

  if (!reservation.allowed) {
    throw new AiLimitReachedError(
      reservation.message,
      reservation.retryAfterSeconds,
    );
  }

  try {
    const { output, totalUsage, finishReason } = await generateText({
      model: "openai/gpt-5.4-nano",
      output: Output.object({ schema: rewordSchema }),
      system,
      prompt,
      providerOptions: reservation.providerOptions,
      maxOutputTokens: reservation.maxOutputTokens,
    });
    await completeAiUsage({
      eventId: reservation.eventId,
      usage: totalUsage,
      finishReason,
    });

    return output.alternatives;
  } catch (error) {
    logError({
      event: "reword_generation_failed",
      message: "Reword suggestion generation failed.",
      feature: "reword-suggestions",
      userId,
      error,
      metadata: {
        passNoteCount: truncatedPassNotes.length,
      },
    });
    await failAiUsage({ eventId: reservation.eventId, error });
    throw error;
  }
}

function buildRewordPrompt(title: string, passNotes: string[]): string {
  const notesSection =
    passNotes.length > 0
      ? `\n\nRecent pass notes:\n${passNotes.map((n) => `- ${n}`).join("\n")}`
      : "";

  return `Quest: "${title}"${notesSection}\n\nSuggest 2–3 shorter, more achievable alternative phrasings. Each must be under 80 characters.`;
}

function truncateRewordNote(note: string) {
  const text = note.trim().replace(/\s+/g, " ");

  return text.length <= 180 ? text : `${text.slice(0, 179).trim()}…`;
}
