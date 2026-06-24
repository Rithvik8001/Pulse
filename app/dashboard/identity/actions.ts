"use server";

import { revalidatePath } from "next/cache";

import {
  generateIdentitySnapshot,
  MissingIdentityAiGatewayKeyError,
  MissingIdentityEvidenceError,
} from "@/lib/pulse/identity";
import { AiLimitReachedError } from "@/lib/pulse/ai-limits";

export type IdentitySnapshotFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function generateIdentitySnapshotAction(): Promise<IdentitySnapshotFormState>;
export async function generateIdentitySnapshotAction(
  _state: IdentitySnapshotFormState,
  _formData: FormData,
): Promise<IdentitySnapshotFormState>;
export async function generateIdentitySnapshotAction(): Promise<IdentitySnapshotFormState> {
  try {
    const snapshot = await generateIdentitySnapshot();

    if (!snapshot) {
      return {
        status: "error",
        message: "Create your Character before generating an Identity snapshot.",
      };
    }

    revalidatePath("/dashboard/identity");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Identity snapshot saved.",
    };
  } catch (error) {
    if (
      error instanceof MissingIdentityEvidenceError ||
      error instanceof MissingIdentityAiGatewayKeyError ||
      error instanceof AiLimitReachedError
    ) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message:
        "Pulse could not generate your Identity snapshot yet. Try again in a bit.",
    };
  }
}
