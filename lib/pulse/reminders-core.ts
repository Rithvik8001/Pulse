import { z } from "zod";

import { getLocalDateInTimeZone, offsetLocalDate } from "@/lib/pulse/local-date-core";
import type { HabitEvaluation } from "@/lib/pulse/schedule-core";

export const reminderWindowMinutes = 20;
export const reminderSlotMinutes = 15;
export const defaultDailyMinute = 1200;
export const defaultEveningMinute = 1230;
export const firstReminderSlot = 360;
export const lastReminderSlot = 1425;
export const testRemindersPerHour = 3;

const habitTitleLimit = 40;
const listedHabitLimit = 2;
const suggestionWindowDays = 28;
const suggestionMinDays = 5;
const suggestionLeadMinutes = 30;
const latestSuggestedMinute = 1380;
const dailyTtlSeconds = 3 * 60 * 60;
const minimumTtlSeconds = 5 * 60;

export type ReminderKind = "daily" | "evening";

export type ReminderSettingsValues = {
  dailyEnabled: boolean;
  dailyMinute: number;
  eveningEnabled: boolean;
  eveningMinute: number;
};

export const defaultReminderSettings: ReminderSettingsValues = {
  dailyEnabled: false,
  dailyMinute: defaultDailyMinute,
  eveningEnabled: false,
  eveningMinute: defaultEveningMinute,
};

export type ReminderHabitInput = {
  id: string;
  title: string;
  evaluation: HabitEvaluation;
  todayOutcome: "win" | "pass" | null;
};

export type ReminderHabit = {
  id: string;
  title: string;
  atRisk: boolean;
  currentRun: number;
  runUnit: "days" | "weeks";
};

export type ReminderMessage = {
  title: string;
  body: string;
};

export type ReminderPayload = {
  web_push: 8030;
  notification: {
    title: string;
    body: string;
    navigate: string;
    tag: string;
    lang: string;
  };
};

export const reminderMinuteSchema = z
  .number()
  .int()
  .min(0)
  .max(lastReminderSlot)
  .refine((minute) => minute % reminderSlotMinutes === 0, "Pick a time on the quarter hour.");

export const reminderSettingsSchema = z
  .object({
    dailyEnabled: z.boolean(),
    dailyMinute: reminderMinuteSchema,
    eveningEnabled: z.boolean(),
    eveningMinute: reminderMinuteSchema,
  })
  .refine((settings) => settings.eveningMinute > settings.dailyMinute, {
    message: "Pick a last call time after the daily reminder.",
    path: ["eveningMinute"],
  });

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).regex(/^https:\/\/\S+$/),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export function getLocalMinute(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return (hour % 24) * 60 + minute;
}

export function isReminderDue(scheduledMinute: number, localMinute: number) {
  const elapsed = localMinute - scheduledMinute;
  return elapsed >= 0 && elapsed < reminderWindowMinutes;
}

export function getDueReminderKinds(
  settings: ReminderSettingsValues,
  now: Date,
  timeZone: string,
): { kind: ReminderKind; localDate: string }[] {
  const localMinute = getLocalMinute(now, timeZone);
  const localDate = getLocalDateInTimeZone(now, timeZone);
  const kinds: { kind: ReminderKind; localDate: string }[] = [];

  if (settings.dailyEnabled && isReminderDue(settings.dailyMinute, localMinute)) {
    kinds.push({ kind: "daily", localDate });
  }

  if (settings.eveningEnabled && isReminderDue(settings.eveningMinute, localMinute)) {
    kinds.push({ kind: "evening", localDate });
  }

  return kinds;
}

export function buildReminderDedupeKey(userId: string, kind: ReminderKind, localDate: string) {
  return `${userId}:${kind}:${localDate}`;
}

export function selectOpenHabits(habits: ReminderHabitInput[]) {
  const open = habits
    .filter(({ evaluation, todayOutcome }) => {
      if (todayOutcome !== null || !evaluation.schedule) return false;
      if (evaluation.schedule.kind === "weekly") return evaluation.atRisk;
      return evaluation.dueToday;
    })
    .map(({ id, title, evaluation }) => ({
      id,
      title,
      atRisk: evaluation.atRisk,
      currentRun: evaluation.currentRun,
      runUnit: evaluation.runUnit,
    }));

  return [...open.filter((habit) => habit.atRisk), ...open.filter((habit) => !habit.atRisk)];
}

