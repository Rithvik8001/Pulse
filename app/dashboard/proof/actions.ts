"use server";

import { revalidatePath } from "next/cache";

import {
  deleteProofEntry,
  updateProofEntry,
  type ProofMutationResult,
} from "@/lib/pulse/proof";

export type ProofFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function toFormState(result: ProofMutationResult): ProofFormState {
  return result;
}

function revalidateProofSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/proof");
  revalidatePath("/dashboard/story");
}

export async function updateProofAction(
  _state: ProofFormState,
  formData: FormData,
): Promise<ProofFormState> {
  const result = await updateProofEntry(
    normalizeText(formData.get("checkInId")),
    normalizeText(formData.get("outcome")),
    normalizeText(formData.get("note")),
  );
  revalidateProofSurfaces();

  return toFormState(result);
}

export async function deleteProofAction(formData: FormData) {
  await deleteProofEntry(normalizeText(formData.get("checkInId")));
  revalidateProofSurfaces();
}
