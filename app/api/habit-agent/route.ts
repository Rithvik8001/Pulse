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
import { habitAgentModel } from "@/lib/pulse/habit-agent-core";
import {
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
  validateAndTrimAiChatMessages,
} from "@/lib/pulse/ai-limits";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const maxDuration = 60;

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;

  if (!apiKey) {
    logError({
      event: "ai_missing_gateway_key",
      message: "Habit Agent request missing AI Gateway key.",
      route: "/api/habit-agent",
      feature: "habit-agent",
      requestId,
    });
    return Response.json(
      {
        error:
          "Add AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN to your environment before using Habit Agent.",
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
      { error: "Create your Character before using Habit Agent." },
      { status: 400 },
    );
  }

  const { messages }: { messages?: UIMessage[] } = await request.json();

  if (!Array.isArray(messages)) {
    logWarn({
      event: "ai_invalid_messages",
      message: "Habit Agent request did not include messages.",
      route: "/api/habit-agent",
      feature: "habit-agent",
      userId,
      requestId,
    });
    return Response.json({ error: "Missing chat messages." }, { status: 400 });
  }

  const chatValidation = validateAndTrimAiChatMessages(messages);

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
    chatValidation.estimatedInputTokens;
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

  const modelMessages = await convertToModelMessages(chatValidation.messages, {
    tools: promptAndTools.tools,
    ignoreIncompleteToolCalls: true,
  });

  const result = streamText({
    model: habitAgentModel,
    system: promptAndTools.system,
    messages: modelMessages,
    tools: promptAndTools.tools,
    providerOptions: reservation.providerOptions,
    maxOutputTokens: reservation.maxOutputTokens,
    stopWhen: stepCountIs(3),
    temperature: 0.35,
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
    originalMessages: chatValidation.messages,
    onError: () => "Habit Agent could not respond yet. Try again in a bit.",
  });
}

function rateLimitedResponse(reservation: Extract<Awaited<ReturnType<typeof reserveAiUsage>>, { allowed: false }>) {
  return Response.json(
    {
      error: reservation.message,
      retryAfter: reservation.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": reservation.retryAfterSeconds.toString(),
        "X-RateLimit-Limit": reservation.limit.toString(),
        "X-RateLimit-Remaining": reservation.remaining.toString(),
        "X-RateLimit-Reset": reservation.resetAt.toISOString(),
      },
    },
  );
}
