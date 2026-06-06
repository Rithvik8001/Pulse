"use server";

import { revalidatePath } from "next/cache";

import {
  deleteJournalEntry,
  upsertJournalEntry,
  type JournalMutationResult,
} from "@/lib/pulse/journal";

export type JournalFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function toFormState(result: JournalMutationResult): JournalFormState {
  return result;
}

function revalidateJournalSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/story");
}

export async function saveJournalEntryAction(
  _state: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const result = await upsertJournalEntry(
    normalizeText(formData.get("localDate")),
    normalizeText(formData.get("body")),
  );
  revalidateJournalSurfaces();

  return toFormState(result);
}

export async function deleteJournalEntryAction(formData: FormData) {
  await deleteJournalEntry(normalizeText(formData.get("entryId")));
  revalidateJournalSurfaces();
}
