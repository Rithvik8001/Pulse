"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { logWarn } from "@/lib/observability/logger";
import { requireUserId } from "@/lib/pulse/dashboard";
import { removePushSubscription, savePushSubscription } from "@/lib/pulse/push";
import {
  dismissReminderPromptForUser,
  getReminderSettingsForUser,
  saveReminderSettingsForUser,
  sendTestReminderForUser,
} from "@/lib/pulse/reminders";
import {
  pushSubscriptionSchema,
  reminderSettingsSchema,
  type PushSubscriptionInput,
  type ReminderSettingsValues,
} from "@/lib/pulse/reminders-core";
import { upsertUserSettingsForUser } from "@/lib/pulse/user-settings";
import type { UserSettingsInput } from "@/lib/pulse/user-settings-core";

export async function syncUserSettingsAction(input: UserSettingsInput) {
  const userId = await requireUserId();

  try {
    await upsertUserSettingsForUser(userId, input);
    return { status: "success" as const };
  } catch (error) {
    logWarn({
      event: "user_settings_sync_failed",
      message: "Could not sync browser locale settings.",
      userId,
      error,
    });

    return { status: "error" as const };
  }
}

export async function saveReminderSettingsAction(input: ReminderSettingsValues) {
  const userId = await requireUserId();
  const parsed = reminderSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error" as const,
      message: parsed.error.issues[0]?.message ?? "Check the reminder times and try again.",
    };
  }

  try {
    await saveReminderSettingsForUser(userId, parsed.data, { dismissPrompt: true });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { status: "success" as const };
  } catch (error) {
    logWarn({
      event: "reminder_settings_save_failed",
      message: "Could not save reminder settings.",
      feature: "reminders",
      userId,
      error,
    });
    return { status: "error" as const, message: "Reminders were not saved. Try again." };
  }
}

export async function savePushSubscriptionAction(input: PushSubscriptionInput) {
  const userId = await requireUserId();
  const parsed = pushSubscriptionSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error" as const, message: "This browser sent a subscription Pulse can't use. Reload and try again." };
  }

  try {
    const requestHeaders = await headers();
    await savePushSubscription(userId, parsed.data, requestHeaders.get("user-agent"));
    revalidatePath("/dashboard/settings");
    return { status: "success" as const };
  } catch (error) {
    logWarn({
      event: "push_subscription_save_failed",
      message: "Could not save a push subscription.",
      feature: "reminders",
      userId,
      error,
    });
    return { status: "error" as const, message: "Reminders were not turned on. Try again." };
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  const userId = await requireUserId();
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) {
    return { status: "error" as const };
  }

  await removePushSubscription(userId, endpoint);
  revalidatePath("/dashboard/settings");
  return { status: "success" as const };
}

export async function sendTestReminderAction() {
  const userId = await requireUserId();

  try {
    return await sendTestReminderForUser(userId);
  } catch (error) {
    logWarn({
      event: "reminder_test_failed",
      message: "Could not send a test reminder.",
      feature: "reminders",
      userId,
      error,
    });
    return { status: "error" as const, message: "The test reminder was not sent. Try again." };
  }
}

export async function dismissReminderPromptAction() {
  const userId = await requireUserId();
  await dismissReminderPromptForUser(userId);
  revalidatePath("/dashboard");
  return { status: "success" as const };
}

export async function enableDailyReminderAction(minute: number) {
  const userId = await requireUserId();
  const { settings } = await getReminderSettingsForUser(userId);
  const next = { ...settings, dailyEnabled: true, dailyMinute: minute };
  const parsed = reminderSettingsSchema.safeParse(next);

  if (!parsed.success) {
    return { status: "error" as const, message: "Pick a daily time before your last call in Settings." };
  }

  await saveReminderSettingsForUser(userId, parsed.data, { dismissPrompt: true });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { status: "success" as const };
}
