import "server-only";

import { tool } from "ai";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  characters,
  checkIns,
  journalEntries,
  quests,
  weeklyStories,
} from "@/lib/db/schema";
import {
  buildPulseCoachSystemPrompt,
  compressPulseCoachContext,
  type CoachAction,
  type CoachProposal,
  type PulseCoachContext,
} from "@/lib/pulse/coach-core";
import { getLocalDate } from "@/lib/pulse/dashboard";
import { computeMomentum } from "@/lib/pulse/momentum";
import { getProofArchiveData } from "@/lib/pulse/proof";
import { activeQuestLimit } from "@/lib/pulse/quests";
import { computeStatsData, statsWindowWeeks } from "@/lib/pulse/stats-core";
import {
  computeSuggestions,
  getSuggestionsData,
} from "@/lib/pulse/suggestions";

export { buildPulseCoachSystemPrompt } from "@/lib/pulse/coach-core";

function offsetDate(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export async function getPulseCoachContext(
  userId: string,
): Promise<PulseCoachContext> {
  const baseDate = new Date();
  const today = getLocalDate(baseDate);
  const fourteenDaysAgo = getLocalDate(offsetDate(baseDate, -13));
  const thirtyDaysAgo = getLocalDate(offsetDate(baseDate, -30));
  const ninetyDaysAgo = getLocalDate(offsetDate(baseDate, -90));
  const statsStart = getLocalDate(
    offsetDate(baseDate, -(statsWindowWeeks * 7)),
  );

  const [character] = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return compressPulseCoachContext({
      today,
      isSetupComplete: false,
      character: null,
      activeQuests: [],
      archivedQuests: [],
      recentProof: [],
      proofSummary: {
        rangeStart: today,
        rangeEnd: today,
        total: 0,
        wins: 0,
        passes: 0,
        mostProvenQuest: null,
      },
      statsSummary: {
        totalProof: 0,
        overallWinRate: null,
        strongestQuest: null,
        needsAttentionQuest: null,
        weeklyTrend: "none",
      },
      momentum: null,
      suggestions: [],
      journal: [],
      stories: [],
    });
  }

  const [
    questRows,
    todayRows,
    proof30Rows,
    checkInRows90,
    recentProofRows,
    archivedRows,
    proofArchive,
    statsCheckInRows,
    suggestionsRaw,
    journalRows,
    storyRows,
  ] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        position: quests.position,
        archivedAt: quests.archivedAt,
      })
      .from(quests)
      .where(eq(quests.userId, userId))
      .orderBy(asc(quests.position), asc(quests.title)),
    db
      .select({
        questId: checkIns.questId,
        outcome: checkIns.outcome,
        note: checkIns.note,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, today))),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, thirtyDaysAgo),
        ),
      )
      .orderBy(asc(checkIns.localDate)),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, ninetyDaysAgo),
        ),
      )
      .orderBy(asc(checkIns.localDate)),
    db
      .select({
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
        note: checkIns.note,
        questTitle: quests.title,
      })
      .from(checkIns)
      .innerJoin(quests, eq(checkIns.questId, quests.id))
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, fourteenDaysAgo),
        ),
      )
      .orderBy(desc(checkIns.localDate), desc(checkIns.updatedAt))
      .limit(20),
    db
      .select({
        id: quests.id,
        title: quests.title,
        archivedAt: quests.archivedAt,
        proofCount: count(checkIns.id),
        winCount: sql<number>`count(${checkIns.id}) FILTER (WHERE ${checkIns.outcome} = 'win')::int`,
      })
      .from(quests)
      .leftJoin(checkIns, eq(checkIns.questId, quests.id))
      .where(and(eq(quests.userId, userId), eq(quests.status, "archived")))
      .groupBy(quests.id)
      .orderBy(desc(quests.archivedAt), asc(quests.title))
      .limit(12),
    getProofArchiveData(),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, statsStart),
          lte(checkIns.localDate, today),
        ),
      )
      .orderBy(asc(checkIns.localDate)),
    getSuggestionsData(),
    db
      .select({
        localDate: journalEntries.localDate,
        body: journalEntries.body,
      })
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.localDate), desc(journalEntries.updatedAt))
      .limit(7),
    db
      .select({
        weekStart: weeklyStories.weekStart,
        weekEnd: weeklyStories.weekEnd,
        title: weeklyStories.title,
        summary: weeklyStories.summary,
        nextQuest: weeklyStories.nextQuest,
      })
      .from(weeklyStories)
      .where(eq(weeklyStories.userId, userId))
      .orderBy(desc(weeklyStories.weekStart), desc(weeklyStories.updatedAt))
      .limit(3),
  ]);

  const activeQuestRows = questRows.filter(
    (quest) => quest.status !== "archived" && quest.archivedAt === null,
  );
  const todayByQuest = new Map(todayRows.map((row) => [row.questId, row]));
  const proof30ByQuest = new Map<
    string,
    {
      proof30d: number;
      wins30d: number;
      passes30d: number;
      lastCheckInDate: string | null;
    }
  >();

  for (const row of proof30Rows) {
    const bucket = proof30ByQuest.get(row.questId) ?? {
      proof30d: 0,
      wins30d: 0,
      passes30d: 0,
      lastCheckInDate: null,
    };
    bucket.proof30d += 1;
    if (row.outcome === "pass") {
      bucket.passes30d += 1;
    } else {
      bucket.wins30d += 1;
    }
    bucket.lastCheckInDate =
      bucket.lastCheckInDate === null || row.localDate > bucket.lastCheckInDate
        ? row.localDate
        : bucket.lastCheckInDate;
    proof30ByQuest.set(row.questId, bucket);
  }

  const momentum =
    activeQuestRows.length > 0
      ? computeMomentum(
          activeQuestRows.map((quest) => ({
            id: quest.id,
            title: quest.title,
          })),
          checkInRows90,
          today,
        )
      : null;
  const momentumByQuest = new Map(
    momentum?.questStreaks.map((quest) => [quest.questId, quest]) ?? [],
  );
  const stats = computeStatsData({
    baseDate,
    checkIns: statsCheckInRows,
    quests: questRows.map((quest) => ({
      id: quest.id,
      title: quest.title,
      status: quest.status === "archived" ? "archived" : "active",
      position: quest.position,
    })),
  });

  return compressPulseCoachContext({
    today,
    isSetupComplete: true,
    character,
    activeQuests: activeQuestRows.map((quest) => {
      const todayCheckIn = todayByQuest.get(quest.id);
      const proof = proof30ByQuest.get(quest.id);
      const streak = momentumByQuest.get(quest.id);

      return {
        id: quest.id,
        title: quest.title,
        todayOutcome:
          todayCheckIn?.outcome === "pass"
            ? "pass"
            : todayCheckIn?.outcome
              ? "win"
              : null,
        todayNote: todayCheckIn?.note ?? null,
        proof30d: proof?.proof30d ?? 0,
        wins30d: proof?.wins30d ?? 0,
        passes30d: proof?.passes30d ?? 0,
        lastCheckInDate: proof?.lastCheckInDate ?? null,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        isAtRisk: streak?.isAtRisk ?? false,
      };
    }),
    archivedQuests: archivedRows.map((quest) => ({
      id: quest.id,
      title: quest.title,
      proofCount: Number(quest.proofCount),
      winCount: Number(quest.winCount),
      archivedAt: quest.archivedAt ? getLocalDate(quest.archivedAt) : null,
    })),
    recentProof: recentProofRows.map((entry) => ({
      localDate: entry.localDate,
      questTitle: entry.questTitle,
      outcome: entry.outcome === "pass" ? "pass" : "win",
      note: entry.note,
    })),
    proofSummary: {
      rangeStart: proofArchive.range.start,
      rangeEnd: proofArchive.range.end,
      total: proofArchive.stats.total,
      wins: proofArchive.stats.winCount,
      passes: proofArchive.stats.passCount,
      mostProvenQuest: proofArchive.stats.mostProvenQuest?.title ?? null,
    },
    statsSummary: {
      totalProof: stats.summary.totalProof,
      overallWinRate: stats.summary.overallWinRate,
      strongestQuest: stats.summary.strongestQuest?.questTitle ?? null,
      needsAttentionQuest:
        stats.summary.needsAttentionQuest?.questTitle ?? null,
      weeklyTrend: stats.weeklyTrend
        .slice(-4)
        .map((week) => `${week.label}:${week.winRate ?? "n/a"}%`)
        .join(", "),
    },
    momentum: momentum
      ? {
          score: momentum.score,
          tier: momentum.tier,
          longestStreakEver: momentum.longestStreakEver,
          atRiskCount: momentum.atRiskCount,
        }
      : null,
    suggestions: computeSuggestions(suggestionsRaw).map((suggestion) => ({
      type: suggestion.type,
      questTitle: suggestion.questTitle,
      reason: suggestion.reason,
    })),
    journal: journalRows,
    stories: storyRows,
  });
}

