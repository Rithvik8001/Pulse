import "server-only";

import { and, asc, count, desc, eq, isNull, max, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import { requireUserId } from "@/lib/pulse/dashboard";

export const activeQuestLimit = 12;
export const questTitleMaxLength = 96;

export type ManagedQuest = {
  id: string;
  title: string;
  position: number;
  status: "active" | "archived";
  archivedAt: Date | null;
  checkInCount: number;
};

export type QuestManagerData =
  | {
      isSetupComplete: false;
      character: null;
      activeQuests: [];
      archivedQuests: [];
      activeQuestLimit: number;
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      activeQuests: ManagedQuest[];
      archivedQuests: ManagedQuest[];
      activeQuestLimit: number;
    };

export type QuestMutationResult = {
  status: "success" | "error";
  message: string;
};

export async function getQuestManagerData(): Promise<QuestManagerData> {
  const userId = await requireUserId();
  const character = await getCharacterForUser(userId);

  if (!character) {
    return {
      isSetupComplete: false,
      character: null,
      activeQuests: [],
      archivedQuests: [],
      activeQuestLimit,
    };
  }

  const rows = await db
    .select({
      id: quests.id,
      title: quests.title,
      position: quests.position,
      status: quests.status,
      archivedAt: quests.archivedAt,
      checkInCount: count(checkIns.id),
    })
    .from(quests)
    .leftJoin(checkIns, eq(checkIns.questId, quests.id))
    .where(eq(quests.userId, userId))
    .groupBy(quests.id)
    .orderBy(asc(quests.position), desc(quests.updatedAt));

  const managedQuests: ManagedQuest[] = rows.map((row) => ({
    ...row,
    status: row.status === "archived" ? "archived" : "active",
    checkInCount: Number(row.checkInCount),
  }));

  return {
    isSetupComplete: true,
    character,
    activeQuests: managedQuests.filter((quest) => quest.status === "active"),
    archivedQuests: managedQuests.filter(
      (quest) => quest.status === "archived",
    ),
    activeQuestLimit,
  };
}

export async function createQuest(title: string): Promise<QuestMutationResult> {
  const userId = await requireUserId();
  const character = await getCharacterForUser(userId);

  if (!character) {
    return {
      status: "error",
      message: "Create your Character before adding Quests.",
    };
  }

  const normalizedTitle = normalizeQuestTitle(title);
  const validationError = validateQuestTitle(normalizedTitle);

  if (validationError) {
    return {
      status: "error",
      message: validationError,
    };
  }

  const activeCount = await getActiveQuestCount(userId);

  if (activeCount >= activeQuestLimit) {
    return {
      status: "error",
      message: `Keep active Quests to ${activeQuestLimit} or fewer.`,
    };
  }

  const nextPosition = await getNextQuestPosition(character.id);
  await db.insert(quests).values({
    characterId: character.id,
    userId,
    title: normalizedTitle,
    position: nextPosition,
    status: "active",
    updatedAt: new Date(),
  });

  return {
    status: "success",
    message: "Quest added.",
  };
}

export async function updateQuestTitle(
  questId: string,
  title: string,
): Promise<QuestMutationResult> {
  const userId = await requireUserId();
  const normalizedTitle = normalizeQuestTitle(title);
  const validationError = validateQuestTitle(normalizedTitle);

  if (validationError) {
    return {
      status: "error",
      message: validationError,
    };
  }

  const [quest] = await db
    .update(quests)
    .set({
      title: normalizedTitle,
      updatedAt: new Date(),
    })
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
    .returning({ id: quests.id });

  if (!quest) {
    return {
      status: "error",
      message: "We could not find that Quest for your account.",
    };
  }

  return {
    status: "success",
    message: "Quest updated.",
  };
}

export async function moveQuest(
  questId: string,
  direction: "up" | "down",
): Promise<QuestMutationResult> {
  const userId = await requireUserId();
  const activeQuests = await db
    .select({
      id: quests.id,
      position: quests.position,
    })
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        eq(quests.status, "active"),
        isNull(quests.archivedAt),
      ),
    )
    .orderBy(asc(quests.position));
  const currentIndex = activeQuests.findIndex((quest) => quest.id === questId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const currentQuest = activeQuests[currentIndex];
  const targetQuest = activeQuests[targetIndex];

  if (!currentQuest || !targetQuest) {
    return {
      status: "error",
      message: "That Quest cannot move any further.",
    };
  }

  const temporaryPosition = -1;
  await db.transaction(async (tx) => {
    await tx
      .update(quests)
      .set({
        position: temporaryPosition,
        updatedAt: new Date(),
      })
      .where(and(eq(quests.id, currentQuest.id), eq(quests.userId, userId)));
    await tx
      .update(quests)
      .set({
        position: currentQuest.position,
        updatedAt: new Date(),
      })
      .where(and(eq(quests.id, targetQuest.id), eq(quests.userId, userId)));
    await tx
      .update(quests)
      .set({
        position: targetQuest.position,
        updatedAt: new Date(),
      })
      .where(and(eq(quests.id, currentQuest.id), eq(quests.userId, userId)));
  });

  return {
    status: "success",
    message: "Quest moved.",
  };
}

