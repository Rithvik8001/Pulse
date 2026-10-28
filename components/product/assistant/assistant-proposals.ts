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
  preview: string | null;
};

export type ConfirmationState = {
  status: "confirmed" | "canceled" | "error";
  message: string;
  target?: ProposalTarget;
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
    preview: getCoachActionPreview(proposal.action),
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
    preview: null,
  };
}

function getCoachActionPreview(action: CoachAction) {
  if (action.type === "saveJournal") return action.body;
  if (action.type === "saveCheckIn") return action.note?.trim() || null;
  return null;
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
      return "Add";
    case "updateQuest":
      return "Rename";
    case "archiveQuest":
      return "Archive";
    case "restoreQuest":
      return "Restore";
    case "saveCheckIn":
      return "Check in";
    case "saveJournal":
      return "Journal";
    case "updateQuestSchedule":
      return "Schedule";
  }
}

function formatHabitActionLabel(action: HabitAgentAction["type"]) {
  switch (action) {
    case "createHabit":
      return "Add";
    case "updateHabit":
      return "Rename";
    case "archiveHabit":
      return "Archive";
    case "restoreHabit":
      return "Restore";
    case "deleteHabit":
      return "Delete";
    case "updateHabitSchedule":
      return "Schedule";
  }
}

export type ProposalTarget = {
  href: string;
  highlightId: string | null;
};

export const highlightParam = "highlight";

function withHighlight(path: string, highlightId: string | null) {
  if (!highlightId) return path;
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(highlightParam, highlightId);
  return `${base}?${params.toString()}`;
}

function browserToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getProposalTarget(action: ProposalAction, createdQuestId?: string): ProposalTarget {
  const habits = (highlightId: string | null): ProposalTarget => ({
    href: withHighlight("/dashboard/habits", highlightId),
    highlightId,
  });

  switch (action.type) {
    case "createQuest":
    case "createHabit":
      return habits(createdQuestId ?? null);
    case "deleteHabit":
      return habits(null);
    case "saveCheckIn": {
      const path = action.localDate === browserToday() ? "/dashboard" : `/dashboard/journal?date=${action.localDate}`;
      return { href: withHighlight(path, action.questId), highlightId: action.questId };
    }
    case "saveJournal":
      return {
        href: withHighlight(`/dashboard/journal?date=${action.localDate}`, "journal-entry"),
        highlightId: "journal-entry",
      };
    default:
      return habits(action.questId);
  }
}

const confirmedVerbs: Record<string, string> = {
  Add: "Added",
  Rename: "Renamed",
  Archive: "Archived",
  Restore: "Restored",
  Delete: "Deleted",
  Schedule: "New schedule for",
  "Check in": "Checked in",
  Journal: "Saved journal entry",
};

export function formatConfirmedLine(proposal: ParsedProposal) {
  const verb = confirmedVerbs[proposal.actionLabel] ?? "Done:";
  const subject = proposal.summary.match(/"([^"]+)"/)?.[1];

  return subject ? `${verb} ${subject}` : verb;
}
