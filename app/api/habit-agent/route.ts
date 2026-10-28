import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  stepCountIs,
} from "ai";

import {
  createRequestId,
  logError,
  logWarn,
} from "@/lib/observability/logger";
import { getHabitAgentPromptAndToolsForUser } from "@/lib/pulse/habit-agent";
import { habitAgentModel, habitAgentToolNames } from "@/lib/pulse/habit-agent-core";
import {
  abortAiUsage,
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  readAiChatMessages,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { estimateChatTokens, sanitizeAiChatMessages } from "@/lib/pulse/ai-limits-core";
import { aiModel, hasAiKey, missingAiKeyMessage } from "@/lib/pulse/ai-provider";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const maxDuration = 60;

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  if (!hasAiKey()) {
    logError({
      event: "ai_missing_gateway_key",
      message: "Habit Agent request missing AI Gateway key.",
      route: "/api/habit-agent",
      feature: "habit-agent",
      requestId,
    });
    return Response.json(
      {
        error: missingAiKeyMessage,
      },
      { status: 500 },
    );
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const promptAndTools = await getHabitAgentPromptAndToolsForUser(
    userId,
    dateContext,
  );

  if (!promptAndTools) {
    logWarn({
      event: "ai_missing_setup",
      message: "Habit Agent requested before setup.",
      route: "/api/habit-agent",
      feature: "habit-agent",
      userId,
      requestId,
    });
    return Response.json(
      { error: "Finish setting up Pulse before changing habits here." },
      { status: 400 },
    );
  }

  const body = await readAiChatMessages(request);

  if (!body.ok) {
    logWarn({
      event: "ai_invalid_messages",
      message: body.message,
      route: "/api/habit-agent",
      feature: "habit-agent",
      userId,
      requestId,
    });
    return Response.json({ error: body.message }, { status: 400 });
  }

  const chatValidation = sanitizeAiChatMessages(body.messages, habitAgentToolNames);

  if (!chatValidation.valid) {
    logWarn({
      event: "ai_invalid_messages",
      message: chatValidation.message,
      route: "/api/habit-agent",
      feature: "habit-agent",
      userId,
      requestId,
    });
    return Response.json({ error: chatValidation.message }, { status: 400 });
  }

  const estimatedInputTokens =
    estimateAiTextTokens(promptAndTools.system) +
    estimateChatTokens(chatValidation.messages);
  const reservation = await reserveAiUsage({
    userId,
    feature: "habit-agent",
    estimatedInputTokens,
    metadata: {
      route: "/api/habit-agent",
      messageCount: chatValidation.messages.length,
    },
  });

  if (!reservation.allowed) {
    logWarn({
      event: "ai_rate_limited",
      message: reservation.message,
      route: "/api/habit-agent",
      feature: "habit-agent",
      userId,
      requestId,
      metadata: {
        retryAfterSeconds: reservation.retryAfterSeconds,
        remaining: reservation.remaining,
      },
    });
    return rateLimitedResponse(reservation);
  }

  const modelMessages = await convertToModelMessages(chatValidation.messages as UIMessage[], {
    tools: promptAndTools.tools,
    ignoreIncompleteToolCalls: true,
  });

  const result = streamText({
    model: aiModel(habitAgentModel),
    system: promptAndTools.system,
    messages: modelMessages,
    tools: promptAndTools.tools,
    providerOptions: reservation.providerOptions,
    maxOutputTokens: reservation.maxOutputTokens,
    stopWhen: stepCountIs(3),
    abortSignal: request.signal,
    onAbort: ({ steps }) =>
      abortAiUsage({
        eventId: reservation.eventId,
        stepUsages: steps.map((step) => step.usage),
      }),
    onFinish: ({ totalUsage, finishReason }) =>
      completeAiUsage({
        eventId: reservation.eventId,
        usage: totalUsage,
        finishReason,
      }),
    onError: ({ error }) => {
      logError({
        event: "ai_stream_failed",
        message: "Habit Agent stream failed.",
        route: "/api/habit-agent",
        feature: "habit-agent",
        userId,
        requestId,
        error,
      });
      return failAiUsage({ eventId: reservation.eventId, error });
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: chatValidation.messages as UIMessage[],
    headers: { "X-AI-Remaining": reservation.remaining.toString() },
    onError: () => "Pip could not answer. Try again.",
  });
}

function rateLimitedResponse(reservation: Extract<Awaited<ReturnType<typeof reserveAiUsage>>, { allowed: false }>) {
  return Response.json(
    {
      error: reservation.message,
      retryAfter: reservation.retryAfterSeconds,
    },
    {
      status: reservation.status,
      headers: {
        "Retry-After": reservation.retryAfterSeconds.toString(),
        "X-RateLimit-Limit": reservation.limit.toString(),
        "X-RateLimit-Remaining": reservation.remaining.toString(),
        "X-RateLimit-Reset": reservation.resetAt.toISOString(),
      },
    },
  );
}
