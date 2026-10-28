import "server-only";

import { createAnthropic, type AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";

export const missingAiKeyMessage =
  "AI is not set up yet. Ask the person who runs Pulse to turn it on.";

export const aiProviderOptions = {
  anthropic: {
    thinking: { type: "disabled" },
  } satisfies AnthropicLanguageModelOptions,
};

export function hasAiKey() {
  return Boolean(process.env.CLAUDE_API_KEY);
}

export function aiModel(modelId: string) {
  const anthropic = createAnthropic({ apiKey: process.env.CLAUDE_API_KEY });
  return anthropic(modelId);
}
