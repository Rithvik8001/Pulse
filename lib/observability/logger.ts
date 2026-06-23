import { createHash, randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";

export type LogEventInput = {
  event: string;
  message: string;
  route?: string;
  feature?: string;
  userId?: string | null;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  error?: unknown;
};

export type StructuredLogEvent = {
  level: LogLevel;
  event: string;
  message: string;
  timestamp: string;
  route?: string;
  feature?: string;
  userIdHash?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  error?: {
    name: string;
    message: string;
  };
};

export function createRequestId(headers?: Headers) {
  return (
    headers?.get("x-vercel-id") ??
    headers?.get("x-request-id") ??
    randomUUID()
  );
}

export function hashUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 24);
}

export function toStructuredLogEvent(
  level: LogLevel,
  input: LogEventInput,
): StructuredLogEvent {
  return {
    level,
    event: input.event,
    message: input.message,
    timestamp: new Date().toISOString(),
    route: input.route,
    feature: input.feature,
    userIdHash: input.userId ? hashUserId(input.userId) : undefined,
    requestId: input.requestId,
    metadata: normalizeMetadata(input.metadata),
    error: normalizeError(input.error),
  };
}

export function logInfo(input: LogEventInput) {
  writeLog("info", input);
}

export function logWarn(input: LogEventInput) {
  writeLog("warn", input);
}

export function logError(input: LogEventInput) {
  writeLog("error", input);
}

function writeLog(level: LogLevel, input: LogEventInput) {
  const event = toStructuredLogEvent(level, input);
  const line = JSON.stringify(removeUndefined(event));

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

function normalizeMetadata(
  metadata: LogEventInput["metadata"],
): StructuredLogEvent["metadata"] {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        entry[1] !== undefined,
    ),
  );
}

function normalizeError(error: unknown): StructuredLogEvent["error"] {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.slice(0, 500),
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown error",
  };
}

function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}
