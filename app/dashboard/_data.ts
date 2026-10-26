import { cache } from "react";

import { syncEmailPreference } from "@/lib/email/preferences";

/**
 * The email preference row for the signed-in user, deduplicated per request
 * so the layout and the settings page share one call.
 */
export const getEmailPreferenceRow = cache(
  async (userId: string, email: string) => syncEmailPreference(userId, email),
);
