import "server-only";

import type { LanguageModelUsage } from "ai";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiUsageBuckets, aiUsageEvents } from "@/lib/db/schema";
import {
  decideAiLimit,
  estimateMessagesTokens,
  estimateTokens,
  getAiLimitConfig,
  getPeriodResetAt,
  getPeriodStart,
  getRetryAfterSeconds,
  trimAiChatMessages,
  validateAiChatMessages,
  type AiFeature,
  type AiLimitPeriod,
  type AiLimitSnapshot,
  type MinimalUiMessage,
} from "@/lib/pulse/ai-limits-core";

type AiReservationAllowed = {
  allowed: true;
  eventId: string | null;
  maxOutputTokens: number;
  providerOptions: {
    gateway: {
      user: string;
      tags: string[];
    };
  };
};

type AiReservationBlocked = {
  allowed: false;
  status: 429;
  message: string;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

export type AiReservation = AiReservationAllowed | AiReservationBlocked;

type AiUsageMetadata = Record<string, string | number | boolean | null>;

export class AiLimitReachedError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "AiLimitReachedError";
  }
}

export function validateAndTrimAiChatMessages<T extends MinimalUiMessage>(
  messages: T[],
) {
  const validation = validateAiChatMessages(messages);

  if (!validation.valid) {
    return validation;
  }

  const trimmedMessages = trimAiChatMessages(messages);

  return {
    valid: true as const,
    messages: trimmedMessages,
    estimatedInputTokens: estimateMessagesTokens(trimmedMessages),
  };
}

export function estimateAiTextTokens(text: string) {
  return estimateTokens(text);
}

export async function reserveAiUsage({
  userId,
  feature,
  estimatedInputTokens,
  metadata,
}: {
  userId: string;
  feature: AiFeature;
  estimatedInputTokens: number;
  metadata?: AiUsageMetadata;
}): Promise<AiReservation> {
  const config = getAiLimitConfig();
  const featureLimit = config.features[feature];
  const now = new Date();
  const periodStart = getPeriodStart(now, featureLimit.period);
  const globalPeriodStart = getPeriodStart(now, "day");
  const resetAt = getPeriodResetAt(periodStart, featureLimit.period);
  const globalResetAt = getPeriodResetAt(globalPeriodStart, "day");
  const providerOptions = getGatewayProviderOptions(userId, feature);

  if (!config.enabled) {
    return {
      allowed: true,
      eventId: null,
      maxOutputTokens: featureLimit.maxOutputTokens,
      providerOptions,
    };
  }

  return db.transaction(async (tx) => {
    await acquireAiLimitLock(tx, userId, feature);

    const userSnapshot = await getBucketSnapshot(tx, {
      scopeType: "user",
      scopeId: userId,
      feature,
      period: featureLimit.period,
      periodStart,
    });
    const globalSnapshot = await getBucketSnapshot(tx, {
      scopeType: "global",
      scopeId: "site",
      feature,
      period: "day",
      periodStart: globalPeriodStart,
    });
    const decision = decideAiLimit({
      config,
      featureLimit,
      userSnapshot,
      globalSnapshot,
      estimatedTokens: estimatedInputTokens,
      resetAt,
      globalResetAt,
    });

    if (!decision.allowed) {
      await incrementBlockedCount(tx, {
        userId,
        feature,
        userPeriod: featureLimit.period,
        userPeriodStart: periodStart,
        globalPeriodStart,
      });
      await tx.insert(aiUsageEvents).values({
        userId,
        feature,
        status: "blocked",
        period: featureLimit.period,
        periodStart,
        estimatedInputTokens,
        error: decision.reason,
        metadata,
        updatedAt: now,
      });

      return {
        allowed: false,
        status: 429,
        message: decision.message,
        limit: decision.limit,
        remaining: decision.remaining,
        resetAt: decision.resetAt,
        retryAfterSeconds: getRetryAfterSeconds(decision.resetAt, now),
      };
    }

    await incrementAllowedUsage(tx, {
      userId,
      feature,
      estimatedInputTokens,
      userPeriod: featureLimit.period,
      userPeriodStart: periodStart,
      globalPeriodStart,
    });
    const [event] = await tx
      .insert(aiUsageEvents)
      .values({
        userId,
        feature,
        status: "allowed",
        period: featureLimit.period,
        periodStart,
        estimatedInputTokens,
        metadata,
        updatedAt: now,
      })
      .returning({ id: aiUsageEvents.id });

    return {
      allowed: true,
      eventId: event.id,
      maxOutputTokens: featureLimit.maxOutputTokens,
      providerOptions,
    };
  });
}

