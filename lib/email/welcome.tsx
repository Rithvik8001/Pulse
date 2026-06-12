import "server-only";

import { eq } from "drizzle-orm";

import WelcomeEmail from "@/emails/welcome";
import { db } from "@/lib/db";
import { emailPreferences } from "@/lib/db/schema";
import { buildUnsubscribeUrl, welcomeDedupeKey } from "@/lib/email/email-core";
import { syncCurrentUserEmailPreference } from "@/lib/email/preferences";
import { getSiteUrl } from "@/lib/email/resend";
import { sendProductEmail } from "@/lib/email/send";

export async function sendWelcomeEmailAfterSetup(characterName: string) {
  const preference = await syncCurrentUserEmailPreference();

  if (
    !preference ||
    !preference.productEmailsEnabled ||
    preference.unsubscribedAt !== null ||
    preference.welcomeEmailSentAt !== null
  ) {
    return;
  }

  const siteUrl = getSiteUrl();
  const unsubscribeUrl = buildUnsubscribeUrl(
    siteUrl,
    preference.unsubscribeToken,
  );
  const result = await sendProductEmail({
    userId: preference.userId,
    type: "welcome",
    dedupeKey: welcomeDedupeKey(preference.userId),
    to: preference.email,
    subject: "Welcome to Pulse",
    react: (
      <WelcomeEmail
        characterName={characterName}
        dashboardUrl={new URL("/dashboard", siteUrl).toString()}
        unsubscribeUrl={unsubscribeUrl}
      />
    ),
    unsubscribeToken: preference.unsubscribeToken,
  });

  if (result.status === "sent") {
    await db
      .update(emailPreferences)
      .set({
        welcomeEmailSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailPreferences.id, preference.id));
  }
}
