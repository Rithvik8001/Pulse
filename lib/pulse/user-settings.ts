import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { getLocalDateInTimeZone } from "@/lib/pulse/local-date-core";
import {
  defaultLocale,
  defaultTimeZone,
  normalizeUserSettings,
  type UserSettingsInput,
} from "@/lib/pulse/user-settings-core";

export type UserLocalDateContext = {
  now: Date;
  today: string;
  timeZone: string;
  locale: string;
};

export async function getUserSettingsForUser(userId: string) {
  const [settings] = await db
    .select({
      userId: userSettings.userId,
      timeZone: userSettings.timeZone,
      locale: userSettings.locale,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return (
    settings ?? {
      userId,
      timeZone: defaultTimeZone,
      locale: defaultLocale,
    }
  );
}

export async function upsertUserSettingsForUser(
  userId: string,
  input: UserSettingsInput,
) {
  const normalized = normalizeUserSettings(input);
  const now = new Date();
  const [settings] = await db
    .insert(userSettings)
    .values({
      userId,
      ...normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        ...normalized,
        updatedAt: now,
      },
    })
    .returning({
      userId: userSettings.userId,
      timeZone: userSettings.timeZone,
      locale: userSettings.locale,
    });

  return settings;
}

export async function getUserLocalDateContextForUser(
  userId: string,
  now = new Date(),
): Promise<UserLocalDateContext> {
  const settings = await getUserSettingsForUser(userId);

  return {
    now,
    today: getLocalDateInTimeZone(now, settings.timeZone),
    timeZone: settings.timeZone,
    locale: settings.locale,
  };
}

export function createDefaultDateContext(now = new Date()): UserLocalDateContext {
  return {
    now,
    today: getLocalDateInTimeZone(now, defaultTimeZone),
    timeZone: defaultTimeZone,
    locale: defaultLocale,
  };
}
