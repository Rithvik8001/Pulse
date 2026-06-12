import "server-only";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailPreferences } from "@/lib/db/schema";
import { normalizeEmail, isValidEmail } from "@/lib/email/email-core";
import { createClient } from "@/lib/supabase/server";

export async function syncEmailPreference(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  const now = new Date();
  const [preference] = await db
    .insert(emailPreferences)
    .values({
      userId,
      email: normalizedEmail,
      unsubscribeToken: createUnsubscribeToken(),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: emailPreferences.userId,
      set: {
        email: normalizedEmail,
        updatedAt: now,
      },
    })
    .returning();

  return preference ?? null;
}

export async function syncCurrentUserEmailPreference() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = data?.claims?.email;

  if (error || typeof userId !== "string" || typeof email !== "string") {
    return null;
  }

  return syncEmailPreference(userId, email);
}

export async function findEmailPreferenceByToken(token: string) {
  const cleanToken = token.trim();

  if (!cleanToken) return null;

  const [preference] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.unsubscribeToken, cleanToken))
    .limit(1);

  return preference ?? null;
}

export async function unsubscribeProductEmails(token: string) {
  const preference = await findEmailPreferenceByToken(token);

  if (!preference) {
    return null;
  }

  const now = new Date();
  const [updated] = await db
    .update(emailPreferences)
    .set({
      productEmailsEnabled: false,
      weeklyDigestEnabled: false,
      unsubscribedAt: now,
      updatedAt: now,
    })
    .where(eq(emailPreferences.id, preference.id))
    .returning();

  return updated ?? null;
}

function createUnsubscribeToken() {
  return randomBytes(32).toString("base64url");
}
