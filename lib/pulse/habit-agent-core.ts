import { z } from "zod";

export const habitAgentModel = "gpt-5.4-nano";
export const habitAgentTextLimit = 180;

export const habitAgentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createHabit"),
    title: z.string().min(1).max(96),
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

export function buildHabitAgentSystemPrompt(context: HabitAgentContext) {
  return [
    "You are Habit Agent, the habits-only AI operator inside Pulse.",
    "Your job is to help the user shape their habit system while preserving Proof.",
    "",
    "Hard rules:",
    "- You may only help with habit operations: create, update, archive, restore, and zero-Proof delete.",
    "- For any write, call a proposal tool. The user must confirm each card before Pulse changes anything.",
    "- Never claim you created, updated, archived, restored, or deleted anything unless a confirmed result appears in the conversation.",
    "- Never reveal ids, UUIDs, database keys, API keys, access tokens, emails, or other private identifiers.",
    "- Internal ids in square brackets are private tool handles. Use them only for proposal tool calls.",
    "- Delete is only valid for habits with zero Proof.",
    "- If the user asks to delete an active habit with Proof, propose archiving it instead.",
    "- If the user asks to delete an archived habit with Proof, explain that deletion is unavailable because Proof is preserved; do not create a card.",
    "- Do not propose Check-ins, Journal entries, Proof edits/deletes, or Weekly Stories.",
    "- Keep replies concise and grounded in the habit list below.",
    "",
    `Today: ${context.today}`,
    `Character: ${context.character.name}`,
    `Active habit limit: ${context.activeHabits.length}/${context.activeQuestLimit}`,
    "",
    "Active Habits:",
    formatLines(context.activeHabits.map(formatHabitLine)),
    "",
    "Archived Habits:",
    formatLines(context.archivedHabits.map(formatHabitLine)),
    "",
    "Heuristic Suggestions:",
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
      title: "Delete Habit",
      summary: `Delete "${habit.title}". This habit has zero Proof.`,
      action: {
        type: "deleteHabit",
        questId: habit.id,
      },
    };
  }

  if (habit.status === "active") {
    return {
      title: "Archive Habit",
      summary: `Archive "${habit.title}" instead of deleting it, because it has ${habit.proofCount} saved Proof item${habit.proofCount === 1 ? "" : "s"}.`,
      action: {
        type: "archiveHabit",
        questId: habit.id,
      },
    };
  }

  return null;
}

function formatHabitLine(habit: HabitAgentHabit) {
  const proof = `${habit.proofCount} Proof, ${habit.winCount} Wins, ${habit.passCount} Passes`;
  const last = habit.lastCheckInDate
    ? `last ${habit.lastCheckInDate}`
    : "last none";
  const archived = habit.archivedAt ? `, archived ${habit.archivedAt}` : "";

  return `${habit.title} [id:${habit.id}] - ${habit.status}; ${proof}; ${last}${archived}`;
}

function formatLines(lines: string[]) {
  return lines.length > 0
    ? lines.map((line) => `- ${line}`).join("\n")
    : "- none";
}
