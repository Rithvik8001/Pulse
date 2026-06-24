import "server-only";

import { generateText, Output } from "ai";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  characters,
  checkIns,
  identitySnapshots,
  journalEntries,
  quests,
  weeklyStories,
} from "@/lib/db/schema";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";
import {
  AiLimitReachedError,
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { requireUserId } from "@/lib/pulse/dashboard";
import {
  buildIdentityPrompt,
  buildIdentityRange,
  computeIdentityData,
  identityAllWindowDays,
  identityDefaultWindowDays,
  identitySnapshotModel,
  type IdentityCheckInInput,
  type IdentityComputedData,
  type IdentityJournalInput,
  type IdentityQuestInput,
  type IdentitySnapshotCore,
  type IdentityStoryInput,
} from "@/lib/pulse/identity-core";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";

export type IdentitySnapshot = IdentitySnapshotCore & {
  id: string;
  periodStart: string;
  periodEnd: string;
  windowDays: number;
  modelId: string;
  sourceCheckInCount: number;
  sourceJournalCount: number;
  sourceStoryCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type IdentityTimelineViewKey = "90d" | "12w" | "all";

export type IdentityTimelineData =
  | {
      isSetupComplete: false;
      character: null;
      hasAiGatewayKey: boolean;
      latestSnapshot: null;
      views: Record<IdentityTimelineViewKey, IdentityComputedData>;
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      hasAiGatewayKey: boolean;
      latestSnapshot: IdentitySnapshot | null;
      views: Record<IdentityTimelineViewKey, IdentityComputedData>;
    };

export class MissingIdentityEvidenceError extends Error {
  constructor() {
    super(
      "Save at least one Proof, Journal entry, or Weekly Story before generating an Identity snapshot.",
    );
    this.name = "MissingIdentityEvidenceError";
  }
}

export class MissingIdentityAiGatewayKeyError extends Error {
  constructor() {
    super(
      "Add AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN to your environment before generating.",
    );
    this.name = "MissingIdentityAiGatewayKeyError";
  }
}

const identitySnapshotSchema = z.object({
  headline: z.string().min(1).max(90),
  summary: z.string().min(1).max(520),
  identityStatement: z.string().min(1).max(180),
  themeBullets: z.array(z.string().min(1).max(160)).min(1).max(5),
  evidenceBullets: z.array(z.string().min(1).max(180)).min(1).max(6),
  nextIdentityMove: z.string().min(1).max(180),
});

export async function getIdentityTimelineData(): Promise<IdentityTimelineData> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getIdentityTimelineDataForUser(userId, dateContext);
}

export async function getIdentityTimelineDataForUser(
  userId: string,
  dateContext: UserLocalDateContext,
): Promise<IdentityTimelineData> {
  const hasAiGatewayKey = hasIdentityAiGatewayKey();
  const emptyViews = buildViews({
    checkIns: [],
    journals: [],
    quests: [],
    stories: [],
    today: dateContext.today,
  });
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return {
      isSetupComplete: false,
      character: null,
      hasAiGatewayKey,
      latestSnapshot: null,
      views: emptyViews,
    };
  }

  const allRange = buildIdentityRange(dateContext.today, identityAllWindowDays);
  const [questRows, checkInRows, journalRows, storyRows, snapshotRows] =
    await Promise.all([
      db
        .select({
          id: quests.id,
          title: quests.title,
          status: quests.status,
          position: quests.position,
        })
        .from(quests)
        .where(eq(quests.userId, userId))
        .orderBy(asc(quests.position), asc(quests.title)),
      db
        .select({
          id: checkIns.id,
          questId: checkIns.questId,
          questTitle: quests.title,
          localDate: checkIns.localDate,
          outcome: checkIns.outcome,
          note: checkIns.note,
        })
        .from(checkIns)
        .innerJoin(quests, eq(checkIns.questId, quests.id))
        .where(
          and(
            eq(checkIns.userId, userId),
            gte(checkIns.localDate, allRange.start),
            lte(checkIns.localDate, allRange.end),
          ),
        )
        .orderBy(asc(checkIns.localDate), asc(quests.position)),
      db
        .select({
          id: journalEntries.id,
          localDate: journalEntries.localDate,
          body: journalEntries.body,
        })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.userId, userId),
            gte(journalEntries.localDate, allRange.start),
            lte(journalEntries.localDate, allRange.end),
          ),
        )
        .orderBy(asc(journalEntries.localDate)),
      db
        .select({
          id: weeklyStories.id,
          weekStart: weeklyStories.weekStart,
          weekEnd: weeklyStories.weekEnd,
          title: weeklyStories.title,
          summary: weeklyStories.summary,
          patternBullets: weeklyStories.patternBullets,
        })
        .from(weeklyStories)
        .where(
          and(
            eq(weeklyStories.userId, userId),
            gte(weeklyStories.weekStart, allRange.start),
            lte(weeklyStories.weekStart, allRange.end),
          ),
        )
        .orderBy(asc(weeklyStories.weekStart)),
      db
        .select()
        .from(identitySnapshots)
        .where(eq(identitySnapshots.userId, userId))
        .orderBy(desc(identitySnapshots.periodEnd), desc(identitySnapshots.updatedAt))
        .limit(1),
    ]);

  return {
    isSetupComplete: true,
    character,
    hasAiGatewayKey,
    latestSnapshot: snapshotRows[0] ? toIdentitySnapshot(snapshotRows[0]) : null,
    views: buildViews({
      checkIns: checkInRows.map(toIdentityCheckIn),
      journals: journalRows,
      quests: questRows.map((quest) => ({
        ...quest,
        status: quest.status === "archived" ? "archived" : "active",
      })),
      stories: storyRows,
      today: dateContext.today,
    }),
  };
}

