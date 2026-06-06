"use server";

import { revalidatePath } from "next/cache";

import { updateQuestTitle } from "@/lib/pulse/quests";
import { getRewordOptions, MissingAiKeyError } from "@/lib/pulse/suggestions";

export type RewordOptionsState = {
  status: "idle" | "success" | "error";
  alternatives?: string[];
  message?: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function getRewordOptionsAction(
  _state: RewordOptionsState,
  formData: FormData,
): Promise<RewordOptionsState> {
  const questId = normalizeText(formData.get("questId"));

  if (!questId) {
    return { status: "error", message: "Invalid Quest." };
  }

  try {
    const alternatives = await getRewordOptions(questId);
    return { status: "success", alternatives };
  } catch (error) {
    if (error instanceof MissingAiKeyError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "Could not generate suggestions. Try again.",
    };
  }
}

export async function applyRewordAction(formData: FormData) {
  const questId = normalizeText(formData.get("questId"));
  const title = normalizeText(formData.get("title"));

  if (!questId || !title) return;

  await updateQuestTitle(questId, title);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard/story");
}
