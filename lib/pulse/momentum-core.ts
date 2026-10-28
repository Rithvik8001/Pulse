import { offsetLocalDate } from "@/lib/pulse/local-date-core";
import {
  evaluateHabit,
  formatScheduleLabel,
  groupCheckInsByQuest,
  sumOccurrences,
  toDoneRate,
  type HabitSchedule,
  type ScheduleEntry,
} from "@/lib/pulse/schedule-core";

export type QuestStreak = {
  questId: string;
  questTitle: string;
  currentStreak: number;
  longestStreak: number;
  runUnit: "days" | "weeks";
  isAtRisk: boolean;
  dueToday: boolean;
  thisWeek: { done: number; target: number } | null;
  schedule: HabitSchedule | null;
  scheduleLabel: string;
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

function getTier(score: number): MomentumTier {
  if (score <= 25) return "Warming Up";
  if (score <= 55) return "Building";
  if (score <= 80) return "On Fire";
  return "In the Zone";
}

export function computeMomentum(
  activeQuests: { id: string; title: string }[],
  histories: Map<string, ScheduleEntry[]>,
  checkInRows: { questId: string; localDate: string; outcome: string }[],
  today: string,
): MomentumData {
  const windowStart = offsetLocalDate(today, -90);
  const thirtyDaysAgo = offsetLocalDate(today, -30);
  const byQuest = groupCheckInsByQuest(checkInRows);

  const questStreaks: QuestStreak[] = [];
  let totalScore = 0;
  let longestStreakEver = 0;
  let atRiskCount = 0;

  for (const quest of activeQuests) {
    const checkIns = byQuest.get(quest.id) ?? new Map<string, "win" | "pass">();
    const evaluation = evaluateHabit({
      history: histories.get(quest.id) ?? [],
      checkIns,
      today,
      windowStart,
    });
    const recent = sumOccurrences(evaluation.occurrences, thirtyDaysAgo, today);
    const winRate30d = toDoneRate(recent.done, recent.due) ?? 0;
    const runBonus = Math.min(evaluation.currentRun / evaluation.runGoal, 1);
    totalScore += winRate30d * 0.6 + runBonus * 0.4;

    longestStreakEver = Math.max(longestStreakEver, evaluation.currentRun, evaluation.longestRun);
    if (evaluation.atRisk) atRiskCount++;

    questStreaks.push({
      questId: quest.id,
      questTitle: quest.title,
      currentStreak: evaluation.currentRun,
      longestStreak: evaluation.longestRun,
      runUnit: evaluation.runUnit,
      isAtRisk: evaluation.atRisk,
      dueToday: evaluation.dueToday,
      thisWeek: evaluation.thisWeek,
      schedule: evaluation.schedule,
      scheduleLabel: evaluation.schedule ? formatScheduleLabel(evaluation.schedule) : "Every day",
      winRate30d,
      checkInCount30d: [...checkIns.keys()].filter((date) => date >= thirtyDaysAgo).length,
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
