import { getLocalDateInTimeZone, offsetLocalDate } from "@/lib/pulse/local-date-core";

export const aiGlobalTimeZone = "UTC";

export type AiFeature =
  | "pulse-coach"
  | "habit-agent"
  | "weekly-story"
  | "reword-suggestions"
  | "identity-timeline"
  | "journal-check-ins"
  | "reminder-nudge";

export type AiLimitPeriod = "day";

export type AiFeatureLimit = {
  feature: AiFeature;
  maxOutputTokens: number;
};

export type AiLimitConfig = {
  enabled: boolean;
  userDailyRequestLimit: number;
  userDailyTokenLimit: number;
  requestInputTokenLimit: number;
  globalDailyRequestLimit: number;
  globalDailyTokenLimit: number;
  features: Record<AiFeature, AiFeatureLimit>;
};

export type AiLimitSnapshot = {
  requestCount: number;
  tokenCount: number;
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

export type AiQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

type EnvLike = Record<string, string | undefined>;

export const aiChatMaxMessages = 12;
export const aiChatMaxUserTextChars = 1000;
export const aiChatMaxAssistantTextChars = 4000;
export const aiChatMaxToolJsonChars = 2000;
export const aiChatMaxTotalChars = 16000;
export const aiChatMaxBodyBytes = 64 * 1024;
const aiChatMaxIdChars = 100;

export const aiInputTooLargeMessage =
  "This conversation is too long. Select Start over to begin a new one.";

export const defaultAiLimitConfig: AiLimitConfig = {
  enabled: true,
  userDailyRequestLimit: 30,
  userDailyTokenLimit: 150_000,
  requestInputTokenLimit: 12_000,
  globalDailyRequestLimit: 1_000,
  globalDailyTokenLimit: 5_000_000,
  features: {
    "pulse-coach": { feature: "pulse-coach", maxOutputTokens: 700 },
    "habit-agent": { feature: "habit-agent", maxOutputTokens: 500 },
    "reword-suggestions": { feature: "reword-suggestions", maxOutputTokens: 250 },
    "weekly-story": { feature: "weekly-story", maxOutputTokens: 1200 },
    "identity-timeline": { feature: "identity-timeline", maxOutputTokens: 1200 },
    "journal-check-ins": { feature: "journal-check-ins", maxOutputTokens: 600 },
    "reminder-nudge": { feature: "reminder-nudge", maxOutputTokens: 120 },
  },
};

export function getAiLimitConfig(env: EnvLike = process.env): AiLimitConfig {
  return {
    ...defaultAiLimitConfig,
    enabled: parseBooleanEnv(env.AI_LIMITS_ENABLED, true),
    userDailyRequestLimit: parsePositiveIntEnv(
      env.AI_USER_DAILY_REQUEST_LIMIT,
      defaultAiLimitConfig.userDailyRequestLimit,
    ),
    userDailyTokenLimit: parsePositiveIntEnv(
      env.AI_USER_DAILY_TOKEN_LIMIT,
      defaultAiLimitConfig.userDailyTokenLimit,
    ),
    requestInputTokenLimit: parsePositiveIntEnv(
      env.AI_REQUEST_INPUT_TOKEN_LIMIT,
      defaultAiLimitConfig.requestInputTokenLimit,
    ),
    globalDailyRequestLimit: parsePositiveIntEnv(
      env.AI_GLOBAL_DAILY_REQUEST_LIMIT,
      defaultAiLimitConfig.globalDailyRequestLimit,
    ),
    globalDailyTokenLimit: parsePositiveIntEnv(
      env.AI_GLOBAL_DAILY_TOKEN_LIMIT,
      defaultAiLimitConfig.globalDailyTokenLimit,
    ),
  };
}

export function getPeriodStart(date: Date, timeZone: string) {
  return getLocalDateInTimeZone(date, timeZone);
}

export function getPeriodResetAt(periodStart: string, timeZone: string) {
  return getZonedMidnight(offsetLocalDate(periodStart, 1), timeZone);
}

export function getZonedMidnight(localDate: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  const firstGuess = midnightAsUtc - getTimeZoneOffsetMs(new Date(midnightAsUtc), timeZone);

  return new Date(midnightAsUtc - getTimeZoneOffsetMs(new Date(firstGuess), timeZone));
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const wallClockAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );

  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function estimateTokens(text: string) {
  const cleanText = text.trim();

  return cleanText ? Math.ceil(cleanText.length / 3) : 0;
}

export function isAiInputTooLarge(config: AiLimitConfig, estimatedTokens: number) {
  return config.enabled && estimatedTokens > config.requestInputTokenLimit;
}

export type SanitizedChatPart =
  | { type: "text"; text: string }
  | { type: "step-start" }
  | {
      type: `tool-${string}`;
      toolCallId: string;
      state: "output-available";
      input: unknown;
      output: unknown;
    };

export type SanitizedChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: SanitizedChatPart[];
};

