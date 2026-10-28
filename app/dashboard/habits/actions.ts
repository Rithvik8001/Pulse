"use server";

import { revalidatePath } from "next/cache";

import {
  createQuest,
  moveQuest,
  removeQuest,
  restoreQuest,
  updateQuestSchedule,
  updateQuestTitle,
  type QuestMutationResult,
} from "@/lib/pulse/quests";
import { parseScheduleFields } from "@/lib/pulse/schedule-core";

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
  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard/review");
}

function readSchedule(formData: FormData) {
  return parseScheduleFields({
    kind: normalizeText(formData.get("scheduleKind")),
    weekdays: formData.getAll("weekdays").map(normalizeText),
    timesPerWeek: normalizeText(formData.get("timesPerWeek")),
  });
}

export async function createQuestAction(
  _state: QuestFormState,
  formData: FormData,
): Promise<QuestFormState> {
  const schedule = readSchedule(formData);

  if (!schedule.ok) {
    return { status: "error", message: schedule.message };
  }

  const result = await createQuest(normalizeText(formData.get("title")), schedule.schedule);
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

export async function updateQuestScheduleAction(
  _state: QuestFormState,
  formData: FormData,
): Promise<QuestFormState> {
  const schedule = readSchedule(formData);

  if (!schedule.ok) {
    return { status: "error", message: schedule.message };
  }

  const result = await updateQuestSchedule(normalizeText(formData.get("questId")), schedule.schedule);
  revalidateQuestSurfaces();
  revalidatePath("/dashboard/history");

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
