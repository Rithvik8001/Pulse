"use server";

import { revalidatePath } from "next/cache";

import {
  generateAndSaveWeeklyStory,
  MissingAiGatewayKeyError,
  MissingWeeklyProofError,
} from "@/lib/pulse/story";
import {
  generateIdentitySnapshot,
  MissingIdentityAiGatewayKeyError,
  MissingIdentityEvidenceError,
} from "@/lib/pulse/identity";
import { AiLimitReachedError } from "@/lib/pulse/ai-limits";

export type WeeklyStoryFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function generateWeeklyStoryAction(): Promise<WeeklyStoryFormState>;
export async function generateWeeklyStoryAction(
  _state: WeeklyStoryFormState,
  _formData: FormData,
): Promise<WeeklyStoryFormState>;
export async function generateWeeklyStoryAction(): Promise<WeeklyStoryFormState> {
  try {
    const story = await generateAndSaveWeeklyStory();

    if (!story) {
      return {
        status: "error",
        message: "Finish setting up Pulse first.",
      };
    }

    revalidatePath("/dashboard/review");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Recap written.",
    };
  } catch (error) {
    if (
      error instanceof MissingWeeklyProofError ||
      error instanceof MissingAiGatewayKeyError ||
      error instanceof AiLimitReachedError
    ) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message: "Your recap could not be written. Try again.",
    };
  }
}


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
        message: "Finish setting up Pulse first.",
      };
    }

    revalidatePath("/dashboard/review");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Statement refreshed.",
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
        "Your statement could not be refreshed. Try again.",
    };
  }
}