export type SanitizedChatResult =
  | { valid: false; message: string }
  | { valid: true; messages: SanitizedChatMessage[]; characterCount: number };

export function sanitizeAiChatMessages(
  rawMessages: unknown,
  allowedToolNames: readonly string[],
): SanitizedChatResult {
  if (!Array.isArray(rawMessages)) {
    return { valid: false, message: "Your message did not arrive. Try again." };
  }

  const allowedToolTypes = new Set(allowedToolNames.map((name) => `tool-${name}`));
  const messages: SanitizedChatMessage[] = [];

  for (const raw of rawMessages.slice(-aiChatMaxMessages)) {
    if (!isRecord(raw) || (raw.role !== "user" && raw.role !== "assistant") || !Array.isArray(raw.parts)) {
      continue;
    }

    const role = raw.role;
    const parts: SanitizedChatPart[] = [];

    for (const part of raw.parts) {
      if (!isRecord(part) || typeof part.type !== "string") {
        continue;
      }

      if (part.type === "text" && typeof part.text === "string") {
        if (role === "user" && part.text.length > aiChatMaxUserTextChars) {
          return {
            valid: false,
            message: `Keep each message to ${aiChatMaxUserTextChars.toLocaleString("en")} characters or fewer.`,
          };
        }

        if (role === "assistant" && part.text.length > aiChatMaxAssistantTextChars) {
          continue;
        }

        parts.push({ type: "text", text: part.text });
        continue;
      }

      if (role !== "assistant") {
        continue;
      }

      if (part.type === "step-start") {
        parts.push({ type: "step-start" });
        continue;
      }

      if (
        allowedToolTypes.has(part.type) &&
        part.state === "output-available" &&
        typeof part.toolCallId === "string" &&
        part.toolCallId.length <= aiChatMaxIdChars &&
        jsonLength(part.input) <= aiChatMaxToolJsonChars &&
        jsonLength(part.output) <= aiChatMaxToolJsonChars
      ) {
        parts.push({
          type: part.type as `tool-${string}`,
          toolCallId: part.toolCallId,
          state: "output-available",
          input: part.input,
          output: part.output,
        });
      }
    }

    if (parts.some((part) => part.type !== "step-start")) {
      messages.push({
        id: typeof raw.id === "string" ? raw.id.slice(0, aiChatMaxIdChars) : `m${messages.length}`,
        role,
        parts,
      });
    }
  }

  const last = messages.at(-1);
  const lastText = last?.role === "user" ? getChatText([last]).trim() : "";

  if (!lastText) {
    return { valid: false, message: "Write a message first." };
  }

  let characterCount = messages.reduce((total, message) => total + jsonLength(message.parts), 0);

  while (characterCount > aiChatMaxTotalChars && messages.length > 1) {
    const dropped = messages.shift();
    characterCount -= dropped ? jsonLength(dropped.parts) : 0;
  }

  if (characterCount > aiChatMaxTotalChars) {
    return { valid: false, message: aiInputTooLargeMessage };
  }

  return { valid: true, messages, characterCount };
}

