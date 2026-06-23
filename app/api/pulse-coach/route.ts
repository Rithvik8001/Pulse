import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  stepCountIs,
} from "ai";

import { getPulseCoachPromptAndToolsForUser } from "@/lib/pulse/coach";
import { pulseCoachModel } from "@/lib/pulse/coach-core";
import {
  createRequestId,
  logWarn,
  logError,
} from "@/lib/observability/logger";
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
      message: "Pulse Coach request missing AI Gateway key.",
      route: "/api/pulse-coach",
      feature: "pulse-coach",
      requestId,
    });
    return Response.json(
      {
        error:
          "Add AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN to your environment before using Pulse Coach.",
      },
      { status: 500 },
    );
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const { messages }: { messages?: UIMessage[] } = await request.json();

  if (!Array.isArray(messages)) {
    logWarn({
      event: "ai_invalid_messages",
      message: "Pulse Coach request did not include messages.",
      route: "/api/pulse-coach",
      feature: "pulse-coach",
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
      route: "/api/pulse-coach",
      feature: "pulse-coach",
      userId,
      requestId,
    });
    return Response.json({ error: chatValidation.message }, { status: 400 });
  }

  const { system, tools } = await getPulseCoachPromptAndToolsForUser(
    userId,
    dateContext,
  );
  const estimatedInputTokens =
    estimateAiTextTokens(system) + chatValidation.estimatedInputTokens;
  const reservation = await reserveAiUsage({
    userId,
    feature: "pulse-coach",
    estimatedInputTokens,
    metadata: {
      route: "/api/pulse-coach",
      messageCount: chatValidation.messages.length,
    },
  });

  if (!reservation.allowed) {
    logWarn({
      event: "ai_rate_limited",
      message: reservation.message,
      route: "/api/pulse-coach",
      feature: "pulse-coach",
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
    tools,
    ignoreIncompleteToolCalls: true,
  });

  const result = streamText({
    model: pulseCoachModel,
    system,
    messages: modelMessages,
    tools,
    providerOptions: reservation.providerOptions,
    maxOutputTokens: reservation.maxOutputTokens,
    stopWhen: stepCountIs(2),
    temperature: 0.45,
    onFinish: ({ totalUsage, finishReason }) =>
      completeAiUsage({
        eventId: reservation.eventId,
        usage: totalUsage,
        finishReason,
      }),
    onError: ({ error }) => {
      logError({
        event: "ai_stream_failed",
        message: "Pulse Coach stream failed.",
        route: "/api/pulse-coach",
        feature: "pulse-coach",
        userId,
        requestId,
        error,
      });
      return failAiUsage({ eventId: reservation.eventId, error });
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: chatValidation.messages,
    onError: () => "Pulse Coach could not respond yet. Try again in a bit.",
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
