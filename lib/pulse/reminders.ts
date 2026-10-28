import "server-only";

import { generateText, Output } from "ai";
import { and, asc, count, eq, exists, gt, gte, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  characters,
  checkIns,
  pushSubscriptions,
  quests,
  reminderDeliveries,
  reminderSettings,
  userSettings,
  type ReminderDeliveryStatus,
} from "@/lib/db/schema";
import { logError, logInfo } from "@/lib/observability/logger";
import {
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { aiModel, hasAiKey } from "@/lib/pulse/ai-provider";
import { getLocalDateInTimeZone, offsetLocalDate } from "@/lib/pulse/local-date-core";
import { hasPushKeys, listPushDevices, sendPushToUser } from "@/lib/pulse/push";
import {
  buildDailyReminder,
  buildEveningFallback,
  buildPushTopic,
  buildReminderDedupeKey,
  buildReminderNudgePrompt,
  buildReminderPayload,
  buildTestReminder,
  defaultReminderSettings,
  getDueReminderKinds,
  getLocalMinute,
  getPushTtlSeconds,
  reminderNudgeOutputSchema,
  sanitizeReminderLine,
  selectOpenHabits,
  suggestDailyMinute,
  testRemindersPerHour,
  type ReminderHabit,
  type ReminderKind,
  type ReminderMessage,
  type ReminderSettingsValues,
} from "@/lib/pulse/reminders-core";
import { evaluateHabit, groupCheckInsByQuest } from "@/lib/pulse/schedule-core";
import { getScheduleHistoriesForUser } from "@/lib/pulse/schedules";
import { getUserSettingsForUser } from "@/lib/pulse/user-settings";

const reminderModel = "claude-haiku-5-5";
const userConcurrency = 8;
const aiTimeoutMs = 10_000;

export type ReminderBatchResult = {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  aiUsed: number;
  truncated: boolean;
};

type ReminderCandidate = {
  userId: string;
  timeZone: string | null;
  identity: string;
  settings: ReminderSettingsValues;
};

export async function getReminderSettingsForUser(userId: string) {
  const [row] = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1);

  return {
    settings: row
      ? {
          dailyEnabled: row.dailyEnabled,
          dailyMinute: row.dailyMinute,
          eveningEnabled: row.eveningEnabled,
          eveningMinute: row.eveningMinute,
        }
      : defaultReminderSettings,
    promptDismissed: Boolean(row?.softPromptDismissedAt),
  };
}

export async function saveReminderSettingsForUser(
  userId: string,
  settings: ReminderSettingsValues,
  options: { dismissPrompt?: boolean } = {},
) {
  const now = new Date();
  const dismissed = options.dismissPrompt ? { softPromptDismissedAt: now } : {};

  await db
    .insert(reminderSettings)
    .values({ userId, ...settings, ...dismissed })
    .onConflictDoUpdate({
      target: reminderSettings.userId,
      set: { ...settings, ...dismissed, updatedAt: now },
    });
}

export async function dismissReminderPromptForUser(userId: string) {
  const now = new Date();

  await db
    .insert(reminderSettings)
    .values({ userId, softPromptDismissedAt: now })
    .onConflictDoUpdate({
      target: reminderSettings.userId,
      set: { softPromptDismissedAt: now, updatedAt: now },
    });
}

export async function getReminderSuggestionForUser(
  userId: string,
  timeZone: string,
  today: string,
  eveningMinute: number | null,
) {
  const rows = await db
    .select({ createdAt: checkIns.createdAt, localDate: checkIns.localDate })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), gte(checkIns.localDate, offsetLocalDate(today, -28))));

  return suggestDailyMinute(rows, timeZone, today, eveningMinute);
}

export async function getReminderStateForUser(userId: string, timeZone: string, today: string) {
  const [{ settings, promptDismissed }, devices] = await Promise.all([
    getReminderSettingsForUser(userId),
    listPushDevices(userId),
  ]);
  const suggestion = await getReminderSuggestionForUser(
    userId,
    timeZone,
    today,
    settings.eveningEnabled ? settings.eveningMinute : null,
  );

  return {
    settings,
    promptDismissed,
    devices,
    suggestion,
    pushConfigured: hasPushKeys(),
  };
}

export async function hasPushDevice(userId: string) {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);

  return Boolean(row);
}

export async function getReminderHabitsForUser(userId: string, today: string) {
  const windowStart = offsetLocalDate(today, -90);
  const [activeQuests, checkInRows, histories] = await Promise.all([
    db
      .select({ id: quests.id, title: quests.title })
      .from(quests)
      .where(and(eq(quests.userId, userId), eq(quests.status, "active"), isNull(quests.archivedAt)))
      .orderBy(asc(quests.position)),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.localDate, offsetLocalDate(today, -97)))),
    getScheduleHistoriesForUser(userId),
  ]);
  const byQuest = groupCheckInsByQuest(checkInRows);

  return selectOpenHabits(
    activeQuests.map((quest) => {
      const questCheckIns = byQuest.get(quest.id) ?? new Map<string, "win" | "pass">();
      return {
        id: quest.id,
        title: quest.title,
        evaluation: evaluateHabit({
          history: histories.get(quest.id) ?? [],
          checkIns: questCheckIns,
          today,
          windowStart,
        }),
        todayOutcome: questCheckIns.get(today) ?? null,
      };
    }),
  );
}