export function buildPulseCoachTools(context: PulseCoachContext) {
  function proposal(
    title: string,
    summary: string,
    action: CoachAction,
  ): CoachProposal {
    return { title, summary, action };
  }

  return {
    proposeCreateQuest: tool({
      description:
        "Propose creating a new active Quest. Use only when the user wants a new repeatable habit or asks for a concrete plan.",
      inputSchema: z.object({
        title: z.string().min(1).max(96),
      }),
      execute: async ({ title }) =>
        proposal("Create Quest", `Add "${title}" to active Quests.`, {
          type: "createQuest",
          title,
        }),
    }),
    proposeUpdateQuest: tool({
      description: "Propose renaming an existing Quest.",
      inputSchema: z.object({
        questId: z.string().min(1),
        title: z.string().min(1).max(96),
      }),
      execute: async ({ questId, title }) => {
        const quest = findQuest(context, questId);
        return proposal(
          "Update Quest",
          `Rename "${quest?.title ?? "this Quest"}" to "${title}".`,
          { type: "updateQuest", questId, title },
        );
      },
    }),
    proposeArchiveQuest: tool({
      description:
        "Propose archiving an active Quest so it leaves daily Check-ins while preserving Proof.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const quest = findQuest(context, questId);
        return proposal(
          "Archive Quest",
          `Archive "${quest?.title ?? "this Quest"}" and keep its Proof intact.`,
          { type: "archiveQuest", questId },
        );
      },
    }),
    proposeRestoreQuest: tool({
      description: "Propose restoring an archived Quest to the active list.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const quest = findQuest(context, questId);
        return proposal(
          "Restore Quest",
          `Restore "${quest?.title ?? "this Quest"}" to active Quests. Active limit: ${activeQuestLimit}.`,
          { type: "restoreQuest", questId },
        );
      },
    }),
    proposeSaveCheckIn: tool({
      description:
        "Propose saving today's Check-in for an active Quest as a Win or Pass with an optional proof note.",
      inputSchema: z.object({
        questId: z.string().min(1),
        outcome: z.enum(["win", "pass"]),
        note: z.string().max(240).optional(),
        localDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
      execute: async ({ questId, outcome, note, localDate }) => {
        const quest = findQuest(context, questId);
        return proposal(
          "Save Check-in",
          `Mark "${quest?.title ?? "this Quest"}" as ${outcome === "win" ? "Win" : "Pass"} for ${localDate ?? context.today}.`,
          {
            type: "saveCheckIn",
            questId,
            outcome,
            note,
            localDate: localDate ?? context.today,
          },
        );
      },
    }),
    proposeSaveJournal: tool({
      description:
        "Propose saving or updating a Journal entry for a local date. Use for reflective user-approved writing.",
      inputSchema: z.object({
        localDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        body: z.string().min(1).max(2000),
      }),
      execute: async ({ localDate, body }) =>
        proposal(
          "Save Journal",
          `Save a Journal entry for ${localDate ?? context.today}.`,
          {
            type: "saveJournal",
            localDate: localDate ?? context.today,
            body,
          },
        ),
    }),
  };
}

export async function getPulseCoachPromptAndTools(userId: string) {
  const context = await getPulseCoachContext(userId);

  return {
    context,
    system: buildPulseCoachSystemPrompt(context),
    tools: buildPulseCoachTools(context),
  };
}

function findQuest(context: PulseCoachContext, questId: string) {
  return (
    context.activeQuests.find((quest) => quest.id === questId) ??
    context.archivedQuests.find((quest) => quest.id === questId) ??
    null
  );
}
