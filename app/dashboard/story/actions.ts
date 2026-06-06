"use server";

import { revalidatePath } from "next/cache";

import {
  generateAndSaveWeeklyStory,
  MissingAiGatewayKeyError,
  MissingWeeklyProofError,
} from "@/lib/pulse/story";

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
        message: "Create your Character before generating a Weekly Story.",
      };
    }

    revalidatePath("/dashboard/story");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Weekly Story saved.",
    };
  } catch (error) {
    if (
      error instanceof MissingWeeklyProofError ||
      error instanceof MissingAiGatewayKeyError
    ) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message: "Pulse could not generate your Story yet. Try again in a bit.",
    };
  }
}
