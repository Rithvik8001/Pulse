"use server";

import { revalidatePath } from "next/cache";

import {
  habitAgentActionSchema,
  type HabitAgentAction,
} from "@/lib/pulse/habit-agent-core";
import {
  archiveQuest,
  createQuest,
  deleteQuestIfZeroProof,
  restoreQuest,
  updateQuestSchedule,
  updateQuestTitle,
  type QuestMutationResult,
} from "@/lib/pulse/quests";
import { scheduleFromInput } from "@/lib/pulse/schedule-core";

export type HabitAgentConfirmResult = {
  status: "success" | "error";
  message: string;
  questId?: string;
};

export async function confirmHabitAgentAction(
  action: HabitAgentAction,
): Promise<HabitAgentConfirmResult> {
  const parsed = habitAgentActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      status: "error",
      message: "This change could not be made. Ask Pip again.",
    };
  }

  let result: QuestMutationResult;

  switch (parsed.data.type) {
    case "createHabit":
      result = await createQuest(
        parsed.data.title,
        parsed.data.schedule ? scheduleFromInput(parsed.data.schedule) : undefined,
      );
      break;
    case "updateHabit":
      result = await updateQuestTitle(parsed.data.questId, parsed.data.title);
      break;
    case "archiveHabit":
      result = await archiveQuest(parsed.data.questId);
      break;
    case "restoreHabit":
      result = await restoreQuest(parsed.data.questId);
      break;
    case "deleteHabit":
      result = await deleteQuestIfZeroProof(parsed.data.questId);
      break;
    case "updateHabitSchedule":
      result = await updateQuestSchedule(
        parsed.data.questId,
        scheduleFromInput(parsed.data.schedule),
      );
      break;
  }

  revalidateHabitAgentSurfaces();

  return result;
}

function revalidateHabitAgentSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/review");
}
