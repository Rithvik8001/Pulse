import {
  formatLocalDate,
  getWeekStart,
  offsetDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";
import {
  evaluateHabit,
  formatScheduleLabel,
  sumOccurrences,
  type ScheduleEntry,
} from "@/lib/pulse/schedule-core";

export const statsWindowWeeks = 12;
export const statsMinimumSampleSize = 3;

export type StatsQuestStatus = "active" | "archived";
export type StatsOutcome = "win" | "pass";

export type StatsQuestInput = {
  id: string;
  title: string;
  status: StatsQuestStatus;
  position: number;
};

export type StatsCheckInInput = {
  questId: string;
  localDate: string;
  outcome: string;
};

export type StatsRange = {
  start: string;
  end: string;
  weeks: number;
};

export type WeeklyTrendPoint = {
  weekStart: string;
  weekEnd: string;
  label: string;
  winCount: number;
  passCount: number;
  totalCount: number;
  dueCount: number;
  doneCount: number;
  winRate: number | null;
};

export type QuestWeeklyStat = {
  questId: string;
  weekStart: string;
  winCount: number;
  passCount: number;
  totalCount: number;
  winRate: number | null;
};

export type QuestStat = {
  questId: string;
  questTitle: string;
  questStatus: StatsQuestStatus;
  winCount: number;
  passCount: number;
  totalCount: number;
  dueCount: number;
  doneCount: number;
  winRate: number | null;
  currentStreak: number;
  longestStreak: number;
  runUnit: "days" | "weeks";
  scheduleLabel: string;
  lastCheckInDate: string | null;
};

export type StatsInsightQuest = {
  questId: string;
  questTitle: string;
  questStatus: StatsQuestStatus;
  winRate: number | null;
  totalCount: number;
  currentStreak: number;
  lastCheckInDate: string | null;
  reason: string;
};

export type StatsSummary = {
  totalProof: number;
  winCount: number;
  passCount: number;
  overallWinRate: number | null;
  strongestQuest: StatsInsightQuest | null;
  needsAttentionQuest: StatsInsightQuest | null;
  activeQuestCount: number;
};

export type StatsComputedData = {
  range: StatsRange;
  weeklyTrend: WeeklyTrendPoint[];
  questWeeklyStats: QuestWeeklyStat[];
  questStats: QuestStat[];
  summary: StatsSummary;
};

function startOfWeek(date: Date) {
  return parseLocalDate(getWeekStart(formatLocalDate(date)));
}

function formatWeekLabel(weekStart: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(parseLocalDate(weekStart));
}

function toWinRate(winCount: number, totalCount: number) {
  return totalCount > 0 ? Math.round((winCount / totalCount) * 100) : null;
}

function normalizeOutcome(outcome: string): StatsOutcome {
  return outcome === "pass" ? "pass" : "win";
}

function getWeekStartForDate(localDate: string) {
  return getWeekStart(localDate);
}

function buildWeekSkeleton(baseDate: Date, weeks: number): WeeklyTrendPoint[] {
  const currentWeekStart = startOfWeek(baseDate);

  return Array.from({ length: weeks }, (_, index) => {
    const weekStartDate = offsetDate(currentWeekStart, (index - weeks + 1) * 7);
    const weekEndDate = offsetDate(weekStartDate, 6);
    const weekStart = formatLocalDate(weekStartDate);

    return {
      weekStart,
      weekEnd: formatLocalDate(weekEndDate),
      label: formatWeekLabel(weekStart),
      winCount: 0,
      passCount: 0,
      totalCount: 0,
      dueCount: 0,
      doneCount: 0,
      winRate: null,
    };
  });
}

function toInsightQuest(quest: QuestStat, reason: string): StatsInsightQuest {
  return {
    questId: quest.questId,
    questTitle: quest.questTitle,
    questStatus: quest.questStatus,
    winRate: quest.winRate,
    totalCount: quest.totalCount,
    currentStreak: quest.currentStreak,
    lastCheckInDate: quest.lastCheckInDate,
    reason,
  };
}

export function buildStatsRange(baseDate: Date, weeks = statsWindowWeeks) {
  const weeklyTrend = buildWeekSkeleton(baseDate, weeks);
  const firstWeek = weeklyTrend[0];
  const lastWeek = weeklyTrend[weeklyTrend.length - 1];

  return {
    start: firstWeek.weekStart,
    end: lastWeek.weekEnd,
    weeks,
  };
}

export function buildStatsSummary(
  questStats: QuestStat[],
  activeQuestCount: number,
): StatsSummary {
  const winCount = questStats.reduce(
    (total, quest) => total + quest.winCount,
    0,
  );
  const passCount = questStats.reduce(
    (total, quest) => total + quest.passCount,
    0,
  );
  const totalProof = winCount + passCount;
  const dueCount = questStats.reduce((total, quest) => total + quest.dueCount, 0);
  const doneCount = questStats.reduce((total, quest) => total + quest.doneCount, 0);
  const rankedQuests = questStats.filter(
    (quest) =>
      quest.dueCount >= statsMinimumSampleSize && quest.winRate !== null,
  );
  const strongest = [...rankedQuests].sort((first, second) => {
    if (second.winRate !== first.winRate) {
      return (second.winRate ?? 0) - (first.winRate ?? 0);
    }

    return second.totalCount - first.totalCount;
  })[0];
  const lowWinRate = [...rankedQuests].sort((first, second) => {
    if (first.winRate !== second.winRate) {
      return (first.winRate ?? 0) - (second.winRate ?? 0);
    }

    return second.totalCount - first.totalCount;
  })[0];
  const staleActive = questStats.find(
    (quest) => quest.questStatus === "active" && quest.lastCheckInDate === null,
  );

  return {
    totalProof,
    winCount,
    passCount,
    overallWinRate: toWinRate(doneCount, dueCount),
    strongestQuest: strongest
      ? toInsightQuest(strongest, "Highest done rate on its due days.")
      : null,
    needsAttentionQuest: lowWinRate
      ? toInsightQuest(lowWinRate, "Lowest done rate on its due days.")
      : staleActive
        ? toInsightQuest(staleActive, "No check-ins in this period yet.")
        : null,
    activeQuestCount,
  };
}

export function computeStatsData({
  baseDate,
  checkIns,
  quests,
  histories,
  weeks = statsWindowWeeks,
}: {
  baseDate: Date;
  checkIns: StatsCheckInInput[];
  quests: StatsQuestInput[];
  histories: Map<string, ScheduleEntry[]>;
  weeks?: number;
}): StatsComputedData {
  const weeklyTrend = buildWeekSkeleton(baseDate, weeks);
  const weekByStart = new Map(
    weeklyTrend.map((week) => [week.weekStart, week]),
  );
  const questById = new Map(quests.map((quest) => [quest.id, quest]));
  const questBucket = new Map<
    string,
    {
      winCount: number;
      passCount: number;
      dates: Map<string, "win" | "pass">;
      lastCheckInDate: string | null;
      weekly: Map<string, { winCount: number; passCount: number }>;
    }
  >();

  for (const quest of quests) {
    questBucket.set(quest.id, {
      winCount: 0,
      passCount: 0,
      dates: new Map(),
      lastCheckInDate: null,
      weekly: new Map(),
    });
  }

  for (const checkIn of checkIns) {
    const quest = questById.get(checkIn.questId);
    const weekStart = getWeekStartForDate(checkIn.localDate);
    const week = weekByStart.get(weekStart);
    const bucket = questBucket.get(checkIn.questId);

    if (!quest || !week || !bucket) {
      continue;
    }

    const outcome = normalizeOutcome(checkIn.outcome);
    if (outcome === "pass") {
      week.passCount += 1;
      bucket.passCount += 1;
    } else {
      week.winCount += 1;
      bucket.winCount += 1;
    }

    week.totalCount += 1;
    bucket.dates.set(checkIn.localDate, outcome);
    bucket.lastCheckInDate =
      bucket.lastCheckInDate === null ||
      checkIn.localDate > bucket.lastCheckInDate
        ? checkIn.localDate
        : bucket.lastCheckInDate;

    const questWeek = bucket.weekly.get(weekStart) ?? {
      winCount: 0,
      passCount: 0,
    };
    if (outcome === "pass") {
      questWeek.passCount += 1;
    } else {
      questWeek.winCount += 1;
    }
    bucket.weekly.set(weekStart, questWeek);
  }

  const today = formatLocalDate(baseDate);
  const rangeStart = weeklyTrend[0].weekStart;
  const evaluations = new Map(
    quests.map((quest) => [
      quest.id,
      evaluateHabit({
        history: histories.get(quest.id) ?? [],
        checkIns: questBucket.get(quest.id)?.dates ?? new Map<string, "win" | "pass">(),
        today,
        windowStart: rangeStart,
      }),
    ]),
  );

  for (const week of weeklyTrend) {
    for (const evaluation of evaluations.values()) {
      const tally = sumOccurrences(evaluation.occurrences, week.weekStart, week.weekEnd);
      week.dueCount += tally.due;
      week.doneCount += tally.done;
    }
    week.winRate = toWinRate(week.doneCount, week.dueCount);
  }

  const questStats = quests
    .map((quest) => {
      const bucket = questBucket.get(quest.id);
      const evaluation = evaluations.get(quest.id);
      const winCount = bucket?.winCount ?? 0;
      const passCount = bucket?.passCount ?? 0;
      const totalCount = winCount + passCount;
      const tally = evaluation
        ? sumOccurrences(evaluation.occurrences, rangeStart, today)
        : { due: 0, done: 0 };

      return {
        questId: quest.id,
        questTitle: quest.title,
        questStatus: quest.status,
        winCount,
        passCount,
        totalCount,
        dueCount: tally.due,
        doneCount: tally.done,
        winRate: toWinRate(tally.done, tally.due),
        currentStreak: evaluation?.currentRun ?? 0,
        longestStreak: evaluation?.longestRun ?? 0,
        runUnit: evaluation?.runUnit ?? "days",
        scheduleLabel: evaluation?.schedule ? formatScheduleLabel(evaluation.schedule) : "Every day",
        lastCheckInDate: bucket?.lastCheckInDate ?? null,
      };
    })
    .filter((quest) => quest.totalCount > 0 || quest.questStatus === "active")
    .sort((first, second) => {
      if (first.questStatus !== second.questStatus) {
        return first.questStatus === "active" ? -1 : 1;
      }

      return first.questTitle.localeCompare(second.questTitle);
    });

  const questWeeklyStats = quests.flatMap((quest) => {
    const bucket = questBucket.get(quest.id);
    const evaluation = evaluations.get(quest.id);

    return weeklyTrend.map((week) => {
      const questWeek = bucket?.weekly.get(week.weekStart) ?? {
        winCount: 0,
        passCount: 0,
      };
      const totalCount = questWeek.winCount + questWeek.passCount;
      const tally = evaluation
        ? sumOccurrences(evaluation.occurrences, week.weekStart, week.weekEnd)
        : { due: 0, done: 0 };

      return {
        questId: quest.id,
        weekStart: week.weekStart,
        winCount: questWeek.winCount,
        passCount: questWeek.passCount,
        totalCount,
        winRate: toWinRate(tally.done, tally.due),
      };
    });
  });

  return {
    range: buildStatsRange(baseDate, weeks),
    weeklyTrend,
    questWeeklyStats,
    questStats,
    summary: buildStatsSummary(
      questStats,
      quests.filter((quest) => quest.status === "active").length,
    ),
  };
}
