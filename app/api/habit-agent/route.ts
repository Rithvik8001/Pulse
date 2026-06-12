import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  stepCountIs,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { getHabitAgentPromptAndTools } from "@/lib/pulse/habit-agent";
import { habitAgentModel } from "@/lib/pulse/habit-agent-core";
import { requireUserId } from "@/lib/pulse/dashboard";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_PULSE_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Add OPENAI_PULSE_API_KEY to your environment before using Habit Agent.",
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

  const modelMessages = await convertToModelMessages(messages, {
    tools: promptAndTools.tools,
    ignoreIncompleteToolCalls: true,
  });
  const openai = createOpenAI({ apiKey });

  const result = streamText({
    model: openai(habitAgentModel),
    system: promptAndTools.system,
    messages: modelMessages,
    tools: promptAndTools.tools,
    stopWhen: stepCountIs(3),
    temperature: 0.35,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: () => "Habit Agent could not respond yet. Try again in a bit.",
  });
}
