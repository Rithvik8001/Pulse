import { z } from "zod";

import {
  enumerateLocalDates,
  getWeekStart,
  getWeekdayIndex,
  offsetLocalDate,
} from "@/lib/pulse/local-date-core";

export const weekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof weekdayKeys)[number];

const weekdayLabels: Record<WeekdayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const allWeekdaysMask = 127;
const workWeekMask = 31;
const weekendMask = 96;
export const maxTimesPerWeek = 6;

export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekdays"; weekdays: number }
  | { kind: "weekly"; timesPerWeek: number };

export type StoredSchedule = HabitSchedule | { kind: "paused" };

export type ScheduleEntry = {
  effectiveFrom: string;
  schedule: StoredSchedule;
};

export type ScheduleRow = {
  kind: "daily" | "weekdays" | "weekly" | "paused";
  weekdays: number | null;
  timesPerWeek: number | null;
};

export const dailySchedule: HabitSchedule = { kind: "daily" };

export const scheduleInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekdays"),
    days: z.array(z.enum(weekdayKeys)).min(1).max(7),
  }),
  z.object({
    kind: z.literal("weekly"),
    timesPerWeek: z.number().int().min(1).max(maxTimesPerWeek),
  }),
]);

export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export function weekdaysToMask(days: readonly WeekdayKey[]) {
  return days.reduce((mask, day) => mask | (1 << weekdayKeys.indexOf(day)), 0);
}

export function maskToWeekdays(mask: number) {
  return weekdayKeys.filter((_, index) => (mask & (1 << index)) !== 0);
}

export function normalizeSchedule(schedule: HabitSchedule): HabitSchedule {
  if (schedule.kind === "weekdays" && (schedule.weekdays & allWeekdaysMask) === allWeekdaysMask) {
    return dailySchedule;
  }

  return schedule;
}

export function scheduleFromInput(input: ScheduleInput): HabitSchedule {
  if (input.kind === "weekdays") {
    return normalizeSchedule({ kind: "weekdays", weekdays: weekdaysToMask(input.days) });
  }

  if (input.kind === "weekly") {
    return { kind: "weekly", timesPerWeek: input.timesPerWeek };
  }

  return dailySchedule;
}

export function scheduleToInput(schedule: HabitSchedule): ScheduleInput {
  if (schedule.kind === "weekdays") {
    return { kind: "weekdays", days: maskToWeekdays(schedule.weekdays) };
  }

  if (schedule.kind === "weekly") {
    return { kind: "weekly", timesPerWeek: schedule.timesPerWeek };
  }

  return { kind: "daily" };
}

export function parseScheduleFields({
  kind,
  weekdays,
  timesPerWeek,
}: {
  kind: string;
  weekdays: string[];
  timesPerWeek: string;
}): { ok: true; schedule: HabitSchedule } | { ok: false; message: string } {
  if (!kind || kind === "daily") {
    return { ok: true, schedule: dailySchedule };
  }

  if (kind === "weekdays") {
    const days = weekdayKeys.filter((day) => weekdays.includes(day));

    if (days.length === 0) {
      return { ok: false, message: "Pick at least one day." };
    }

    return { ok: true, schedule: scheduleFromInput({ kind: "weekdays", days }) };
  }

  if (kind === "weekly") {
    const count = Number.parseInt(timesPerWeek, 10);

    if (!Number.isInteger(count) || count < 1 || count > maxTimesPerWeek) {
      return {
        ok: false,
        message: `Choose between 1 and ${maxTimesPerWeek} times a week. For every day, pick Every day.`,
      };
    }

    return { ok: true, schedule: { kind: "weekly", timesPerWeek: count } };
  }

  return { ok: false, message: "Choose how often this habit is due." };
}

export function scheduleFromRow(row: ScheduleRow): StoredSchedule {
  if (row.kind === "weekdays" && row.weekdays) {
    return { kind: "weekdays", weekdays: row.weekdays };
  }

  if (row.kind === "weekly" && row.timesPerWeek) {
    return { kind: "weekly", timesPerWeek: row.timesPerWeek };
  }

  if (row.kind === "paused") {
    return { kind: "paused" };
  }

  return dailySchedule;
}

