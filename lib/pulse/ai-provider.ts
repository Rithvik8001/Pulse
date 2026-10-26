import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Every AI call goes straight to OpenAI with OPENAI_API_KEY.
 * Model ids elsewhere may still carry the historical "openai/" prefix used
 * for logging; it is stripped here.
 */
export const missingAiKeyMessage =
  "AI is not set up yet. Ask the person who runs Pulse to turn it on.";

export function hasAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function aiModel(modelId: string) {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(modelId.replace(/^openai\//, ""));
}