export function shortenHabitTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length <= habitTitleLimit) return trimmed;
  return trimmed.slice(0, habitTitleLimit).trimEnd();
}

export function formatHabitList(titles: string[]) {
  const names = titles.map(shortenHabitTitle);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const rest = names.length - listedHabitLimit;
  return `${names.slice(0, listedHabitLimit).join(", ")} and ${rest} more`;
}

function openVerb(count: number) {
  return count === 1 ? "is" : "are";
}

function formatRun(run: number, unit: "days" | "weeks") {
  if (unit === "weeks") return run === 1 ? "1 week in a row" : `${run} weeks in a row`;
  return run === 1 ? "1 day in a row" : `${run} days in a row`;
}

export function buildDailyReminder(open: ReminderHabit[]): ReminderMessage {
  return {
    title: "Pulse",
    body: `${formatHabitList(open.map((habit) => habit.title))} ${openVerb(open.length)} still open today.`,
  };
}

export function buildEveningFallback(open: ReminderHabit[]): ReminderMessage {
  const lead = open.find((habit) => habit.atRisk && habit.currentRun >= 2);

  if (lead) {
    return {
      title: "Pulse",
      body: `Last call for today. Check in ${shortenHabitTitle(lead.title)} to keep ${formatRun(lead.currentRun, lead.runUnit)} going.`,
    };
  }

  return {
    title: "Pulse",
    body: `Last call for today. ${formatHabitList(open.map((habit) => habit.title))} ${openVerb(open.length)} still open.`,
  };
}

export function buildTestReminder(): ReminderMessage {
  return {
    title: "Pulse",
    body: "Reminders are on for this device. You'll hear from Pulse only when a habit is still open.",
  };
}

export function buildReminderPayload(
  message: ReminderMessage,
  tag: string,
  navigate: string,
  lang = "en",
): ReminderPayload {
  return {
    web_push: 8030,
    notification: { title: message.title, body: message.body, navigate, tag, lang },
  };
}

export function buildPushTopic(kind: ReminderKind | "test", localDate: string) {
  return `${kind}${localDate.replaceAll("-", "")}`;
}

export function getPushTtlSeconds(kind: ReminderKind | "test", localMinute: number) {
  const untilMidnight = Math.max((24 * 60 - localMinute) * 60, minimumTtlSeconds);
  if (kind === "evening") return untilMidnight;
  return Math.min(dailyTtlSeconds, untilMidnight);
}

export function suggestDailyMinute(
  checkIns: { createdAt: Date; localDate: string }[],
  timeZone: string,
  today: string,
  eveningMinute: number | null,
): { typicalMinute: number; suggestedMinute: number } | null {
  const windowStart = offsetLocalDate(today, -suggestionWindowDays);
  const earliestByDate = new Map<string, number>();

  for (const row of checkIns) {
    if (row.localDate < windowStart || row.localDate > today) continue;
    if (getLocalDateInTimeZone(row.createdAt, timeZone) !== row.localDate) continue;
    const minute = getLocalMinute(row.createdAt, timeZone);
    const current = earliestByDate.get(row.localDate);
    if (current === undefined || minute < current) earliestByDate.set(row.localDate, minute);
  }

  if (earliestByDate.size < suggestionMinDays) return null;

  const minutes = [...earliestByDate.values()].sort((first, second) => first - second);
  const middle = Math.floor(minutes.length / 2);
  const typicalMinute =
    minutes.length % 2 === 0
      ? Math.round((minutes[middle - 1] + minutes[middle]) / 2)
      : minutes[middle];
  const rounded = Math.round(typicalMinute / reminderSlotMinutes) * reminderSlotMinutes;
  const suggestedMinute = Math.min(
    Math.max(rounded - suggestionLeadMinutes, firstReminderSlot),
    latestSuggestedMinute,
  );

  if (eveningMinute !== null && suggestedMinute >= eveningMinute) return null;

  return { typicalMinute, suggestedMinute };
}

