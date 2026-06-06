import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import { requireUserId } from "@/lib/pulse/dashboard";
import {
  buildStatsRange,
  computeStatsData,
  statsWindowWeeks,
  type QuestStat,
  type QuestWeeklyStat,
  type StatsRange,
  type StatsSummary,
  type WeeklyTrendPoint,
} from "@/lib/pulse/stats-core";

export {
  buildStatsSummary,
  computeStatsData,
  statsMinimumSampleSize,
  statsWindowWeeks,
} from "@/lib/pulse/stats-core";

export type {
  QuestStat,
  QuestWeeklyStat,
  StatsComputedData,
  StatsInsightQuest,
  StatsRange,
  StatsSummary,
  WeeklyTrendPoint,
} from "@/lib/pulse/stats-core";

export type StatsData =
  | {
      isSetupComplete: false;
      character: null;
      range: StatsRange;
      weeklyTrend: [];
      questWeeklyStats: [];
      questStats: [];
      summary: StatsSummary;
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      range: StatsRange;
      weeklyTrend: WeeklyTrendPoint[];
      questWeeklyStats: QuestWeeklyStat[];
      questStats: QuestStat[];
      summary: StatsSummary;
    };

export async function getStatsData(): Promise<StatsData> {
  const userId = await requireUserId();
  const baseDate = new Date();
  const range = buildStatsRange(baseDate, statsWindowWeeks);
  const emptyStats = computeStatsData({
    baseDate,
    checkIns: [],
    quests: [],
    weeks: statsWindowWeeks,
  });
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return {
      isSetupComplete: false,
      character: null,
      range,
      weeklyTrend: [],
      questWeeklyStats: [],
      questStats: [],
      summary: emptyStats.summary,
    };
  }

  const [questRows, checkInRows] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        position: quests.position,
      })
      .from(quests)
      .where(eq(quests.userId, userId))
      .orderBy(asc(quests.position), asc(quests.title)),
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
          gte(checkIns.localDate, range.start),
          lte(checkIns.localDate, range.end),
        ),
      )
      .orderBy(asc(checkIns.localDate)),
  ]);

  const computed = computeStatsData({
    baseDate,
    checkIns: checkInRows,
    quests: questRows.map((quest) => ({
      ...quest,
      status: quest.status === "archived" ? "archived" : "active",
    })),
    weeks: statsWindowWeeks,
  });

  return {
    isSetupComplete: true,
    character,
    ...computed,
  };
}