export async function removeQuest(
  questId: string,
): Promise<QuestMutationResult> {
  const userId = await requireUserId();
  const quest = await getOwnedQuestWithProofCount(userId, questId);

  if (!quest) {
    return {
      status: "error",
      message: "We could not find that Quest for your account.",
    };
  }

  if (quest.checkInCount === 0) {
    await db
      .delete(quests)
      .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

    return {
      status: "success",
      message: "Quest deleted.",
    };
  }

  await db
    .update(quests)
    .set({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  return {
    status: "success",
    message: "Quest archived. Your Proof stayed intact.",
  };
}

export async function restoreQuest(
  questId: string,
): Promise<QuestMutationResult> {
  const userId = await requireUserId();
  const activeCount = await getActiveQuestCount(userId);

  if (activeCount >= activeQuestLimit) {
    return {
      status: "error",
      message: `Archive another Quest before restoring this one. The active limit is ${activeQuestLimit}.`,
    };
  }

  const [quest] = await db
    .update(quests)
    .set({
      status: "active",
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quests.id, questId),
        eq(quests.userId, userId),
        eq(quests.status, "archived"),
      ),
    )
    .returning({ id: quests.id });

  if (!quest) {
    return {
      status: "error",
      message: "We could not restore that Quest.",
    };
  }

  return {
    status: "success",
    message: "Quest restored.",
  };
}

function normalizeQuestTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateQuestTitle(title: string) {
  if (!title) {
    return "Add a Quest title before saving.";
  }

  if (title.length > questTitleMaxLength) {
    return `Keep Quest titles under ${questTitleMaxLength} characters.`;
  }

  return null;
}

async function getCharacterForUser(userId: string) {
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  return character ?? null;
}

async function getActiveQuestCount(userId: string) {
  const [row] = await db
    .select({
      count: count(),
    })
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        eq(quests.status, "active"),
        isNull(quests.archivedAt),
      ),
    );

  return Number(row?.count ?? 0);
}

async function getNextQuestPosition(characterId: string) {
  const [row] = await db
    .select({
      position: max(quests.position),
    })
    .from(quests)
    .where(eq(quests.characterId, characterId));

  return Number(row?.position ?? 0) + 1;
}

async function getOwnedQuestWithProofCount(userId: string, questId: string) {
  const [quest] = await db
    .select({
      id: quests.id,
      checkInCount: sql<number>`count(${checkIns.id})::int`,
    })
    .from(quests)
    .leftJoin(checkIns, eq(checkIns.questId, quests.id))
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
    .groupBy(quests.id)
    .limit(1);

  return quest ?? null;
}