export async function completeAiUsage({
  eventId,
  usage,
  finishReason,
}: {
  eventId: string | null;
  usage: LanguageModelUsage | null | undefined;
  finishReason?: string;
}) {
  if (!eventId) {
    return;
  }

  const normalizedUsage = normalizeUsage(usage);
  const [event] = await db
    .update(aiUsageEvents)
    .set({
      status: "completed",
      inputTokens: normalizedUsage.inputTokens,
      outputTokens: normalizedUsage.outputTokens,
      totalTokens: normalizedUsage.totalTokens,
      finishReason,
      updatedAt: new Date(),
    })
    .where(eq(aiUsageEvents.id, eventId))
    .returning({
      userId: aiUsageEvents.userId,
      feature: aiUsageEvents.feature,
      period: aiUsageEvents.period,
      periodStart: aiUsageEvents.periodStart,
      createdAt: aiUsageEvents.createdAt,
    });

  if (!event) {
    return;
  }

  await addActualTokenUsage({
    userId: event.userId,
    feature: event.feature,
    userPeriod: event.period,
    userPeriodStart: event.periodStart,
    globalPeriodStart: getPeriodStart(event.createdAt, "day"),
    inputTokens: normalizedUsage.inputTokens,
    outputTokens: normalizedUsage.outputTokens,
    totalTokens: normalizedUsage.totalTokens,
  });
}

export async function failAiUsage({
  eventId,
  error,
}: {
  eventId: string | null;
  error: unknown;
}) {
  if (!eventId) {
    return;
  }

  await db
    .update(aiUsageEvents)
    .set({
      status: "failed",
      error: getErrorMessage(error),
      updatedAt: new Date(),
    })
    .where(eq(aiUsageEvents.id, eventId));
}

function getGatewayProviderOptions(userId: string, feature: AiFeature) {
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const tags = [`feature:${feature}`];

  if (environment) {
    tags.push(`env:${environment}`);
  }

  return {
    gateway: {
      user: userId,
      tags,
    },
  };
}

async function getBucketSnapshot(
  client: Pick<typeof db, "select">,
  key: {
    scopeType: "user" | "global";
    scopeId: string;
    feature: AiFeature;
    period: AiLimitPeriod;
    periodStart: string;
  },
): Promise<AiLimitSnapshot> {
  const [bucket] = await client
    .select({
      requestCount: aiUsageBuckets.requestCount,
      estimatedTokenCount: aiUsageBuckets.estimatedTokenCount,
      totalTokenCount: aiUsageBuckets.totalTokenCount,
    })
    .from(aiUsageBuckets)
    .where(
      and(
        eq(aiUsageBuckets.scopeType, key.scopeType),
        eq(aiUsageBuckets.scopeId, key.scopeId),
        eq(aiUsageBuckets.feature, key.feature),
        eq(aiUsageBuckets.period, key.period),
        eq(aiUsageBuckets.periodStart, key.periodStart),
      ),
    )
    .limit(1);

  return (
    bucket ?? {
      requestCount: 0,
      estimatedTokenCount: 0,
      totalTokenCount: 0,
    }
  );
}

async function incrementAllowedUsage(
  client: Pick<typeof db, "insert">,
  {
    userId,
    feature,
    estimatedInputTokens,
    userPeriod,
    userPeriodStart,
    globalPeriodStart,
  }: {
    userId: string;
    feature: AiFeature;
    estimatedInputTokens: number;
    userPeriod: AiLimitPeriod;
    userPeriodStart: string;
    globalPeriodStart: string;
  },
) {
  await upsertBucketDelta(client, {
    userId,
    scopeType: "user",
    scopeId: userId,
    feature,
    period: userPeriod,
    periodStart: userPeriodStart,
    requestDelta: 1,
    estimatedTokenDelta: estimatedInputTokens,
  });
  await upsertBucketDelta(client, {
    userId: null,
    scopeType: "global",
    scopeId: "site",
    feature,
    period: "day",
    periodStart: globalPeriodStart,
    requestDelta: 1,
    estimatedTokenDelta: estimatedInputTokens,
  });
}