export async function generateIdentitySnapshot() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return generateIdentitySnapshotForUser(userId, dateContext);
}

export async function generateIdentitySnapshotForUser(
  userId: string,
  dateContext: UserLocalDateContext,
) {
  if (!hasIdentityAiGatewayKey()) {
    throw new MissingIdentityAiGatewayKeyError();
  }

  const range = buildIdentityRange(dateContext.today, identityDefaultWindowDays);
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return null;
  }

  const [questRows, checkInRows, journalRows, storyRows] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        position: quests.position,
      })
      .from(quests)
      .where(eq(quests.userId, userId))
      .orderBy(asc(quests.position), asc(quests.title)),
    db
      .select({
        id: checkIns.id,
        questId: checkIns.questId,
        questTitle: quests.title,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
        note: checkIns.note,
      })
      .from(checkIns)
      .innerJoin(quests, eq(checkIns.questId, quests.id))
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, range.start),
          lte(checkIns.localDate, range.end),
        ),
      )
      .orderBy(asc(checkIns.localDate), asc(quests.position)),
    db
      .select({
        id: journalEntries.id,
        localDate: journalEntries.localDate,
        body: journalEntries.body,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gte(journalEntries.localDate, range.start),
          lte(journalEntries.localDate, range.end),
        ),
      )
      .orderBy(asc(journalEntries.localDate)),
    db
      .select({
        id: weeklyStories.id,
        weekStart: weeklyStories.weekStart,
        weekEnd: weeklyStories.weekEnd,
        title: weeklyStories.title,
        summary: weeklyStories.summary,
        patternBullets: weeklyStories.patternBullets,
      })
      .from(weeklyStories)
      .where(
        and(
          eq(weeklyStories.userId, userId),
          gte(weeklyStories.weekStart, range.start),
          lte(weeklyStories.weekStart, range.end),
        ),
      )
      .orderBy(asc(weeklyStories.weekStart)),
  ]);

  const checkInInputs = checkInRows.map(toIdentityCheckIn);
  const questInputs = questRows.map((quest) => ({
    ...quest,
    status: quest.status === "archived" ? "archived" : "active",
  })) satisfies IdentityQuestInput[];

  if (
    checkInInputs.length === 0 &&
    journalRows.length === 0 &&
    storyRows.length === 0
  ) {
    throw new MissingIdentityEvidenceError();
  }

  const computed = computeIdentityData({
    checkIns: checkInInputs,
    journals: journalRows,
    quests: questInputs,
    range,
    stories: storyRows,
  });
  const system =
    "You are Pulse, an identity-first reflection coach. Produce concise, grounded identity evidence summaries from provided habit data. Never shame, diagnose, or expose private implementation details.";
  const prompt = buildIdentityPrompt({
    characterName: character.name,
    checkIns: checkInInputs,
    journals: journalRows,
    range,
    signals: computed.signals,
    stories: storyRows,
    themes: computed.themes,
  });
  const reservation = await reserveAiUsage({
    userId,
    feature: "identity-timeline",
    estimatedInputTokens: estimateAiTextTokens(`${system}\n${prompt}`),
    metadata: {
      action: "generateIdentitySnapshot",
      proofCount: checkInInputs.length,
      journalCount: journalRows.length,
      storyCount: storyRows.length,
    },
  });

  if (!reservation.allowed) {
    logWarn({
      event: "identity_snapshot_rate_limited",
      message: "Identity snapshot generation was rate limited.",
      feature: "identity-timeline",
      userId,
      metadata: {
        retryAfterSeconds: reservation.retryAfterSeconds,
      },
    });
    throw new AiLimitReachedError(
      reservation.message,
      reservation.retryAfterSeconds,
    );
  }

  let output: z.infer<typeof identitySnapshotSchema>;

  try {
    const result = await generateText({
      model: identitySnapshotModel,
      output: Output.object({
        schema: identitySnapshotSchema,
      }),
      system,
      prompt,
      providerOptions: reservation.providerOptions,
      maxOutputTokens: reservation.maxOutputTokens,
    });
    output = result.output;
    await completeAiUsage({
      eventId: reservation.eventId,
      usage: result.totalUsage,
      finishReason: result.finishReason,
    });
  } catch (error) {
    logError({
      event: "identity_snapshot_generation_failed",
      message: "Identity snapshot generation failed.",
      feature: "identity-timeline",
      userId,
      error,
      metadata: {
        proofCount: checkInInputs.length,
        journalCount: journalRows.length,
        storyCount: storyRows.length,
      },
    });
    await failAiUsage({ eventId: reservation.eventId, error });
    throw error;
  }

  const now = new Date();
  const [snapshot] = await db
    .insert(identitySnapshots)
    .values({
      userId,
      characterId: character.id,
      periodStart: range.start,
      periodEnd: range.end,
      windowDays: range.days,
      headline: output.headline,
      summary: output.summary,
      identityStatement: output.identityStatement,
      themeBullets: output.themeBullets,
      evidenceBullets: output.evidenceBullets,
      nextIdentityMove: output.nextIdentityMove,
      modelId: identitySnapshotModel,
      sourceCheckInCount: checkInInputs.length,
      sourceJournalCount: journalRows.length,
      sourceStoryCount: storyRows.length,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        identitySnapshots.userId,
        identitySnapshots.periodEnd,
        identitySnapshots.windowDays,
      ],
      set: {
        periodStart: range.start,
        headline: output.headline,
        summary: output.summary,
        identityStatement: output.identityStatement,
        themeBullets: output.themeBullets,
        evidenceBullets: output.evidenceBullets,
        nextIdentityMove: output.nextIdentityMove,
        modelId: identitySnapshotModel,
        sourceCheckInCount: checkInInputs.length,
        sourceJournalCount: journalRows.length,
        sourceStoryCount: storyRows.length,
        updatedAt: now,
      },
    })
    .returning();

  logInfo({
    event: "identity_snapshot_saved",
    message: "Identity snapshot saved.",
    feature: "identity-timeline",
    userId,
    metadata: {
      windowDays: range.days,
      proofCount: checkInInputs.length,
      journalCount: journalRows.length,
      storyCount: storyRows.length,
    },
  });

  return toIdentitySnapshot(snapshot);
}

