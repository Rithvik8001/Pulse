"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import { sendWelcomeEmailAfterSetup } from "@/lib/email/welcome";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";

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
const noteMaxLength = 240;

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
  sendWelcomeEmailAfterSetup(character).catch((error: unknown) => {
    console.error("Welcome email failed", error);
  });
  redirect("/dashboard");
}

export type CheckInFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function upsertCheckInAction(
  _state: CheckInFormState,
  formData: FormData,
): Promise<CheckInFormState> {
  const userId = await requireUserId();
  const questId = normalizeText(formData.get("questId"));
  const localDate = normalizeDate(formData.get("localDate"));
  const outcome = normalizeOutcome(formData.get("outcome"));
  const note = normalizeOptionalText(formData.get("note"));

  if (!questId || !localDate || !outcome) {
    return {
      status: "error",
      message: "Choose Win or Pass before saving proof.",
    };
  }

  if (note && note.length > noteMaxLength) {
    return {
      status: "error",
      message: `Keep proof notes under ${noteMaxLength} characters.`,
    };
  }

  const [quest] = await db
    .select({
      id: quests.id,
      characterId: quests.characterId,
    })
    .from(quests)
    .where(
      and(
        eq(quests.id, questId),
        eq(quests.userId, userId),
        eq(quests.status, "active"),
        isNull(quests.archivedAt),
      ),
    )
    .limit(1);

  if (!quest) {
    return {
      status: "error",
      message: "We could not find that Quest for your account.",
    };
  }

  await db
    .insert(checkIns)
    .values({
      userId,
      characterId: quest.characterId,
      questId: quest.id,
      localDate,
      outcome,
      note,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [checkIns.userId, checkIns.questId, checkIns.localDate],
      set: {
        outcome,
        note,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: outcome === "win" ? "Win saved." : "Pass saved.",
  };
}

function normalizeDate(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return getLocalDate();
  }

  return text;
}

function normalizeOutcome(value: FormDataEntryValue | null) {
  const text = normalizeText(value).toLowerCase();

  if (text === "win" || text === "pass") {
    return text;
  }

  return null;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  return text.length > 0 ? text : null;
}