export function getReminderSlots(after?: number) {
  const slots: number[] = [];
  for (let minute = firstReminderSlot; minute <= lastReminderSlot; minute += reminderSlotMinutes) {
    if (after === undefined || minute > after) slots.push(minute);
  }
  return slots;
}

export function formatMinuteLabel(minute: number, locale: string) {
  const date = new Date(Date.UTC(2026, 0, 1, Math.floor(minute / 60), minute % 60));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function parseMinuteValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const minute = Number(value);
  return reminderMinuteSchema.safeParse(minute).success ? minute : null;
}

export function parseClockTime(value: string) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function snapReminderMinute(minute: number) {
  const snapped = Math.round(minute / reminderSlotMinutes) * reminderSlotMinutes;
  return Math.min(Math.max(snapped, 0), lastReminderSlot);
}

export function describeDevice(userAgent: string | null) {
  const agent = userAgent ?? "";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const device = /iPhone/.test(agent)
    ? "iPhone"
    : /iPad/.test(agent)
      ? "iPad"
      : /Android/.test(agent)
        ? "Android"
        : /Mac OS X/.test(agent)
          ? "Mac"
          : /Windows/.test(agent)
            ? "Windows"
            : /Linux/.test(agent)
              ? "Linux"
              : null;

  return device ? `${browser} on ${device}` : browser;
}

export const reminderNudgeOutputSchema = z.object({
  line: z.string().min(8).max(160),
});

const reminderLineLimit = 120;
const bannedReminderWords = [
  "quest",
  "quests",
  "proof",
  "win",
  "wins",
  "pass",
  "story",
  "momentum",
  "identity",
  "evidence",
  "signal",
  "character",
  "streak",
  "streaks",
  "coach",
];

export function buildReminderNudgePrompt({
  identity,
  open,
}: {
  identity: string;
  open: ReminderHabit[];
}) {
  const system = [
    "You are Pip, the habit assistant in Pulse. Write the text of one evening reminder notification.",
    "Write exactly one plain sentence, under 110 characters, speaking to the person as you.",
    "Name at least one of the open habits exactly as written. If a habit has a run of 2 or more, you may mention it as \"N days in a row\" or \"N weeks in a row\".",
    "Be warm and calm. No guilt, no pressure, no questions.",
    "Use sentence case. No exclamation marks, emoji, em dashes, arrows or quotation marks. Do not name yourself.",
    'Words to use: habit, check-in, Done, "N days in a row". Never use quest, proof, win, pass, story, momentum, identity, evidence, signal, character, streak or coach.',
  ].join("\n");

  const lines = open.slice(0, 4).map((habit) => {
    const run = habit.currentRun >= 2 ? `, ${formatRun(habit.currentRun, habit.runUnit)}` : "";
    const risk = habit.atRisk ? ", run ends if not done today" : "";
    return `- ${shortenHabitTitle(habit.title)}${run}${risk}`;
  });

  const prompt = [
    `Who they are becoming: ${identity.slice(0, 80)}`,
    "Habits still open today:",
    ...lines,
  ].join("\n");

  return { system, prompt };
}

export function sanitizeReminderLine(line: string, open: ReminderHabit[]) {
  const text = line.trim().replace(/\s+/g, " ").replace(/^["']|["']$/g, "");
  if (text.length < 8 || text.length > reminderLineLimit) return null;
  if (/[!\u2014\u2013\u2190-\u21ff]|->|=>/.test(text)) return null;
  if (/\p{Extended_Pictographic}/u.test(text)) return null;

  const titles = open.map((habit) => shortenHabitTitle(habit.title));
  const lower = text.toLowerCase();
  if (!titles.some((title) => lower.includes(title.toLowerCase()))) return null;

  const withoutTitles = titles.reduce(
    (current, title) => current.split(title.toLowerCase()).join(" "),
    lower,
  );
  const words = withoutTitles.split(/[^a-z]+/);
  if (words.some((word) => bannedReminderWords.includes(word))) return null;
  if (/\bpip\b/.test(withoutTitles)) return null;

  return text;
}