async function writeEveningLine(
  userId: string,
  identity: string,
  open: ReminderHabit[],
): Promise<{ message: ReminderMessage; aiUsed: boolean }> {
  const fallback = { message: buildEveningFallback(open), aiUsed: false };
  if (!hasAiKey()) return fallback;

  const { system, prompt } = buildReminderNudgePrompt({ identity, open });
  const reservation = await reserveAiUsage({
    userId,
    feature: "reminder-nudge",
    estimatedInputTokens: estimateAiTextTokens(`${system}\n${prompt}`),
    metadata: { kind: "evening", habitCount: open.length },
  });

  if (!reservation.allowed) {
    logInfo({
      event: "reminder_ai_fallback",
      message: "Used fixed reminder copy because the AI allowance is used up.",
      feature: "reminder-nudge",
      userId,
      metadata: { reason: "limit" },
    });
    return fallback;
  }

  try {
    const { output, totalUsage, finishReason } = await generateText({
      model: aiModel(reminderModel),
      output: Output.object({ schema: reminderNudgeOutputSchema }),
      system,
      prompt,
      providerOptions: reservation.providerOptions,
      maxOutputTokens: reservation.maxOutputTokens,
      abortSignal: AbortSignal.timeout(aiTimeoutMs),
    });
    await completeAiUsage({ eventId: reservation.eventId, usage: totalUsage, finishReason });

    const line = sanitizeReminderLine(output.line, open);
    if (!line) {
      logInfo({
        event: "reminder_ai_fallback",
        message: "Used fixed reminder copy because the AI line did not pass checks.",
        feature: "reminder-nudge",
        userId,
        metadata: { reason: "sanitized" },
      });
      return { message: fallback.message, aiUsed: true };
    }

    return { message: { title: "Pulse", body: line }, aiUsed: true };
  } catch (error) {
    logError({
      event: "reminder_ai_fallback",
      message: "Reminder line generation failed.",
      feature: "reminder-nudge",
      userId,
      error,
      metadata: { reason: "error" },
    });
    await failAiUsage({ eventId: reservation.eventId, error });
    return fallback;
  }
}

async function claimDelivery(userId: string, kind: ReminderKind | "test", localDate: string, dedupeKey: string) {
  const [row] = await db
    .insert(reminderDeliveries)
    .values({ userId, kind, localDate, dedupeKey, status: "pending" })
    .onConflictDoNothing({ target: reminderDeliveries.dedupeKey })
    .returning({ id: reminderDeliveries.id });

  return row?.id ?? null;
}

async function finishDelivery(
  id: string,
  status: ReminderDeliveryStatus,
  details: { habitCount?: number; aiUsed?: boolean; error?: string | null } = {},
) {
  await db
    .update(reminderDeliveries)
    .set({ status, ...details, updatedAt: new Date() })
    .where(eq(reminderDeliveries.id, id));
}