export function scheduleToRow(schedule: StoredSchedule): ScheduleRow {
  return {
    kind: schedule.kind,
    weekdays: schedule.kind === "weekdays" ? schedule.weekdays : null,
    timesPerWeek: schedule.kind === "weekly" ? schedule.timesPerWeek : null,
  };
}

export function schedulesEqual(first: StoredSchedule, second: StoredSchedule) {
  const a = scheduleToRow(first);
  const b = scheduleToRow(second);

  return a.kind === b.kind && a.weekdays === b.weekdays && a.timesPerWeek === b.timesPerWeek;
}

export function formatScheduleLabel(schedule: HabitSchedule) {
  if (schedule.kind === "weekly") {
    return schedule.timesPerWeek === 1 ? "Once a week" : `${schedule.timesPerWeek} times a week`;
  }

  if (schedule.kind === "weekdays") {
    if (schedule.weekdays === workWeekMask) return "Weekdays";
    if (schedule.weekdays === weekendMask) return "Weekends";
    return maskToWeekdays(schedule.weekdays)
      .map((day) => weekdayLabels[day])
      .join(", ");
  }

  return "Every day";
}

export function scheduleForDate(history: ScheduleEntry[], date: string): StoredSchedule | null {
  let found: StoredSchedule | null = null;

  for (const entry of history) {
    if (entry.effectiveFrom > date) break;
    found = entry.schedule;
  }

  return found;
}

export function latestHabitSchedule(history: ScheduleEntry[]): HabitSchedule {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const schedule = history[index].schedule;
    if (schedule.kind !== "paused") return schedule;
  }

  return dailySchedule;
}

export function isDueOn(schedule: StoredSchedule | null, date: string) {
  if (!schedule || schedule.kind === "paused" || schedule.kind === "weekly") return false;
  if (schedule.kind === "daily") return true;

  return (schedule.weekdays & (1 << getWeekdayIndex(date))) !== 0;
}

function dueDaysPerWeek(schedule: HabitSchedule) {
  if (schedule.kind === "daily") return 7;
  if (schedule.kind === "weekdays") return maskToWeekdays(schedule.weekdays).length;
  return schedule.timesPerWeek;
}

export type DayStatus = "not-started" | "done" | "not-due" | "pending" | "graced" | "missed" | "weekly";

export type HabitOccurrence = {
  date: string;
  due: number;
  done: number;
};

export type HabitEvaluation = {
  schedule: HabitSchedule | null;
  runUnit: "days" | "weeks";
  currentRun: number;
  longestRun: number;
  runGoal: number;
  dueToday: boolean;
  doneToday: boolean;
  atRisk: boolean;
  thisWeek: { done: number; target: number } | null;
  dayStatuses: Map<string, DayStatus>;
  occurrences: HabitOccurrence[];
};

type WeekRecord = {
  weekStart: string;
  target: number;
  done: number;
  isCurrent: boolean;
  isWeekly: boolean;
};

