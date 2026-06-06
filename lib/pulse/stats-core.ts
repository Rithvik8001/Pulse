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
  winRate: number | null;
  currentStreak: number;
  longestStreak: number;
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

function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function offsetDate(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  return start;
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
  return formatLocalDate(startOfWeek(parseLocalDate(localDate)));
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
      winRate: null,
    };
  });
}

function computeCurrentStreak(dateSet: Set<string>, today: string): number {
  if (!dateSet.has(today)) {
    return 0;
  }

  let streak = 0;
  let cursor = today;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = formatLocalDate(offsetDate(parseLocalDate(cursor), -1));
  }

  return streak;
}

function computeLongestStreak(sortedAscDates: string[]) {
  if (sortedAscDates.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < sortedAscDates.length; index += 1) {
    const expected = formatLocalDate(
      offsetDate(parseLocalDate(sortedAscDates[index - 1]), 1),
    );

    if (sortedAscDates[index] === expected) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
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
  const rankedQuests = questStats.filter(
    (quest) =>
      quest.totalCount >= statsMinimumSampleSize && quest.winRate !== null,
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
    overallWinRate: toWinRate(winCount, totalProof),
    strongestQuest: strongest
      ? toInsightQuest(strongest, "Best win rate with enough recent Proof.")
      : null,
    needsAttentionQuest: lowWinRate
      ? toInsightQuest(lowWinRate, "Lowest win rate with enough recent Proof.")
      : staleActive
        ? toInsightQuest(staleActive, "No Proof in this window yet.")
        : null,
    activeQuestCount,
  };
}

export function computeStatsData({
  baseDate,
  checkIns,
  quests,
  weeks = statsWindowWeeks,
}: {
  baseDate: Date;
  checkIns: StatsCheckInInput[];
  quests: StatsQuestInput[];
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
      dates: Set<string>;
      lastCheckInDate: string | null;
      weekly: Map<string, { winCount: number; passCount: number }>;
    }
  >();

  for (const quest of quests) {
    questBucket.set(quest.id, {
      winCount: 0,
      passCount: 0,
      dates: new Set(),
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
    bucket.dates.add(checkIn.localDate);
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

  for (const week of weeklyTrend) {
    week.winRate = toWinRate(week.winCount, week.totalCount);
  }

  const today = formatLocalDate(baseDate);
  const questStats = quests
    .map((quest) => {
      const bucket = questBucket.get(quest.id);
      const winCount = bucket?.winCount ?? 0;
      const passCount = bucket?.passCount ?? 0;
      const totalCount = winCount + passCount;
      const sortedDates = [...(bucket?.dates ?? new Set<string>())].sort();
      const dateSet = new Set(sortedDates);

      return {
        questId: quest.id,
        questTitle: quest.title,
        questStatus: quest.status,
        winCount,
        passCount,
        totalCount,
        winRate: toWinRate(winCount, totalCount),
        currentStreak: computeCurrentStreak(dateSet, today),
        longestStreak: computeLongestStreak(sortedDates),
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

    return weeklyTrend.map((week) => {
      const questWeek = bucket?.weekly.get(week.weekStart) ?? {
        winCount: 0,
        passCount: 0,
      };
      const totalCount = questWeek.winCount + questWeek.passCount;

      return {
        questId: quest.id,
        weekStart: week.weekStart,
        winCount: questWeek.winCount,
        passCount: questWeek.passCount,
        totalCount,
        winRate: toWinRate(questWeek.winCount, totalCount),
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
