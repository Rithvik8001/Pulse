"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { characters, quests } from "@/lib/db/schema";
import { requireUserId } from "@/lib/pulse/dashboard";

export type SetupFormState = {
  status: "idle" | "error";
  message?: string;
  fields?: {
    character?: string;
    quests?: string[];
  };
  errors?: {
    character?: string;
    quests?: string;
  };
};

const characterMaxLength = 48;
const questMaxLength = 96;
const questLimit = 3;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeQuestList(formData: FormData) {
  return formData
    .getAll("quests")
    .map((quest) =>
      typeof quest === "string" ? quest.trim().replace(/\s+/g, " ") : "",
    )
    .filter(Boolean)
    .slice(0, questLimit);
}

export async function createInitialSetup(
  _state: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const userId = await requireUserId();
  const character = normalizeText(formData.get("character"));
  const questList = normalizeQuestList(formData);
  const errors: SetupFormState["errors"] = {};

  if (!character) {
    errors.character = "Add a Character before continuing.";
  } else if (character.length > characterMaxLength) {
    errors.character = `Keep Character under ${characterMaxLength} characters.`;
  }

  if (questList.length === 0) {
    errors.quests = "Add at least one Quest.";
  } else if (questList.some((quest) => quest.length > questMaxLength)) {
    errors.quests = `Keep each Quest under ${questMaxLength} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: {
        character,
        quests: questList.length > 0 ? questList : ["", "", ""],
      },
      errors,
    };
  }

  try {
    await db.transaction(async (tx) => {
      const [createdCharacter] = await tx
        .insert(characters)
        .values({
          userId,
          name: character,
        })
        .returning({
          id: characters.id,
        });

      await tx.insert(quests).values(
        questList.map((quest, index) => ({
          characterId: createdCharacter.id,
          userId,
          title: quest,
          position: index + 1,
        })),
      );
    });
  } catch {
    return {
      status: "error",
      message:
        "We could not save your setup. If you already created one, refresh the dashboard.",
      fields: {
        character,
        quests: questList,
      },
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