export function evaluateHabit({
  history,
  checkIns,
  today,
  windowStart,
}: {
  history: ScheduleEntry[];
  checkIns: Map<string, "win" | "pass">;
  today: string;
  windowStart: string;
}): HabitEvaluation {
  const start = getWeekStart(windowStart);
  const dates = start <= today ? enumerateLocalDates(start, today) : [];
  const todaySchedule = scheduleForDate(history, today);
  const currentSchedule =
    todaySchedule && todaySchedule.kind !== "paused" ? todaySchedule : null;
  const dayStatuses = new Map<string, DayStatus>();
  const occurrences: HabitOccurrence[] = [];
  const graceUsedByWeek = new Set<string>();

  for (const date of dates) {
    const schedule = scheduleForDate(history, date);
    const isDone = checkIns.get(date) === "win";

    if (!schedule || schedule.kind === "paused") {
      dayStatuses.set(date, "not-started");
      continue;
    }

    if (schedule.kind === "weekly") {
      dayStatuses.set(date, "weekly");
      continue;
    }

    if (!isDueOn(schedule, date)) {
      dayStatuses.set(date, isDone ? "done" : "not-due");
      if (isDone) occurrences.push({ date, due: 1, done: 1 });
      continue;
    }

    if (isDone) {
      dayStatuses.set(date, "done");
      occurrences.push({ date, due: 1, done: 1 });
      continue;
    }

    if (date === today) {
      dayStatuses.set(date, "pending");
      continue;
    }

    const weekStart = getWeekStart(date);
    if (graceUsedByWeek.has(weekStart)) {
      dayStatuses.set(date, "missed");
    } else {
      graceUsedByWeek.add(weekStart);
      dayStatuses.set(date, "graced");
    }
    occurrences.push({ date, due: 1, done: 0 });
  }

  const weeks = buildWeekRecords({ history, checkIns, today, start });

  for (const week of weeks) {
    if (!week.isWeekly) continue;
    const done = Math.min(week.done, week.target);
    const daysLeft = week.isCurrent ? daysLeftInWeek(today) : 0;
    const guaranteedShortfall = Math.max(0, week.target - week.done - daysLeft);
    occurrences.push({
      date: week.weekStart,
      due: week.isCurrent ? done + guaranteedShortfall : week.target,
      done,
    });
  }

  const runUnit = currentSchedule?.kind === "weekly" ? "weeks" : "days";
  const runs =
    runUnit === "weeks"
      ? computeWeekRuns(weeks)
      : computeDayRuns(dates, dayStatuses, history);
  const doneToday = checkIns.get(today) === "win";
  const currentWeek = weeks.at(-1);
  const thisWeek =
    currentSchedule?.kind === "weekly" && currentWeek?.isWeekly
      ? { done: currentWeek.done, target: currentWeek.target }
      : null;
  const dueToday = currentSchedule
    ? currentSchedule.kind === "weekly"
      ? (thisWeek?.done ?? 0) < (thisWeek?.target ?? currentSchedule.timesPerWeek)
      : isDueOn(currentSchedule, today)
    : false;
  const atRisk = computeAtRisk({
    currentSchedule,
    dueToday,
    doneToday,
    thisWeek,
    today,
    graceUsed: graceUsedByWeek.has(getWeekStart(today)),
    currentRun: runs.current,
  });

  return {
    schedule: currentSchedule,
    runUnit,
    currentRun: runs.current,
    longestRun: runs.longest,
    runGoal: currentSchedule ? (runUnit === "weeks" ? 4 : dueDaysPerWeek(currentSchedule)) : 7,
    dueToday,
    doneToday,
    atRisk,
    thisWeek,
    dayStatuses,
    occurrences: occurrences.sort((first, second) => first.date.localeCompare(second.date)),
  };
}

function daysLeftInWeek(today: string) {
  return 7 - getWeekdayIndex(today);
}

function buildWeekRecords({
  history,
  checkIns,
  today,
  start,
}: {
  history: ScheduleEntry[];
  checkIns: Map<string, "win" | "pass">;
  today: string;
  start: string;
}): WeekRecord[] {
  const records: WeekRecord[] = [];
  const currentWeekStart = getWeekStart(today);

  for (let weekStart = start; weekStart <= currentWeekStart; weekStart = offsetLocalDate(weekStart, 7)) {
    const isCurrent = weekStart === currentWeekStart;
    const weekEnd = isCurrent ? today : offsetLocalDate(weekStart, 6);
    const schedule = scheduleForDate(history, weekEnd);

    if (!schedule || schedule.kind !== "weekly") {
      records.push({ weekStart, target: 0, done: 0, isCurrent, isWeekly: false });
      continue;
    }

    const segmentStart = weeklySegmentStart(history, weekEnd);
    const countFrom = segmentStart > weekStart ? segmentStart : weekStart;
    const lastDay = offsetLocalDate(weekStart, 6);
    const availableDays = enumerateLocalDates(countFrom, lastDay).length;
    const target = Math.min(schedule.timesPerWeek, availableDays);
    const done = enumerateLocalDates(countFrom, weekEnd).filter(
      (date) => checkIns.get(date) === "win",
    ).length;

    records.push({ weekStart, target, done, isCurrent, isWeekly: true });
  }

  return records;
}

function weeklySegmentStart(history: ScheduleEntry[], date: string) {
  let segmentStart: string | null = null;

  for (const entry of history) {
    if (entry.effectiveFrom > date) break;
    if (entry.schedule.kind !== "weekly") {
      segmentStart = null;
    } else if (segmentStart === null) {
      segmentStart = entry.effectiveFrom;
    }
  }

  return segmentStart ?? date;
}

