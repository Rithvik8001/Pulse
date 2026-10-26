import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

export const missingAiKeyMessage =
  "AI is not set up yet. Ask the person who runs Pulse to turn it on.";

export function hasAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function aiModel(modelId: string) {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(modelId.replace(/^openai\//, ""));
}
