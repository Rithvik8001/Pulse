import "server-only";

import type { LanguageModelUsage } from "ai";
import { and, eq, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiUsageBuckets, aiUsageEvents, type AiUsagePeriod } from "@/lib/db/schema";
import { aiProviderOptions } from "@/lib/pulse/ai-provider";
import { getUserSettingsForUser } from "@/lib/pulse/user-settings";
import {
  aiChatMaxBodyBytes,
  aiGlobalTimeZone,
  aiInputTooLargeMessage,
  buildAiQuota,
  decideAiLimit,
  estimateTokens,
  getAiLimitConfig,
  getPeriodResetAt,
  getPeriodStart,
  getRetryAfterSeconds,
  isAiInputTooLarge,
  type AiFeature,
  type AiLimitSnapshot,
  type AiQuota,
} from "@/lib/pulse/ai-limits-core";

type AiReservationAllowed = {
  allowed: true;
  eventId: string | null;
  maxOutputTokens: number;
  providerOptions: typeof aiProviderOptions;
  remaining: number;
};

type AiReservationBlocked = {
  allowed: false;
  status: 400 | 429;
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
  const providerOptions = aiProviderOptions;

  if (!config.enabled) {
    return {
      allowed: true,
      eventId: null,
      maxOutputTokens: featureLimit.maxOutputTokens,
      providerOptions,
      remaining: config.userDailyRequestLimit,
    };
  }

  const { timeZone } = await getUserSettingsForUser(userId);
  const periodStart = getPeriodStart(now, timeZone);
  const globalPeriodStart = getPeriodStart(now, aiGlobalTimeZone);
  const resetAt = getPeriodResetAt(periodStart, timeZone);
  const globalResetAt = getPeriodResetAt(globalPeriodStart, aiGlobalTimeZone);

  if (isAiInputTooLarge(config, estimatedInputTokens)) {
    return {
      allowed: false,
      status: 400,
      message: aiInputTooLargeMessage,
      limit: config.requestInputTokenLimit,
      remaining: 0,
      resetAt,
      retryAfterSeconds: 1,
    };
  }

  return db.transaction(async (tx) => {
    await acquireUserAiLimitLock(tx, userId);
    await acquireGlobalAiLimitLock(tx);

    const userSnapshot = await getUserSnapshot(tx, userId, periodStart);
    const globalSnapshot = await getGlobalSnapshot(tx, globalPeriodStart);
    const decision = decideAiLimit({
      config,
      userSnapshot,
      globalSnapshot,
      estimatedTokens: estimatedInputTokens,
      resetAt,
      globalResetAt,
      timeZone,
    });

    if (!decision.allowed) {
      await incrementBlockedCount(tx, {
        userId,
        feature,
        userPeriodStart: periodStart,
        globalPeriodStart,
      });
      await tx.insert(aiUsageEvents).values({
        userId,
        feature,
        status: "blocked",
        period: "day",
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
      userPeriodStart: periodStart,
      globalPeriodStart,
    });
    const [event] = await tx
      .insert(aiUsageEvents)
      .values({
        userId,
        feature,
        status: "allowed",
        period: "day",
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
      remaining: decision.remaining,
    };
  });
}

export async function getAiQuotaForUser(userId: string): Promise<AiQuota> {
  const config = getAiLimitConfig();
  const { timeZone } = await getUserSettingsForUser(userId);
  const periodStart = getPeriodStart(new Date(), timeZone);
  const resetAt = getPeriodResetAt(periodStart, timeZone);

  if (!config.enabled) {
    return buildAiQuota({ config, userSnapshot: { requestCount: 0, tokenCount: 0 }, resetAt });
  }

  return buildAiQuota({ config, userSnapshot: await getUserSnapshot(db, userId, periodStart), resetAt });
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
  await settleAiUsage({ eventId, tokens: normalizeUsage(usage), finishReason });
}

export async function abortAiUsage({
  eventId,
  stepUsages,
}: {
  eventId: string | null;
  stepUsages: LanguageModelUsage[];
}) {
  const tokens = stepUsages.map(normalizeUsage).reduce(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      totalTokens: total.totalTokens + usage.totalTokens,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );

  await settleAiUsage({ eventId, tokens, finishReason: "aborted" });
}

async function settleAiUsage({
  eventId,
  tokens,
  finishReason,
}: {
  eventId: string | null;
  tokens: ReturnType<typeof normalizeUsage>;
  finishReason?: string;
}) {
  if (!eventId) {
    return;
  }

  const [event] = await db
    .update(aiUsageEvents)
    .set({
      status: "completed",
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      totalTokens: tokens.totalTokens,
      finishReason,
      updatedAt: new Date(),
    })
    .where(and(eq(aiUsageEvents.id, eventId), eq(aiUsageEvents.status, "allowed")))
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
    globalPeriodStart: getPeriodStart(event.createdAt, aiGlobalTimeZone),
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    totalTokens: tokens.totalTokens,
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

  await db.transaction(async (tx) => {
    const [event] = await tx
      .update(aiUsageEvents)
      .set({
        status: "failed",
        error: getErrorMessage(error),
        updatedAt: new Date(),
      })
      .where(and(eq(aiUsageEvents.id, eventId), eq(aiUsageEvents.status, "allowed")))
      .returning({
        userId: aiUsageEvents.userId,
        feature: aiUsageEvents.feature,
        period: aiUsageEvents.period,
        periodStart: aiUsageEvents.periodStart,
        createdAt: aiUsageEvents.createdAt,
        estimatedInputTokens: aiUsageEvents.estimatedInputTokens,
      });

    if (!event) {
      return;
    }

    await upsertBucketDelta(tx, {
      userId: event.userId,
      scopeType: "user",
      scopeId: event.userId,
      feature: event.feature,
      period: event.period,
      periodStart: event.periodStart,
      requestDelta: -1,
      estimatedTokenDelta: -event.estimatedInputTokens,
    });
    await upsertBucketDelta(tx, {
      userId: null,
      scopeType: "global",
      scopeId: "site",
      feature: event.feature,
      period: "day",
      periodStart: getPeriodStart(event.createdAt, aiGlobalTimeZone),
      requestDelta: -1,
      estimatedTokenDelta: -event.estimatedInputTokens,
    });
  });
}

async function getGlobalSnapshot(
  client: Pick<typeof db, "select">,
  periodStart: string,
): Promise<AiLimitSnapshot> {
  return sumBuckets(client, "global", "site", periodStart);
}

async function getUserSnapshot(
  client: Pick<typeof db, "select">,
  userId: string,
  periodStart: string,
): Promise<AiLimitSnapshot> {
  return sumBuckets(client, "user", userId, periodStart);
}

async function sumBuckets(
  client: Pick<typeof db, "select">,
  scopeType: "user" | "global",
  scopeId: string,
  periodStart: string,
): Promise<AiLimitSnapshot> {
  const [row] = await client
    .select({
      requestCount: sum(aiUsageBuckets.requestCount).mapWith(Number),
      tokenCount: sum(
        sql`greatest(${aiUsageBuckets.estimatedTokenCount}, ${aiUsageBuckets.totalTokenCount})`,
      ).mapWith(Number),
    })
    .from(aiUsageBuckets)
    .where(
      and(
        eq(aiUsageBuckets.scopeType, scopeType),
        eq(aiUsageBuckets.scopeId, scopeId),
        eq(aiUsageBuckets.period, "day"),
        eq(aiUsageBuckets.periodStart, periodStart),
      ),
    );

  return {
    requestCount: row?.requestCount ?? 0,
    tokenCount: row?.tokenCount ?? 0,
  };
}

async function incrementAllowedUsage(
  client: Pick<typeof db, "insert">,
  {
    userId,
    feature,
    estimatedInputTokens,
    userPeriodStart,
    globalPeriodStart,
  }: {
    userId: string;
    feature: AiFeature;
    estimatedInputTokens: number;
    userPeriodStart: string;
    globalPeriodStart: string;
  },
) {
  await upsertBucketDelta(client, {
    userId,
    scopeType: "user",
    scopeId: userId,
    feature,
    period: "day",
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
    userPeriodStart,
    globalPeriodStart,
  }: {
    userId: string;
    feature: AiFeature;
    userPeriodStart: string;
    globalPeriodStart: string;
  },
) {
  await upsertBucketDelta(client, {
    userId,
    scopeType: "user",
    scopeId: userId,
    feature,
    period: "day",
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
  userPeriod: AiUsagePeriod;
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
    period: AiUsagePeriod;
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

async function acquireGlobalAiLimitLock(client: Pick<typeof db, "execute">) {
  await client.execute(sql`select pg_advisory_xact_lock(hashtextextended('ai:global', 12013))`);
}

async function acquireUserAiLimitLock(client: Pick<typeof db, "execute">, userId: string) {
  await client.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`ai:${userId}`}, 12013))`);
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

export async function readAiChatMessages(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);

  if (declaredLength > aiChatMaxBodyBytes) {
    return { ok: false as const, message: aiInputTooLargeMessage };
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).length > aiChatMaxBodyBytes) {
    return { ok: false as const, message: aiInputTooLargeMessage };
  }

  try {
    const body: unknown = JSON.parse(text);
    const messages =
      typeof body === "object" && body !== null && "messages" in body ? body.messages : undefined;

    return { ok: true as const, messages };
  } catch {
    return { ok: false as const, message: "Your message did not arrive. Try again." };
  }
}
