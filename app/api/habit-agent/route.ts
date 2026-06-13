import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  stepCountIs,
} from "ai";

import { getHabitAgentPromptAndTools } from "@/lib/pulse/habit-agent";
import { habitAgentModel } from "@/lib/pulse/habit-agent-core";
import {
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
  validateAndTrimAiChatMessages,
} from "@/lib/pulse/ai-limits";
import { requireUserId } from "@/lib/pulse/dashboard";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Add AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN to your environment before using Habit Agent.",
      },
      { status: 500 },
    );
  }

  const userId = await requireUserId();
  const promptAndTools = await getHabitAgentPromptAndTools(userId);

  if (!promptAndTools) {
    return Response.json(
      { error: "Create your Character before using Habit Agent." },
      { status: 400 },
    );
  }

  const { messages }: { messages?: UIMessage[] } = await request.json();

  if (!Array.isArray(messages)) {
    return Response.json({ error: "Missing chat messages." }, { status: 400 });
  }

  const chatValidation = validateAndTrimAiChatMessages(messages);

  if (!chatValidation.valid) {
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
    onError: ({ error }) =>
      failAiUsage({ eventId: reservation.eventId, error }),
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
