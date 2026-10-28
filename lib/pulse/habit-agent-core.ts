import { z } from "zod";

import { scheduleInputSchema } from "@/lib/pulse/schedule-core";

export const habitAgentModel = "claude-haiku-5-5";

export const habitAgentToolNames = [
  "proposeCreateHabit",
  "proposeUpdateHabit",
  "proposeArchiveHabit",
  "proposeRestoreHabit",
  "proposeDeleteHabit",
  "proposeUpdateHabitSchedule",
] as const;
export const habitAgentTextLimit = 180;

export const habitAgentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createHabit"),
    title: z.string().min(1).max(96),
    schedule: scheduleInputSchema.optional(),
  }),
  z.object({
    type: z.literal("updateHabitSchedule"),
    questId: z.string().min(1),
    schedule: scheduleInputSchema,
  }),
  z.object({
    type: z.literal("updateHabit"),
    questId: z.string().min(1),
    title: z.string().min(1).max(96),
  }),
  z.object({
    type: z.literal("archiveHabit"),
    questId: z.string().min(1),
  }),
  z.object({
    type: z.literal("restoreHabit"),
    questId: z.string().min(1),
  }),
  z.object({
    type: z.literal("deleteHabit"),
    questId: z.string().min(1),
  }),
]);

export type HabitAgentAction = z.infer<typeof habitAgentActionSchema>;

export type HabitAgentProposal = {
  title: string;
  summary: string;
  action: HabitAgentAction;
};

export type HabitAgentHabit = {
  id: string;
  title: string;
  status: "active" | "archived";
  proofCount: number;
  winCount: number;
  passCount: number;
  lastCheckInDate: string | null;
  scheduleLabel: string;
  archivedAt: string | null;
};

export type HabitAgentContext = {
  today: string;
  activeQuestLimit: number;
  character: {
    id: string;
    name: string;
  };
  activeHabits: HabitAgentHabit[];
  archivedHabits: HabitAgentHabit[];
  suggestions: {
    type: "archive" | "reword" | "restore";
    questTitle: string;
    reason: string;
  }[];
};

export function truncateHabitAgentText(value: string | null | undefined) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");

  if (text.length <= habitAgentTextLimit) {
    return text;
  }

  return `${text.slice(0, habitAgentTextLimit - 1).trim()}…`;
}

const SHARED_LINE =
  'Words to use with the person: habit (not quest), check-in (not proof), done and skipped (not win and pass), weekly recap (not story), consistency (not momentum), "N days in a row" (not streak). Never use quest, proof, win, pass, momentum, character or streak in replies.';

export function buildHabitAgentSystemPrompt(context: HabitAgentContext) {
  return [
    "You are Pip, the friendly habit assistant inside Pulse. If the person asks who you are, say you are Pip. In this conversation you only help the person change their habit list. Past check-ins are always kept.",
    SHARED_LINE,
    "",
    "Hard rules:",
    "- You may only help with these changes: add (with a schedule), rename, archive, restore, change a habit's schedule, and delete habits that have no check-ins.",
    "- Schedules: every day, specific weekdays, or 1 to 6 times a week. Weeks start Monday. When the person says things like three times a week or on weekdays, use that schedule. A new habit is every day unless they say otherwise. A schedule change applies from today; past days keep their old schedule.",
    "- For any change, call a proposal tool. The person must confirm each card before Pulse changes anything.",
    "- Never claim you added, renamed, archived, restored, or deleted anything unless a confirmed result appears in the conversation.",
    "- Never reveal ids, UUIDs, database keys, API keys, access tokens, emails, or other private identifiers.",
    "- Internal ids in square brackets are private tool handles. Use them only for proposal tool calls.",
    "- Delete is only allowed for habits with no check-ins.",
    "- If the person asks to delete an active habit with check-ins, propose archiving it instead.",
    "- If the person asks to delete an archived habit with check-ins, explain it cannot be deleted because its check-ins are kept; do not create a card.",
    "- Do not propose check-ins, journal entries, changes to past check-ins, or weekly recaps. For those, tell the person to select Start over and choose Ask about my habits.",
    "- Keep replies concise and grounded in the habit list below.",
    "",
    `Today: ${context.today}`,
    `Who they are becoming: ${context.character.name}`,
    `Active habit limit: ${context.activeHabits.length}/${context.activeQuestLimit}`,
    "",
    "Active habits:",
    formatLines(context.activeHabits.map(formatHabitLine)),
    "",
    "Archived habits:",
    formatLines(context.archivedHabits.map(formatHabitLine)),
    "",
    "Suggestions:",
    formatLines(
      context.suggestions.map(
        (suggestion) =>
          `${suggestion.type}: ${suggestion.questTitle} - ${truncateHabitAgentText(suggestion.reason)}`,
      ),
    ),
  ].join("\n");
}

export function buildDeleteHabitProposal(
  habit: HabitAgentHabit | null,
): HabitAgentProposal | null {
  if (!habit) {
    return null;
  }

  if (habit.proofCount === 0) {
    return {
      title: "Delete habit",
      summary: `Delete "${habit.title}". It has no check-ins, so nothing else is lost.`,
      action: {
        type: "deleteHabit",
        questId: habit.id,
      },
    };
  }

  if (habit.status === "active") {
    return {
      title: "Archive habit",
      summary: `Archive "${habit.title}" instead. It has ${habit.proofCount} ${habit.proofCount === 1 ? "check-in" : "check-ins"}, and they stay in your history.`,
      action: {
        type: "archiveHabit",
        questId: habit.id,
      },
    };
  }

  return null;
}

function formatHabitLine(habit: HabitAgentHabit) {
  const proof = `${habit.proofCount} check-ins, ${habit.winCount} done, ${habit.passCount} skipped`;
  const last = habit.lastCheckInDate
    ? `last check-in ${habit.lastCheckInDate}`
    : "last check-in none";
  const archived = habit.archivedAt ? `, archived ${habit.archivedAt}` : "";

  return `${habit.title} [id:${habit.id}] - ${habit.status}; schedule ${habit.scheduleLabel}; ${proof}; ${last}${archived}`;
}

function formatLines(lines: string[]) {
  return lines.length > 0
    ? lines.map((line) => `- ${line}`).join("\n")
    : "- none";
}
