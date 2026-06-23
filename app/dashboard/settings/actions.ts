"use server";

import { logWarn } from "@/lib/observability/logger";
import { requireUserId } from "@/lib/pulse/dashboard";
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
