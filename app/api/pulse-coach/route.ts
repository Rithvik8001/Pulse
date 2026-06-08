import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  stepCountIs,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { getPulseCoachPromptAndTools } from "@/lib/pulse/coach";
import { pulseCoachModel } from "@/lib/pulse/coach-core";
import { requireUserId } from "@/lib/pulse/dashboard";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_PULSE_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Add OPENAI_PULSE_API_KEY to your environment before using Pulse Coach.",
      },
      { status: 500 },
    );
  }

  const userId = await requireUserId();
  const { messages }: { messages?: UIMessage[] } = await request.json();

  if (!Array.isArray(messages)) {
    return Response.json({ error: "Missing chat messages." }, { status: 400 });
  }

  const { system, tools } = await getPulseCoachPromptAndTools(userId);
  const modelMessages = await convertToModelMessages(messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  const openai = createOpenAI({ apiKey });

  const result = streamText({
    model: openai(pulseCoachModel),
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(2),
    temperature: 0.45,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: () => "Pulse Coach could not respond yet. Try again in a bit.",
  });
}
