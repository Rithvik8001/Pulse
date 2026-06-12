import "server-only";

import { generateText, Output } from "ai";
import { and, count, eq, gte, isNull, max, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { checkIns, quests } from "@/lib/db/schema";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";
import {
  offsetDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";
import { activeQuestLimit } from "@/lib/pulse/quests";

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
      "Add AI_GATEWAY_API_KEY to your environment to generate reword suggestions.",
    );
    this.name = "MissingAiKeyError";
  }
}

export async function getSuggestionsData(): Promise<SuggestionsRawData> {
  const userId = await requireUserId();
  const now = new Date();
  const sevenDaysAgo = getLocalDate(offsetDate(now, -7));
  const fourteenDaysAgo = getLocalDate(offsetDate(now, -14));
  const twentyOneDaysAgo = getLocalDate(offsetDate(now, -21));
  const thirtyDaysAgo = getLocalDate(offsetDate(now, -30));

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
  const thirtyDaysAgo = getLocalDate(offsetDate(new Date(), -30));

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

  const { output } = await generateText({
    model: "openai/gpt-5.4-nano",
    output: Output.object({ schema: rewordSchema }),
    system:
      "You are Pulse, a habit coach. Suggest shorter, more achievable rewordings of a user's quest. Keep each under 80 characters. Be concrete and kind.",
    prompt: buildRewordPrompt(questRow.title, passNotes),
  });

  return output.alternatives;
}

function buildRewordPrompt(title: string, passNotes: string[]): string {
  const notesSection =
    passNotes.length > 0
      ? `\n\nRecent pass notes:\n${passNotes.map((n) => `- ${n}`).join("\n")}`
      : "";

  return `Quest: "${title}"${notesSection}\n\nSuggest 2–3 shorter, more achievable alternative phrasings. Each must be under 80 characters.`;
}
