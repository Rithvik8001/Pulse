import type { UIMessage } from "ai";

import {
  coachActionSchema,
  type CoachAction,
  type CoachProposal,
} from "@/lib/pulse/coach-core";
import {
  habitAgentActionSchema,
  type HabitAgentAction,
  type HabitAgentProposal,
} from "@/lib/pulse/habit-agent-core";

export type ProposalAction = CoachAction | HabitAgentAction;

export type ParsedProposal = {
  title: string;
  summary: string;
  action: ProposalAction;
  actionLabel: string;
  destructive: boolean;
};

export type ConfirmationState = {
  status: "confirmed" | "canceled" | "error";
  message: string;
};

export function parseCoachProposal(output: unknown): ParsedProposal | null {
  const proposal = getCoachProposal(output);

  if (!proposal) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: proposal.action,
    actionLabel: formatCoachActionLabel(proposal.action.type),
    destructive: false,
  };
}

export function parseHabitProposal(output: unknown): ParsedProposal | null {
  const proposal = getHabitProposal(output);

  if (!proposal) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: proposal.action,
    actionLabel: formatHabitActionLabel(proposal.action.type),
    destructive: proposal.action.type === "deleteHabit",
  };
}

export function isToolPart(
  part: UIMessage["parts"][number],
): part is Extract<UIMessage["parts"][number], { type: `tool-${string}` }> {
  return part.type.startsWith("tool-");
}

export function redactPrivateIdentifiers(text: string) {
  return text
    .replace(/\[id:[^\]]+\]/gi, "")
    .replace(/\bid:[\w-]+/gi, "[private id]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[private id]",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[private email]")
    .replace(/\b(?:sk|vck|pk|rk|pat)_[A-Za-z0-9_-]{16,}\b/g, "[private token]")
    .replace(/\b(?:sk|vck|pk|rk|pat)-[A-Za-z0-9_-]{16,}\b/g, "[private token]");
}

function getCoachProposal(output: unknown): CoachProposal | null {
  if (!output || typeof output !== "object") {
    return null;
  }

  const proposal = output as Partial<CoachProposal>;

  if (
    typeof proposal.title !== "string" ||
    typeof proposal.summary !== "string"
  ) {
    return null;
  }

  const action = coachActionSchema.safeParse(proposal.action);

  if (!action.success) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: action.data,
  };
}

function getHabitProposal(output: unknown): HabitAgentProposal | null {
  if (!output || typeof output !== "object") {
    return null;
  }

  const proposal = output as Partial<HabitAgentProposal>;

  if (
    typeof proposal.title !== "string" ||
    typeof proposal.summary !== "string"
  ) {
    return null;
  }

  const action = habitAgentActionSchema.safeParse(proposal.action);

  if (!action.success) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: action.data,
  };
}

function formatCoachActionLabel(action: CoachAction["type"]) {
  switch (action) {
    case "createQuest":
      return "Create";
    case "updateQuest":
      return "Update";
    case "archiveQuest":
      return "Archive";
    case "restoreQuest":
      return "Restore";
    case "saveCheckIn":
      return "Check-in";
    case "saveJournal":
      return "Journal";
  }
}

function formatHabitActionLabel(action: HabitAgentAction["type"]) {
  switch (action) {
    case "createHabit":
      return "Create";
    case "updateHabit":
      return "Update";
    case "archiveHabit":
      return "Archive";
    case "restoreHabit":
      return "Restore";
    case "deleteHabit":
      return "Delete";
  }
}
