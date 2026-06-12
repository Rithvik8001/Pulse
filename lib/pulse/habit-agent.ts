import "server-only";

import { tool } from "ai";
import { asc, count, desc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import {
  buildDeleteHabitProposal,
  buildHabitAgentSystemPrompt,
  type HabitAgentAction,
  type HabitAgentContext,
  type HabitAgentHabit,
  type HabitAgentProposal,
} from "@/lib/pulse/habit-agent-core";
import { getLocalDate } from "@/lib/pulse/dashboard";
import { activeQuestLimit } from "@/lib/pulse/quests";
import {
  computeSuggestions,
  getSuggestionsData,
} from "@/lib/pulse/suggestions";

export { buildHabitAgentSystemPrompt } from "@/lib/pulse/habit-agent-core";

export async function getHabitAgentContext(
  userId: string,
): Promise<HabitAgentContext | null> {
  const today = getLocalDate();
  const [character] = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return null;
  }

  const [habitRows, suggestionsRaw] = await Promise.all([
    db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        archivedAt: quests.archivedAt,
        proofCount: count(checkIns.id),
        winCount: sql<number>`count(${checkIns.id}) FILTER (WHERE ${checkIns.outcome} = 'win')::int`,
        passCount: sql<number>`count(${checkIns.id}) FILTER (WHERE ${checkIns.outcome} = 'pass')::int`,
        lastCheckInDate: max(checkIns.localDate),
      })
      .from(quests)
      .leftJoin(checkIns, eq(checkIns.questId, quests.id))
      .where(eq(quests.userId, userId))
      .groupBy(quests.id)
      .orderBy(asc(quests.position), desc(quests.updatedAt)),
    getSuggestionsData(),
  ]);

  const habits: HabitAgentHabit[] = habitRows.map((habit) => ({
    id: habit.id,
    title: habit.title,
    status: habit.status === "archived" ? "archived" : "active",
    proofCount: Number(habit.proofCount),
    winCount: Number(habit.winCount),
    passCount: Number(habit.passCount),
    lastCheckInDate: habit.lastCheckInDate,
    archivedAt: habit.archivedAt ? getLocalDate(habit.archivedAt) : null,
  }));

  return {
    today,
    activeQuestLimit,
    character,
    activeHabits: habits.filter((habit) => habit.status === "active"),
    archivedHabits: habits.filter((habit) => habit.status === "archived"),
    suggestions: computeSuggestions(suggestionsRaw).map((suggestion) => ({
      type: suggestion.type,
      questTitle: suggestion.questTitle,
      reason: suggestion.reason,
    })),
  };
}

export function buildHabitAgentTools(context: HabitAgentContext) {
  function proposal(
    title: string,
    summary: string,
    action: HabitAgentAction,
  ): HabitAgentProposal {
    return { title, summary, action };
  }

  return {
    proposeCreateHabit: tool({
      description:
        "Propose creating a new active habit. Use only for repeatable habits.",
      inputSchema: z.object({
        title: z.string().min(1).max(96),
      }),
      execute: async ({ title }) =>
        proposal("Create Habit", `Add "${title}" to active habits.`, {
          type: "createHabit",
          title,
        }),
    }),
    proposeUpdateHabit: tool({
      description: "Propose renaming an existing habit.",
      inputSchema: z.object({
        questId: z.string().min(1),
        title: z.string().min(1).max(96),
      }),
      execute: async ({ questId, title }) => {
        const habit = findHabit(context, questId);

        return proposal(
          "Update Habit",
          `Rename "${habit?.title ?? "this habit"}" to "${title}".`,
          { type: "updateHabit", questId, title },
        );
      },
    }),
    proposeArchiveHabit: tool({
      description:
        "Propose archiving an active habit so it leaves daily Check-ins while preserving Proof.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const habit = findHabit(context, questId);

        return proposal(
          "Archive Habit",
          `Archive "${habit?.title ?? "this habit"}" and keep its Proof intact.`,
          { type: "archiveHabit", questId },
        );
      },
    }),
    proposeRestoreHabit: tool({
      description: "Propose restoring an archived habit to the active list.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const habit = findHabit(context, questId);

        return proposal(
          "Restore Habit",
          `Restore "${habit?.title ?? "this habit"}" to active habits. Active limit: ${activeQuestLimit}.`,
          { type: "restoreHabit", questId },
        );
      },
    }),
    proposeDeleteHabit: tool({
      description:
        "Propose deleting a habit only when it has zero Proof. If an active habit has Proof, this tool returns an archive proposal instead. If an archived habit has Proof, this tool returns no card.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const habit = findHabit(context, questId);

        return buildDeleteHabitProposal(habit);
      },
    }),
  };
}

export async function getHabitAgentPromptAndTools(userId: string) {
  const context = await getHabitAgentContext(userId);

  if (!context) {
    return null;
  }

  return {
    context,
    system: buildHabitAgentSystemPrompt(context),
    tools: buildHabitAgentTools(context),
  };
}

function findHabit(context: HabitAgentContext, questId: string) {
  return (
    context.activeHabits.find((habit) => habit.id === questId) ??
    context.archivedHabits.find((habit) => habit.id === questId) ??
    null
  );
}
