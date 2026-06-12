import { offsetLocalDate } from "@/lib/pulse/local-date-core";

export type QuestStreak = {
  questId: string;
  questTitle: string;
  currentStreak: number;
  longestStreak: number;
  isAtRisk: boolean;
  winRate30d: number;
  checkInCount30d: number;
};

export type MomentumTier =
  | "Warming Up"
  | "Building"
  | "On Fire"
  | "In the Zone";

export type MomentumData = {
  score: number;
  tier: MomentumTier;
  questStreaks: QuestStreak[];
  longestStreakEver: number;
  atRiskCount: number;
};

function computeCurrentStreak(
  dateSet: Set<string>,
  today: string,
): { current: number; isAtRisk: boolean } {
  const yesterday = offsetLocalDate(today, -1);
  const hasToday = dateSet.has(today);
  const hasYesterday = dateSet.has(yesterday);

  if (!hasToday && !hasYesterday) return { current: 0, isAtRisk: false };

  let streak = 0;
  let cursor = hasToday ? today : yesterday;
  const isAtRisk = !hasToday;

  while (dateSet.has(cursor)) {
    streak++;
    cursor = offsetLocalDate(cursor, -1);
  }

  return { current: streak, isAtRisk };
}

function computeLongestStreak(sortedAscDates: string[]): number {
  if (sortedAscDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedAscDates.length; i++) {
    const expected = offsetLocalDate(sortedAscDates[i - 1], 1);
    if (sortedAscDates[i] === expected) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

function getTier(score: number): MomentumTier {
  if (score <= 25) return "Warming Up";
  if (score <= 55) return "Building";
  if (score <= 80) return "On Fire";
  return "In the Zone";
}

export function computeMomentum(
  activeQuests: { id: string; title: string }[],
  checkInRows: { questId: string; localDate: string; outcome: string }[],
  today: string,
): MomentumData {
  const thirtyDaysAgo = offsetLocalDate(today, -30);

  const byQuest = new Map<string, { localDate: string; outcome: string }[]>();
  for (const row of checkInRows) {
    const existing = byQuest.get(row.questId);
    if (existing) {
      existing.push(row);
    } else {
      byQuest.set(row.questId, [row]);
    }
  }

  const questStreaks: QuestStreak[] = [];
  let totalScore = 0;
  let longestStreakEver = 0;
  let atRiskCount = 0;

  for (const quest of activeQuests) {
    const rows = byQuest.get(quest.id) ?? [];

    const uniqueDates = [...new Set(rows.map((r) => r.localDate))].sort();
    const dateSet = new Set(uniqueDates);

    const { current, isAtRisk } = computeCurrentStreak(dateSet, today);
    const longest = computeLongestStreak(uniqueDates);

    const recent = rows.filter((r) => r.localDate >= thirtyDaysAgo);
    const wins30d = recent.filter((r) => r.outcome === "win").length;
    const total30d = recent.length;
    const winRate30d = total30d > 0 ? wins30d / total30d : 0;

    const streakBonus = Math.min(current / 7, 1);
    const questScore = winRate30d * 0.6 + streakBonus * 0.4;
    totalScore += questScore;

    if (current > longestStreakEver) longestStreakEver = current;
    if (longest > longestStreakEver) longestStreakEver = longest;
    if (isAtRisk) atRiskCount++;

    questStreaks.push({
      questId: quest.id,
      questTitle: quest.title,
      currentStreak: current,
      longestStreak: longest,
      isAtRisk,
      winRate30d,
      checkInCount30d: total30d,
    });
  }

  const score =
    activeQuests.length > 0
      ? Math.round((totalScore / activeQuests.length) * 100)
      : 0;

  return {
    score,
    tier: getTier(score),
    questStreaks,
    longestStreakEver,
    atRiskCount,
  };
}
