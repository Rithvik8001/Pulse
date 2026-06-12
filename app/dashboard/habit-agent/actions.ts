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
  updateQuestTitle,
  type QuestMutationResult,
} from "@/lib/pulse/quests";

export type HabitAgentConfirmResult = {
  status: "success" | "error";
  message: string;
};

export async function confirmHabitAgentAction(
  action: HabitAgentAction,
): Promise<HabitAgentConfirmResult> {
  const parsed = habitAgentActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Habit Agent could not confirm that action.",
    };
  }

  let result: QuestMutationResult;

  switch (parsed.data.type) {
    case "createHabit":
      result = await createQuest(parsed.data.title);
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
  }

  revalidateHabitAgentSurfaces();

  return result;
}

function revalidateHabitAgentSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard/proof");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/story");
}
