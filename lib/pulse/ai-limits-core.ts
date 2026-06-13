import {
  formatLocalDate,
  offsetDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";

export type AiFeature =
  | "pulse-coach"
  | "habit-agent"
  | "weekly-story"
  | "reword-suggestions";

export type AiLimitPeriod = "day" | "week";

export type AiFeatureLimit = {
  feature: AiFeature;
  label: string;
  period: AiLimitPeriod;
  requestLimit: number;
  tokenLimit: number;
  maxOutputTokens: number;
};

export type AiLimitConfig = {
  enabled: boolean;
  globalDailyRequestLimit: number;
  globalDailyTokenLimit: number;
  features: Record<AiFeature, AiFeatureLimit>;
};

export type AiLimitSnapshot = {
  requestCount: number;
  estimatedTokenCount: number;
  totalTokenCount: number;
};

export type AiLimitBlockReason =
  | "user_requests"
  | "user_tokens"
  | "global_requests"
  | "global_tokens";

export type AiLimitDecision =
  | {
      allowed: true;
      limit: number;
      remaining: number;
      resetAt: Date;
    }
  | {
      allowed: false;
      limit: number;
      remaining: number;
      resetAt: Date;
      reason: AiLimitBlockReason;
      message: string;
    };

type EnvLike = Record<string, string | undefined>;

export const aiChatMaxMessages = 12;
export const aiChatMaxSingleUserTextChars = 2000;
export const aiChatMaxTotalUserTextChars = 8000;

export const defaultAiLimitConfig: AiLimitConfig = {
  enabled: true,
  globalDailyRequestLimit: 50,
  globalDailyTokenLimit: 500_000,
  features: {
    "pulse-coach": {
      feature: "pulse-coach",
      label: "Pulse Coach",
      period: "day",
      requestLimit: 5,
      tokenLimit: 60_000,
      maxOutputTokens: 700,
    },
    "habit-agent": {
      feature: "habit-agent",
      label: "Habit Agent",
      period: "day",
      requestLimit: 3,
      tokenLimit: 30_000,
      maxOutputTokens: 500,
    },
    "reword-suggestions": {
      feature: "reword-suggestions",
      label: "reword suggestions",
      period: "day",
      requestLimit: 5,
      tokenLimit: 10_000,
      maxOutputTokens: 250,
    },
    "weekly-story": {
      feature: "weekly-story",
      label: "Weekly Story",
      period: "week",
      requestLimit: 2,
      tokenLimit: 25_000,
      maxOutputTokens: 1200,
    },
  },
};

export function getAiLimitConfig(env: EnvLike = process.env): AiLimitConfig {
  const enabled = parseBooleanEnv(env.AI_LIMITS_ENABLED, true);

  return {
    enabled,
    globalDailyRequestLimit: parsePositiveIntEnv(
      env.AI_GLOBAL_DAILY_REQUEST_LIMIT,
      defaultAiLimitConfig.globalDailyRequestLimit,
    ),
    globalDailyTokenLimit: parsePositiveIntEnv(
      env.AI_GLOBAL_DAILY_TOKEN_LIMIT,
      defaultAiLimitConfig.globalDailyTokenLimit,
    ),
    features: {
      "pulse-coach": withEnvLimit(
        defaultAiLimitConfig.features["pulse-coach"],
        env.AI_PULSE_COACH_DAILY_REQUEST_LIMIT,
        env.AI_PULSE_COACH_DAILY_TOKEN_LIMIT,
      ),
      "habit-agent": withEnvLimit(
        defaultAiLimitConfig.features["habit-agent"],
        env.AI_HABIT_AGENT_DAILY_REQUEST_LIMIT,
        env.AI_HABIT_AGENT_DAILY_TOKEN_LIMIT,
      ),
      "reword-suggestions": withEnvLimit(
        defaultAiLimitConfig.features["reword-suggestions"],
        env.AI_REWORD_DAILY_REQUEST_LIMIT,
        env.AI_REWORD_DAILY_TOKEN_LIMIT,
      ),
      "weekly-story": withEnvLimit(
        defaultAiLimitConfig.features["weekly-story"],
        env.AI_WEEKLY_STORY_WEEKLY_REQUEST_LIMIT,
        env.AI_WEEKLY_STORY_WEEKLY_TOKEN_LIMIT,
      ),
    },
  };
}

export function getPeriodStart(date: Date, period: AiLimitPeriod) {
  if (period === "day") {
    return formatLocalDate(date);
  }

  const startDate = new Date(date);
  const day = startDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startDate.setDate(startDate.getDate() + mondayOffset);

  return formatLocalDate(startDate);
}

export function getPeriodResetAt(periodStart: string, period: AiLimitPeriod) {
  const resetDate = offsetDate(
    parseLocalDate(periodStart),
    period === "day" ? 1 : 7,
  );
  resetDate.setHours(0, 0, 0, 0);

  return resetDate;
}

export function estimateTokens(text: string) {
  const cleanText = text.trim();

  return cleanText ? Math.ceil(cleanText.length / 4) : 0;
}

export function estimateMessagesTokens(messages: MinimalUiMessage[]) {
  return estimateTokens(getUiMessageText(messages));
}

export function trimAiChatMessages<T>(messages: T[]) {
  return messages.slice(-aiChatMaxMessages);
}

export type MinimalUiMessage = {
  role: string;
  parts: { type: string; text?: string }[];
};

export function getUiMessageText(messages: MinimalUiMessage[]) {
  return messages
    .flatMap((message) =>
      message.parts
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text ?? ""),
    )
    .join("\n");
}