async function incrementBlockedCount(
  client: Pick<typeof db, "insert">,
  {
    userId,
    feature,
    userPeriod,
    userPeriodStart,
    globalPeriodStart,
  }: {
    userId: string;
    feature: AiFeature;
    userPeriod: AiLimitPeriod;
    userPeriodStart: string;
    globalPeriodStart: string;
  },
) {
  await upsertBucketDelta(client, {
    userId,
    scopeType: "user",
    scopeId: userId,
    feature,
    period: userPeriod,
    periodStart: userPeriodStart,
    blockedDelta: 1,
  });
  await upsertBucketDelta(client, {
    userId: null,
    scopeType: "global",
    scopeId: "site",
    feature,
    period: "day",
    periodStart: globalPeriodStart,
    blockedDelta: 1,
  });
}

async function addActualTokenUsage({
  userId,
  feature,
  userPeriod,
  userPeriodStart,
  globalPeriodStart,
  inputTokens,
  outputTokens,
  totalTokens,
}: {
  userId: string;
  feature: AiFeature;
  userPeriod: AiLimitPeriod;
  userPeriodStart: string;
  globalPeriodStart: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}) {
  await db.transaction(async (tx) => {
    await upsertBucketDelta(tx, {
      userId,
      scopeType: "user",
      scopeId: userId,
      feature,
      period: userPeriod,
      periodStart: userPeriodStart,
      inputTokenDelta: inputTokens,
      outputTokenDelta: outputTokens,
      totalTokenDelta: totalTokens,
    });
    await upsertBucketDelta(tx, {
      userId: null,
      scopeType: "global",
      scopeId: "site",
      feature,
      period: "day",
      periodStart: globalPeriodStart,
      inputTokenDelta: inputTokens,
      outputTokenDelta: outputTokens,
      totalTokenDelta: totalTokens,
    });
  });
}

async function upsertBucketDelta(
  client: Pick<typeof db, "insert">,
  {
    userId,
    scopeType,
    scopeId,
    feature,
    period,
    periodStart,
    requestDelta = 0,
    estimatedTokenDelta = 0,
    inputTokenDelta = 0,
    outputTokenDelta = 0,
    totalTokenDelta = 0,
    blockedDelta = 0,
  }: {
    userId: string | null;
    scopeType: "user" | "global";
    scopeId: string;
    feature: AiFeature;
    period: AiLimitPeriod;
    periodStart: string;
    requestDelta?: number;
    estimatedTokenDelta?: number;
    inputTokenDelta?: number;
    outputTokenDelta?: number;
    totalTokenDelta?: number;
    blockedDelta?: number;
  },
) {
  const now = new Date();

  await client
    .insert(aiUsageBuckets)
    .values({
      userId,
      scopeType,
      scopeId,
      feature,
      period,
      periodStart,
      requestCount: requestDelta,
      estimatedTokenCount: estimatedTokenDelta,
      inputTokenCount: inputTokenDelta,
      outputTokenCount: outputTokenDelta,
      totalTokenCount: totalTokenDelta,
      blockedCount: blockedDelta,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        aiUsageBuckets.scopeType,
        aiUsageBuckets.scopeId,
        aiUsageBuckets.feature,
        aiUsageBuckets.period,
        aiUsageBuckets.periodStart,
      ],
      set: {
        requestCount: sql`${aiUsageBuckets.requestCount} + ${requestDelta}`,
        estimatedTokenCount: sql`${aiUsageBuckets.estimatedTokenCount} + ${estimatedTokenDelta}`,
        inputTokenCount: sql`${aiUsageBuckets.inputTokenCount} + ${inputTokenDelta}`,
        outputTokenCount: sql`${aiUsageBuckets.outputTokenCount} + ${outputTokenDelta}`,
        totalTokenCount: sql`${aiUsageBuckets.totalTokenCount} + ${totalTokenDelta}`,
        blockedCount: sql`${aiUsageBuckets.blockedCount} + ${blockedDelta}`,
        updatedAt: now,
      },
    });
}

async function acquireAiLimitLock(
  client: Pick<typeof db, "execute">,
  userId: string,
  feature: AiFeature,
) {
  await client.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`ai:${userId}:${feature}`}, 12013))`,
  );
}

function normalizeUsage(usage: LanguageModelUsage | null | undefined) {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "AI request failed.";
}
