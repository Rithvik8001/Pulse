import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import WeeklyDigestEmail from "@/emails/weekly-digest";
import { db } from "@/lib/db";
import {
  characters,
  checkIns,
  emailDeliveries,
  emailPreferences,
  journalEntries,
  quests,
  weeklyStories,
} from "@/lib/db/schema";
import {
  buildUnsubscribeUrl,
  getPreviousWeekRange,
  weeklyDigestDedupeKey,
} from "@/lib/email/email-core";
import { getSiteUrl } from "@/lib/email/resend";
import { sendProductEmail } from "@/lib/email/send";
import { getLocalDate } from "@/lib/pulse/dashboard";
import { computeStatsData } from "@/lib/pulse/stats-core";

export type WeeklyDigestRunResult = {
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
};

type WeeklyDigestCandidate = {
  userId: string;
  email: string;
  unsubscribeToken: string;
  characterId: string;
  characterName: string;
};

export async function sendWeeklyDigestBatch({
  today = getLocalDate(),
  limit = 50,
}: {
  today?: string;
  limit?: number;
} = {}): Promise<WeeklyDigestRunResult> {
  const week = getPreviousWeekRange(today);
  const candidates = await getWeeklyDigestCandidates(limit);
  const result: WeeklyDigestRunResult = {
    checked: candidates.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const candidate of candidates) {
    const sendResult = await sendWeeklyDigestForCandidate(candidate, week);

    if (sendResult === "sent") result.sent += 1;
    if (sendResult === "skipped") result.skipped += 1;
    if (sendResult === "error") result.errors += 1;
  }

  return result;
}

async function getWeeklyDigestCandidates(limit: number) {
  return db
    .select({
      userId: emailPreferences.userId,
      email: emailPreferences.email,
      unsubscribeToken: emailPreferences.unsubscribeToken,
      characterId: characters.id,
      characterName: characters.name,
    })
    .from(emailPreferences)
    .innerJoin(characters, eq(characters.userId, emailPreferences.userId))
    .where(
      and(
        eq(emailPreferences.productEmailsEnabled, true),
        eq(emailPreferences.weeklyDigestEnabled, true),
      ),
    )
    .orderBy(asc(emailPreferences.createdAt))
    .limit(limit);
}

async function sendWeeklyDigestForCandidate(
  candidate: WeeklyDigestCandidate,
  week: { start: string; end: string },
) {
  const dedupeKey = weeklyDigestDedupeKey(candidate.userId, week.start);
  const [existingDelivery] = await db
    .select({
      id: emailDeliveries.id,
      status: emailDeliveries.status,
    })
    .from(emailDeliveries)
    .where(eq(emailDeliveries.dedupeKey, dedupeKey))
    .limit(1);

  if (
    existingDelivery &&
    (existingDelivery.status === "sent" ||
      existingDelivery.status === "pending")
  ) {
    return "skipped" as const;
  }

  const [questRows, proofRows, journalRows, storyRows] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        position: quests.position,
      })
      .from(quests)
      .where(eq(quests.userId, candidate.userId)),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, candidate.userId),
          gte(checkIns.localDate, week.start),
          lte(checkIns.localDate, week.end),
        ),
      ),
    db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, candidate.userId),
          gte(journalEntries.localDate, week.start),
          lte(journalEntries.localDate, week.end),
        ),
      ),
    db
      .select({
        title: weeklyStories.title,
        summary: weeklyStories.summary,
      })
      .from(weeklyStories)
      .where(
        and(
          eq(weeklyStories.userId, candidate.userId),
          eq(weeklyStories.weekStart, week.start),
        ),
      )
      .limit(1),
  ]);

  const activityCount = proofRows.length + journalRows.length;
  if (activityCount === 0) {
    return "skipped" as const;
  }

  const stats = computeStatsData({
    baseDate: new Date(`${week.end}T12:00:00`),
    checkIns: proofRows,
    quests: questRows.map((quest) => ({
      ...quest,
      status: quest.status === "archived" ? "archived" : "active",
    })),
    weeks: 1,
  });
  const story = storyRows[0] ?? null;
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = buildUnsubscribeUrl(
    siteUrl,
    candidate.unsubscribeToken,
  );
  const sendResult = await sendProductEmail({
    userId: candidate.userId,
    type: "weekly_digest",
    dedupeKey,
    to: candidate.email,
    subject: "Your week in Proof",
    react: (
      <WeeklyDigestEmail
        characterName={candidate.characterName}
        weekLabel={`${week.start} to ${week.end}`}
        totalProof={stats.summary.totalProof}
        winCount={stats.summary.winCount}
        passCount={stats.summary.passCount}
        strongestQuest={stats.summary.strongestQuest?.questTitle ?? null}
        needsAttentionQuest={
          stats.summary.needsAttentionQuest?.questTitle ?? null
        }
        storyTitle={story?.title ?? null}
        storySummary={story?.summary ?? null}
        dashboardUrl={new URL("/dashboard", siteUrl).toString()}
        storyUrl={new URL("/dashboard/story", siteUrl).toString()}
        unsubscribeUrl={unsubscribeUrl}
      />
    ),
    unsubscribeToken: candidate.unsubscribeToken,
  });

  if (sendResult.status === "sent") return "sent" as const;
  if (sendResult.status === "skipped") return "skipped" as const;

  return "error" as const;
}