function buildViews({
  checkIns,
  journals,
  quests,
  stories,
  today,
}: {
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  quests: IdentityQuestInput[];
  stories: IdentityStoryInput[];
  today: string;
}): Record<IdentityTimelineViewKey, IdentityComputedData> {
  return {
    "90d": computeIdentityData({
      checkIns,
      journals,
      quests,
      range: buildIdentityRange(today, identityDefaultWindowDays),
      stories,
    }),
    "12w": computeIdentityData({
      checkIns,
      journals,
      quests,
      range: buildIdentityRange(today, 84),
      stories,
    }),
    all: computeIdentityData({
      checkIns,
      journals,
      quests,
      range: buildIdentityRange(today, identityAllWindowDays),
      stories,
    }),
  };
}

function toIdentityCheckIn(row: {
  id: string;
  questId: string;
  questTitle: string;
  localDate: string;
  outcome: string;
  note: string | null;
}): IdentityCheckInInput {
  return {
    ...row,
    outcome: row.outcome === "pass" ? "pass" : "win",
  };
}

function toIdentitySnapshot(
  snapshot: typeof identitySnapshots.$inferSelect,
): IdentitySnapshot {
  return {
    id: snapshot.id,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    windowDays: snapshot.windowDays,
    headline: snapshot.headline,
    summary: snapshot.summary,
    identityStatement: snapshot.identityStatement,
    themeBullets: snapshot.themeBullets,
    evidenceBullets: snapshot.evidenceBullets,
    nextIdentityMove: snapshot.nextIdentityMove,
    modelId: snapshot.modelId,
    sourceCheckInCount: snapshot.sourceCheckInCount,
    sourceJournalCount: snapshot.sourceJournalCount,
    sourceStoryCount: snapshot.sourceStoryCount,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function hasIdentityAiGatewayKey() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}