function computeWeekRuns(weeks: WeekRecord[]) {
  let current = 0;
  const currentWeek = weeks.at(-1);

  for (let index = weeks.length - 2; index >= 0; index -= 1) {
    const week = weeks[index];
    if (!week.isWeekly || week.done < week.target) break;
    current += 1;
  }

  if (currentWeek?.isWeekly && currentWeek.done >= currentWeek.target && currentWeek.target > 0) {
    current += 1;
  }

  let longest = 0;
  let run = 0;

  for (const week of weeks) {
    const met = week.isWeekly && week.target > 0 && week.done >= week.target;

    if (met) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (!week.isCurrent) {
      run = 0;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

function computeDayRuns(
  dates: string[],
  dayStatuses: Map<string, DayStatus>,
  history: ScheduleEntry[],
) {
  let current = 0;

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const date = dates[index];
    const status = dayStatuses.get(date);
    if (status === "missed" || status === "not-started" || status === "weekly") break;
    if (status === "done" && isDueOn(scheduleForDate(history, date), date)) current += 1;
  }

  let longest = 0;
  let run = 0;

  for (const date of dates) {
    const status = dayStatuses.get(date);

    if (status === "missed" || status === "not-started" || status === "weekly") {
      run = 0;
      continue;
    }

    if (status === "done" && isDueOn(scheduleForDate(history, date), date)) {
      run += 1;
      longest = Math.max(longest, run);
    }
  }

  return { current, longest: Math.max(longest, current) };
}

function computeAtRisk({
  currentSchedule,
  dueToday,
  doneToday,
  thisWeek,
  today,
  graceUsed,
  currentRun,
}: {
  currentSchedule: HabitSchedule | null;
  dueToday: boolean;
  doneToday: boolean;
  thisWeek: { done: number; target: number } | null;
  today: string;
  graceUsed: boolean;
  currentRun: number;
}) {
  if (!currentSchedule || doneToday) return false;

  if (currentSchedule.kind === "weekly") {
    if (!thisWeek) return false;
    const remaining = thisWeek.target - thisWeek.done;
    return remaining > 0 && remaining >= daysLeftInWeek(today);
  }

  return dueToday && graceUsed && currentRun > 0;
}

export function sumOccurrences(occurrences: HabitOccurrence[], from: string, to: string) {
  let due = 0;
  let done = 0;

  for (const occurrence of occurrences) {
    if (occurrence.date < from || occurrence.date > to) continue;
    due += occurrence.due;
    done += occurrence.done;
  }

  return { due, done };
}

export function toDoneRate(done: number, due: number) {
  return due > 0 ? done / due : null;
}

export function formatRunLabel(run: number, unit: "days" | "weeks") {
  if (run < 2) return null;
  return `${run} ${unit} in a row`;
}

export function isDueStatus(status: DayStatus | undefined) {
  return status === "done" || status === "pending" || status === "graced" || status === "missed";
}

export function groupCheckInsByQuest(
  rows: { questId: string; localDate: string; outcome: string }[],
) {
  const byQuest = new Map<string, Map<string, "win" | "pass">>();

  for (const row of rows) {
    const map = byQuest.get(row.questId) ?? new Map<string, "win" | "pass">();
    map.set(row.localDate, row.outcome === "win" ? "win" : "pass");
    byQuest.set(row.questId, map);
  }

  return byQuest;
}

export function countDueByDate(evaluations: HabitEvaluation[]) {
  const dueByDate = new Map<string, number>();

  for (const evaluation of evaluations) {
    for (const [date, status] of evaluation.dayStatuses) {
      if (isDueStatus(status)) {
        dueByDate.set(date, (dueByDate.get(date) ?? 0) + 1);
      }
    }
  }

  return dueByDate;
}

export function hasNoRecentDone(evaluation: HabitEvaluation, today: string) {
  const currentPeriodStart = evaluation.runUnit === "weeks" ? getWeekStart(today) : today;
  const doneThisPeriod = evaluation.occurrences.some(
    (occurrence) => occurrence.date >= currentPeriodStart && occurrence.done > 0,
  );

  if (doneThisPeriod) return false;

  const judged = evaluation.occurrences.filter((occurrence) => occurrence.date < currentPeriodStart);
  const needed = evaluation.runUnit === "weeks" ? 2 : 4;
  const recent = judged.slice(-needed);

  return recent.length >= needed && recent.every((occurrence) => occurrence.done === 0);
}