export function validateAiChatMessages(messages: MinimalUiMessage[]) {
  let totalUserTextChars = 0;

  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }

    for (const part of message.parts) {
      if (part.type !== "text" || typeof part.text !== "string") {
        continue;
      }

      if (part.text.length > aiChatMaxSingleUserTextChars) {
        return {
          valid: false as const,
          message: `Keep each AI message under ${aiChatMaxSingleUserTextChars.toLocaleString()} characters.`,
        };
      }

      totalUserTextChars += part.text.length;
    }
  }

  if (totalUserTextChars > aiChatMaxTotalUserTextChars) {
    return {
      valid: false as const,
      message: `This AI chat is too long. Start a fresh chat or keep the last request under ${aiChatMaxTotalUserTextChars.toLocaleString()} total characters.`,
    };
  }

  return { valid: true as const };
}

export function decideAiLimit({
  config,
  featureLimit,
  userSnapshot,
  globalSnapshot,
  estimatedTokens,
  resetAt,
  globalResetAt,
}: {
  config: AiLimitConfig;
  featureLimit: AiFeatureLimit;
  userSnapshot: AiLimitSnapshot;
  globalSnapshot: AiLimitSnapshot;
  estimatedTokens: number;
  resetAt: Date;
  globalResetAt: Date;
}): AiLimitDecision {
  if (!config.enabled) {
    return {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt,
    };
  }

  const nextUserRequests = userSnapshot.requestCount + 1;
  const nextUserTokens =
    Math.max(userSnapshot.estimatedTokenCount, userSnapshot.totalTokenCount) +
    estimatedTokens;
  const nextGlobalRequests = globalSnapshot.requestCount + 1;
  const nextGlobalTokens =
    Math.max(
      globalSnapshot.estimatedTokenCount,
      globalSnapshot.totalTokenCount,
    ) + estimatedTokens;

  if (nextGlobalRequests > config.globalDailyRequestLimit) {
    return blockedDecision({
      featureLimit,
      limit: config.globalDailyRequestLimit,
      remaining: 0,
      resetAt: globalResetAt,
      reason: "global_requests",
    });
  }

  if (nextGlobalTokens > config.globalDailyTokenLimit) {
    return blockedDecision({
      featureLimit,
      limit: config.globalDailyTokenLimit,
      remaining: Math.max(
        config.globalDailyTokenLimit -
          Math.max(
            globalSnapshot.estimatedTokenCount,
            globalSnapshot.totalTokenCount,
          ),
        0,
      ),
      resetAt: globalResetAt,
      reason: "global_tokens",
    });
  }

  if (nextUserRequests > featureLimit.requestLimit) {
    return blockedDecision({
      featureLimit,
      limit: featureLimit.requestLimit,
      remaining: 0,
      resetAt,
      reason: "user_requests",
    });
  }

  if (nextUserTokens > featureLimit.tokenLimit) {
    return blockedDecision({
      featureLimit,
      limit: featureLimit.tokenLimit,
      remaining: Math.max(
        featureLimit.tokenLimit -
          Math.max(
            userSnapshot.estimatedTokenCount,
            userSnapshot.totalTokenCount,
          ),
        0,
      ),
      resetAt,
      reason: "user_tokens",
    });
  }

  return {
    allowed: true,
    limit: featureLimit.requestLimit,
    remaining: Math.max(featureLimit.requestLimit - nextUserRequests, 0),
    resetAt,
  };
}

export function getRetryAfterSeconds(resetAt: Date, now = new Date()) {
  return Math.max(Math.ceil((resetAt.getTime() - now.getTime()) / 1000), 1);
}

function blockedDecision({
  featureLimit,
  limit,
  remaining,
  resetAt,
  reason,
}: {
  featureLimit: AiFeatureLimit;
  limit: number;
  remaining: number;
  resetAt: Date;
  reason: AiLimitBlockReason;
}): AiLimitDecision {
  return {
    allowed: false,
    limit,
    remaining,
    resetAt,
    reason,
    message: formatLimitMessage(featureLimit, resetAt, reason),
  };
}

function formatLimitMessage(
  featureLimit: AiFeatureLimit,
  resetAt: Date,
  reason: AiLimitBlockReason,
) {
  const resetLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(resetAt);
  const scope =
    reason === "global_requests" || reason === "global_tokens"
      ? "Pulse's site-wide AI limit"
      : `Your ${featureLimit.period === "week" ? "weekly" : "daily"} ${featureLimit.label} AI limit`;

  return `${scope} was reached. Try again after ${resetLabel}.`;
}

function withEnvLimit(
  limit: AiFeatureLimit,
  requestValue: string | undefined,
  tokenValue: string | undefined,
): AiFeatureLimit {
  return {
    ...limit,
    requestLimit: parsePositiveIntEnv(requestValue, limit.requestLimit),
    tokenLimit: parsePositiveIntEnv(tokenValue, limit.tokenLimit),
  };
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

function parsePositiveIntEnv(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
