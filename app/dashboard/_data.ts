import { cache } from "react";

import { syncEmailPreference } from "@/lib/email/preferences";

export const getEmailPreferenceRow = cache(
  async (userId: string, email: string) => syncEmailPreference(userId, email),
);
