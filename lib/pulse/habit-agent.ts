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
import { getLocalDateForTimeZone } from "@/lib/pulse/dashboard";
import {
  dailySchedule,
  formatScheduleLabel,
  latestHabitSchedule,
  scheduleFromInput,
  scheduleInputSchema,
} from "@/lib/pulse/schedule-core";
import { getScheduleHistoriesForUser } from "@/lib/pulse/schedules";
import { activeQuestLimit } from "@/lib/pulse/quests";
import {
  computeSuggestions,
  getSuggestionsDataForUser,
} from "@/lib/pulse/suggestions";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";

export { buildHabitAgentSystemPrompt } from "@/lib/pulse/habit-agent-core";

export async function getHabitAgentContext(
  userId: string,
): Promise<HabitAgentContext | null> {
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getHabitAgentContextForUser(userId, dateContext);
}

export async function getHabitAgentContextForUser(
  userId: string,
  dateContext: UserLocalDateContext,
): Promise<HabitAgentContext | null> {
  const today = dateContext.today;
  const [character] = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return null;
  }

  const [habitRows, suggestionsRaw, histories] = await Promise.all([
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
    getSuggestionsDataForUser(userId, dateContext),
    getScheduleHistoriesForUser(userId),
  ]);

  const habits: HabitAgentHabit[] = habitRows.map((habit) => ({
    id: habit.id,
    title: habit.title,
    status: habit.status === "archived" ? "archived" : "active",
    proofCount: Number(habit.proofCount),
    winCount: Number(habit.winCount),
    passCount: Number(habit.passCount),
    lastCheckInDate: habit.lastCheckInDate,
    scheduleLabel: formatScheduleLabel(latestHabitSchedule(histories.get(habit.id) ?? [])),
    archivedAt: habit.archivedAt
      ? getLocalDateForTimeZone(habit.archivedAt, dateContext.timeZone)
      : null,
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
        "Propose adding a new active habit. Use only for repeatable habits. Include a schedule when the person says how often; leave it out for every day.",
      inputSchema: z.object({
        title: z.string().min(1).max(96),
        schedule: scheduleInputSchema.optional(),
      }),
      execute: async ({ title, schedule }) =>
        proposal(
          "Add habit",
          `Add "${title}" to your habits, due ${formatScheduleLabel(schedule ? scheduleFromInput(schedule) : dailySchedule).toLowerCase()}.`,
          { type: "createHabit", title, schedule },
        ),
    }),
    proposeUpdateHabitSchedule: tool({
      description:
        "Propose changing when an active habit is due: every day, specific weekdays, or 1 to 6 times a week. The change applies from today.",
      inputSchema: z.object({
        questId: z.string().min(1),
        schedule: scheduleInputSchema,
      }),
      execute: async ({ questId, schedule }) => {
        const habit = findHabit(context, questId);

        return proposal(
          "Change schedule",
          `Make "${habit?.title ?? "this habit"}" due ${formatScheduleLabel(scheduleFromInput(schedule)).toLowerCase()}, starting today. Past days keep their old schedule.`,
          { type: "updateHabitSchedule", questId, schedule },
        );
      },
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
          "Rename habit",
          `Rename "${habit?.title ?? "this habit"}" to "${title}".`,
          { type: "updateHabit", questId, title },
        );
      },
    }),
    proposeArchiveHabit: tool({
      description:
        "Propose archiving an active habit so it leaves Today. Its check-ins are kept.",
      inputSchema: z.object({
        questId: z.string().min(1),
      }),
      execute: async ({ questId }) => {
        const habit = findHabit(context, questId);

        return proposal(
          "Archive habit",
          `Archive "${habit?.title ?? "this habit"}". Its check-ins stay in your history.`,
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
          "Restore habit",
          `Restore "${habit?.title ?? "this habit"}" to your active habits. You can have up to ${activeQuestLimit}.`,
          { type: "restoreHabit", questId },
        );
      },
    }),
    proposeDeleteHabit: tool({
      description:
        "Propose deleting a habit only when it has no check-ins. If an active habit has check-ins, this tool returns an archive proposal instead. If an archived habit has check-ins, this tool returns no card.",
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
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getHabitAgentPromptAndToolsForUser(userId, dateContext);
}

export async function getHabitAgentPromptAndToolsForUser(
  userId: string,
  dateContext: UserLocalDateContext,
) {
  const context = await getHabitAgentContextForUser(userId, dateContext);

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