export function estimateChatTokens(messages: SanitizedChatMessage[]) {
  return Math.ceil(messages.reduce((total, message) => total + jsonLength(message.parts), 0) / 3);
}

function getChatText(messages: SanitizedChatMessage[]) {
  return messages
    .flatMap((message) => message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])))
    .join("\n");
}

function jsonLength(value: unknown) {
  if (value === undefined) {
    return 0;
  }

  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decideAiLimit({
  config,
  userSnapshot,
  globalSnapshot,
  estimatedTokens,
  resetAt,
  globalResetAt,
  timeZone,
}: {
  config: AiLimitConfig;
  userSnapshot: AiLimitSnapshot;
  globalSnapshot: AiLimitSnapshot;
  estimatedTokens: number;
  resetAt: Date;
  globalResetAt: Date;
  timeZone: string;
}): AiLimitDecision {
  if (!config.enabled) {
    return {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt,
    };
  }

  if (globalSnapshot.requestCount + 1 > config.globalDailyRequestLimit) {
    return blockedDecision("global_requests", config.globalDailyRequestLimit, globalResetAt, timeZone);
  }

  if (globalSnapshot.tokenCount + estimatedTokens > config.globalDailyTokenLimit) {
    return blockedDecision("global_tokens", config.globalDailyTokenLimit, globalResetAt, timeZone);
  }

  if (userSnapshot.requestCount + 1 > config.userDailyRequestLimit) {
    return blockedDecision("user_requests", config.userDailyRequestLimit, resetAt, timeZone);
  }

  if (userSnapshot.tokenCount + estimatedTokens > config.userDailyTokenLimit) {
    return blockedDecision("user_tokens", config.userDailyRequestLimit, resetAt, timeZone);
  }

  return {
    allowed: true,
    limit: config.userDailyRequestLimit,
    remaining: Math.max(config.userDailyRequestLimit - userSnapshot.requestCount - 1, 0),
    resetAt,
  };
}

export function buildAiQuota({
  config,
  userSnapshot,
  resetAt,
}: {
  config: AiLimitConfig;
  userSnapshot: AiLimitSnapshot;
  resetAt: Date;
}): AiQuota {
  const limit = config.userDailyRequestLimit;
  const used = Math.min(userSnapshot.requestCount, limit);
  const tokensSpent = userSnapshot.tokenCount >= config.userDailyTokenLimit;

  return {
    limit,
    used,
    remaining: tokensSpent ? 0 : Math.max(limit - used, 0),
    resetAt: resetAt.toISOString(),
  };
}

export function getRetryAfterSeconds(resetAt: Date, now = new Date()) {
  return Math.max(Math.ceil((resetAt.getTime() - now.getTime()) / 1000), 1);
}

export function formatAiResetTime(resetAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeZone, hour: "numeric", minute: "2-digit" }).format(resetAt);
}

function blockedDecision(
  reason: AiLimitBlockReason,
  limit: number,
  resetAt: Date,
  timeZone: string,
): AiLimitDecision {
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    reason,
    message: formatLimitMessage(reason, limit, resetAt, timeZone),
  };
}

function formatLimitMessage(
  reason: AiLimitBlockReason,
  limit: number,
  resetAt: Date,
  timeZone: string,
) {
  const time = formatAiResetTime(resetAt, timeZone);

  if (reason === "global_requests" || reason === "global_tokens") {
    return `Pulse has reached its AI limit for today. Try again after ${time}.`;
  }

  if (reason === "user_tokens") {
    return `You have used today's AI allowance. It resets at ${time}.`;
  }

  return `You have used today's ${limit} AI uses. They reset at ${time}.`;
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