async function processCandidate(
  candidate: ReminderCandidate,
  now: Date,
): Promise<Omit<ReminderBatchResult, "truncated">> {
  const result = { processed: 1, sent: 0, skipped: 0, failed: 0, aiUsed: 0 };
  const timeZone = candidate.timeZone ?? "UTC";
  const kinds = getDueReminderKinds(candidate.settings, now, timeZone);

  for (const { kind, localDate } of kinds) {
    const deliveryId = await claimDelivery(
      candidate.userId,
      kind,
      localDate,
      buildReminderDedupeKey(candidate.userId, kind, localDate),
    );
    if (!deliveryId) continue;

    try {
      const open = await getReminderHabitsForUser(candidate.userId, localDate);

      if (open.length === 0) {
        await finishDelivery(deliveryId, "skipped");
        result.skipped += 1;
        continue;
      }

      const { message, aiUsed } =
        kind === "evening"
          ? await writeEveningLine(candidate.userId, candidate.identity, open)
          : { message: buildDailyReminder(open), aiUsed: false };
      if (aiUsed) result.aiUsed += 1;

      const push = await sendPushToUser(
        candidate.userId,
        buildReminderPayload(message, `${kind}-${localDate}`, "/dashboard"),
        {
          ttl: getPushTtlSeconds(kind, getLocalMinute(now, timeZone)),
          topic: buildPushTopic(kind, localDate),
        },
      );

      if (push.sent > 0) {
        await finishDelivery(deliveryId, "sent", { habitCount: open.length, aiUsed });
        result.sent += 1;
      } else {
        await finishDelivery(deliveryId, "error", {
          habitCount: open.length,
          aiUsed,
          error: "No device accepted the reminder.",
        });
        result.failed += 1;
      }
    } catch (error) {
      await finishDelivery(deliveryId, "error", {
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
      result.failed += 1;
      logError({
        event: "reminder_send_failed",
        message: "Sending a reminder failed.",
        feature: "reminders",
        userId: candidate.userId,
        error,
        metadata: { kind },
      });
    }
  }

  return result;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await run(current));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

  return results;
}

export async function sendReminderBatch({
  now = new Date(),
  limit = 100,
  deadlineMs,
}: {
  now?: Date;
  limit?: number;
  deadlineMs: number;
}): Promise<ReminderBatchResult> {
  const total: ReminderBatchResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    aiUsed: 0,
    truncated: false,
  };
  if (!hasPushKeys()) return total;

  let afterUserId: string | null = null;

  while (true) {
    if (Date.now() > deadlineMs) {
      total.truncated = true;
      break;
    }

    const rows: {
      userId: string;
      timeZone: string | null;
      identity: string;
      dailyEnabled: boolean;
      dailyMinute: number;
      eveningEnabled: boolean;
      eveningMinute: number;
    }[] = await db
      .select({
        userId: reminderSettings.userId,
        timeZone: userSettings.timeZone,
        identity: characters.name,
        dailyEnabled: reminderSettings.dailyEnabled,
        dailyMinute: reminderSettings.dailyMinute,
        eveningEnabled: reminderSettings.eveningEnabled,
        eveningMinute: reminderSettings.eveningMinute,
      })
      .from(reminderSettings)
      .innerJoin(characters, eq(characters.userId, reminderSettings.userId))
      .leftJoin(userSettings, eq(userSettings.userId, reminderSettings.userId))
      .where(
        and(
          or(eq(reminderSettings.dailyEnabled, true), eq(reminderSettings.eveningEnabled, true)),
          exists(
            db
              .select({ id: pushSubscriptions.id })
              .from(pushSubscriptions)
              .where(eq(pushSubscriptions.userId, reminderSettings.userId)),
          ),
          afterUserId ? gt(reminderSettings.userId, afterUserId) : undefined,
        ),
      )
      .orderBy(asc(reminderSettings.userId))
      .limit(limit);

    if (rows.length === 0) break;

    const results = await mapWithConcurrency(rows, userConcurrency, (row) =>
      processCandidate(
        {
          userId: row.userId,
          timeZone: row.timeZone,
          identity: row.identity,
          settings: {
            dailyEnabled: row.dailyEnabled,
            dailyMinute: row.dailyMinute,
            eveningEnabled: row.eveningEnabled,
            eveningMinute: row.eveningMinute,
          },
        },
        now,
      ),
    );

    for (const item of results) {
      total.processed += item.processed;
      total.sent += item.sent;
      total.skipped += item.skipped;
      total.failed += item.failed;
      total.aiUsed += item.aiUsed;
    }

    afterUserId = rows[rows.length - 1].userId;
    if (rows.length < limit) break;
  }

  return total;
}

export async function sendTestReminderForUser(userId: string) {
  if (!hasPushKeys()) {
    return { status: "error" as const, message: "Reminders aren't set up on this server yet." };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ value: recent }] = await db
    .select({ value: count() })
    .from(reminderDeliveries)
    .where(
      and(
        eq(reminderDeliveries.userId, userId),
        eq(reminderDeliveries.kind, "test"),
        gte(reminderDeliveries.createdAt, hourAgo),
      ),
    );

  if (recent >= testRemindersPerHour) {
    return {
      status: "error" as const,
      message: "You've sent 3 test reminders this hour. Try again later.",
    };
  }

  const now = new Date();
  const { timeZone, locale } = await getUserSettingsForUser(userId);
  const localDate = getLocalDateInTimeZone(now, timeZone);
  const deliveryId = await claimDelivery(
    userId,
    "test",
    localDate,
    `${userId}:test:${now.toISOString().slice(0, 16)}`,
  );

  if (!deliveryId) {
    return { status: "error" as const, message: "A test reminder was just sent. Wait a minute and try again." };
  }

  const push = await sendPushToUser(
    userId,
    buildReminderPayload(buildTestReminder(), "test", "/dashboard", locale),
    { ttl: 300, topic: buildPushTopic("test", localDate) },
  );

  if (push.sent === 0) {
    await finishDelivery(deliveryId, "error", { error: "No device accepted the reminder." });
    return {
      status: "error" as const,
      message: "No device could get the reminder. Turn reminders off and on again on this device.",
    };
  }

  await finishDelivery(deliveryId, "sent");
  return { status: "success" as const, message: "Test reminder sent." };
}

export async function getReminderPromptForUser(userId: string, timeZone: string, today: string) {
  if (!hasPushKeys()) return null;

  const { settings, promptDismissed } = await getReminderSettingsForUser(userId);
  if (promptDismissed || settings.dailyEnabled || settings.eveningEnabled) return null;

  const [firstCheckIn] = await db
    .select({ id: checkIns.id })
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .limit(1);
  if (!firstCheckIn) return null;

  const suggestion = await getReminderSuggestionForUser(userId, timeZone, today, settings.eveningMinute);
  return { minute: suggestion?.suggestedMinute ?? settings.dailyMinute };
}
