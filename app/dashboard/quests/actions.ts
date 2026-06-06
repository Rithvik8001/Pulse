"use server";

import { revalidatePath } from "next/cache";

import {
  createQuest,
  moveQuest,
  removeQuest,
  restoreQuest,
  updateQuestTitle,
  type QuestMutationResult,
} from "@/lib/pulse/quests";

export type QuestFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function toFormState(result: QuestMutationResult): QuestFormState {
  return result;
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function revalidateQuestSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard/story");
}

export async function createQuestAction(
  _state: QuestFormState,
  formData: FormData,
): Promise<QuestFormState> {
  const result = await createQuest(normalizeText(formData.get("title")));
  revalidateQuestSurfaces();

  return toFormState(result);
}

export async function updateQuestTitleAction(
  _state: QuestFormState,
  formData: FormData,
): Promise<QuestFormState> {
  const result = await updateQuestTitle(
    normalizeText(formData.get("questId")),
    normalizeText(formData.get("title")),
  );
  revalidateQuestSurfaces();

  return toFormState(result);
}

export async function moveQuestAction(formData: FormData) {
  const direction = normalizeText(formData.get("direction"));

  await moveQuest(
    normalizeText(formData.get("questId")),
    direction === "down" ? "down" : "up",
  );
  revalidateQuestSurfaces();
}

export async function removeQuestAction(formData: FormData) {
  await removeQuest(normalizeText(formData.get("questId")));
  revalidateQuestSurfaces();
}

export async function restoreQuestAction(formData: FormData) {
  await restoreQuest(normalizeText(formData.get("questId")));
  revalidateQuestSurfaces();
}
