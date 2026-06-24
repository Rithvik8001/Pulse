import { z } from "zod";

export const pulseCoachModel = "openai/gpt-5.4-nano";

export const coachRecentProofLimit = 14;
export const coachJournalLimit = 7;
export const coachStoryLimit = 3;
export const coachTextLimit = 180;

export const coachActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createQuest"),
    title: z.string().min(1).max(96),
  }),
  z.object({
    type: z.literal("updateQuest"),
    questId: z.string().min(1),
    title: z.string().min(1).max(96),
  }),
  z.object({
    type: z.literal("archiveQuest"),
    questId: z.string().min(1),
  }),
  z.object({
    type: z.literal("restoreQuest"),
    questId: z.string().min(1),
  }),
  z.object({
    type: z.literal("saveCheckIn"),
    questId: z.string().min(1),
    outcome: z.enum(["win", "pass"]),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().max(240).optional(),
  }),
  z.object({
    type: z.literal("saveJournal"),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    body: z.string().min(1).max(2000),
  }),
]);

export type CoachAction = z.infer<typeof coachActionSchema>;

export type CoachProposal = {
  title: string;
  summary: string;
  action: CoachAction;
};

export type PulseCoachContext = {
  today: string;
  isSetupComplete: boolean;
  character: { id: string; name: string } | null;
  activeQuests: {
    id: string;
    title: string;
    todayOutcome: "win" | "pass" | null;
    todayNote: string | null;
    proof30d: number;
    wins30d: number;
    passes30d: number;
    lastCheckInDate: string | null;
    currentStreak: number;
    longestStreak: number;
    isAtRisk: boolean;
  }[];
  archivedQuests: {
    id: string;
    title: string;
    proofCount: number;
    winCount: number;
    archivedAt: string | null;
  }[];
  recentProof: {
    localDate: string;
    questTitle: string;
    outcome: "win" | "pass";
    note: string | null;
  }[];
  proofSummary: {
    rangeStart: string;
    rangeEnd: string;
    total: number;
    wins: number;
    passes: number;
    mostProvenQuest: string | null;
  };
  statsSummary: {
    totalProof: number;
    overallWinRate: number | null;
    strongestQuest: string | null;
    needsAttentionQuest: string | null;
    weeklyTrend: string;
  };
  momentum: {
    score: number;
    tier: string;
    longestStreakEver: number;
    atRiskCount: number;
  } | null;
  suggestions: {
    type: "archive" | "reword" | "restore";
    questTitle: string;
    reason: string;
  }[];
  journal: {
    localDate: string;
    body: string;
  }[];
  stories: {
    weekStart: string;
    weekEnd: string;
    title: string;
    summary: string;
    nextQuest: string;
  }[];
  latestIdentitySnapshot: {
    periodEnd: string;
    identityStatement: string;
  } | null;
};

export function truncateCoachText(value: string | null | undefined) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");

  if (text.length <= coachTextLimit) {
    return text;
  }

  return `${text.slice(0, coachTextLimit - 1).trim()}…`;
}

export function compressPulseCoachContext(
  context: PulseCoachContext,
): PulseCoachContext {
  return {
    ...context,
    recentProof: context.recentProof
      .slice(0, coachRecentProofLimit)
      .map((entry) => ({
        ...entry,
        note: entry.note ? truncateCoachText(entry.note) : null,
      })),
    journal: context.journal.slice(0, coachJournalLimit).map((entry) => ({
      ...entry,
      body: truncateCoachText(entry.body),
    })),
    stories: context.stories.slice(0, coachStoryLimit).map((story) => ({
      ...story,
      summary: truncateCoachText(story.summary),
      nextQuest: truncateCoachText(story.nextQuest),
    })),
    latestIdentitySnapshot: context.latestIdentitySnapshot
      ? {
          ...context.latestIdentitySnapshot,
          identityStatement: truncateCoachText(
            context.latestIdentitySnapshot.identityStatement,
          ),
        }
      : null,
  };
}

export function buildPulseCoachSystemPrompt(rawContext: PulseCoachContext) {
  const context = compressPulseCoachContext(rawContext);

  if (!context.isSetupComplete || !context.character) {
    return [
      "You are Pulse Coach, the identity-first assistant inside Pulse.",
      "The user has not created a Character yet.",
      "Help them create a Character and 1-3 small Quests. Keep the tone calm, concrete, and non-shaming.",
      "You may propose creating Quests, but every write action must be confirmed by the user in the UI.",
    ].join("\n");
  }

  return [
    "You are Pulse Coach, the identity-first AI companion inside Pulse.",
    "Your job is to reason over the user's actual Pulse habit context and help them choose one concrete next move.",
    "",
    "Behavior rules:",
    "- Ground advice in the provided Pulse context. Name relevant Quests, exact dates, Proof counts, Momentum, Suggestions, Journal entries, and Stories when useful.",
    "- Avoid shame, therapy/medical claims, moralizing, and streak worship. Treat Wins and Passes as useful proof, not judgment.",
    "- Prefer concise, specific answers. End with one small next action unless the user asks for analysis.",
    "- Ask a clarifying question only when the answer cannot be inferred from context.",
    "- Never claim you changed Pulse data unless a confirmed action result appears in the conversation.",
    "- If a write would help, call a proposal tool. The user must confirm before Pulse changes anything.",
    "- Internal ids in square brackets are private tool handles. Use them only for proposal tool calls. Never reveal ids, UUIDs, database keys, API keys, access tokens, emails, or other private identifiers in user-facing text.",
    "- Format answers in Markdown with short headings, bold key Quest names/numbers/dates, and compact bullets.",
    "- Use 1-3 meaningful emojis when they help the answer feel warm or playful. Do not overdo it.",
    "- It is okay to be lightly funny and conversational, but never sarcastic, dismissive, or distracting.",
    "- For recommendation answers, prefer this shape: a heading, a bold direct answer, 2-4 evidence bullets, and one bold next action.",
    "",
    "Available confirmed action categories: create/edit/archive/restore Quests, save today's Check-ins, and save Journal entries.",
    "Do not propose deleting Proof, editing historical Proof, or generating Weekly Stories in v1.",
    "Private ids below are for tool calls only. User-facing replies must refer to Quests by title, never by id.",
    "",
    `Today: ${context.today}`,
    `Character: ${context.character.name}`,
    "",
    "Active Quests:",
    formatLines(
      context.activeQuests.map((quest) => {
        const todayStatus = quest.todayOutcome
          ? `${quest.todayOutcome.toUpperCase()} today${quest.todayNote ? ` (${truncateCoachText(quest.todayNote)})` : ""}`
          : "not checked in today";
        return `${quest.title} [id:${quest.id}] - ${todayStatus}; 30d ${quest.wins30d}W/${quest.passes30d}P; last ${quest.lastCheckInDate ?? "none"}; streak ${quest.currentStreak}, longest ${quest.longestStreak}${quest.isAtRisk ? "; at risk" : ""}`;
      }),
    ),
    "",
    "Archived Quests:",
    formatLines(
      context.archivedQuests.map(
        (quest) =>
          `${quest.title} [id:${quest.id}] - ${quest.proofCount} Proof, ${quest.winCount} Wins, archived ${quest.archivedAt ?? "unknown"}`,
      ),
    ),
    "",
    `90-day Proof: ${context.proofSummary.total} total, ${context.proofSummary.wins} Wins, ${context.proofSummary.passes} Passes, range ${context.proofSummary.rangeStart} to ${context.proofSummary.rangeEnd}, most-proven ${context.proofSummary.mostProvenQuest ?? "none"}.`,
    `Stats: ${context.statsSummary.totalProof} Proof in 12 weeks; win rate ${formatRate(context.statsSummary.overallWinRate)}; strongest ${context.statsSummary.strongestQuest ?? "none"}; needs attention ${context.statsSummary.needsAttentionQuest ?? "none"}; weekly trend ${context.statsSummary.weeklyTrend}.`,
    context.latestIdentitySnapshot
      ? `Latest identity snapshot: ${context.latestIdentitySnapshot.identityStatement} (through ${context.latestIdentitySnapshot.periodEnd}).`
      : "Latest identity snapshot: none.",
    context.momentum
      ? `Momentum: ${context.momentum.score}/100 (${context.momentum.tier}); longest streak ${context.momentum.longestStreakEver}; ${context.momentum.atRiskCount} at risk.`
      : "Momentum: no active Quest signal yet.",
    "",
    "Adaptive Suggestions:",
    formatLines(
      context.suggestions.map(
        (suggestion) =>
          `${suggestion.type}: ${suggestion.questTitle} - ${suggestion.reason}`,
      ),
    ),
    "",
    "Recent Proof:",
    formatLines(
      context.recentProof.map(
        (entry) =>
          `${entry.localDate}: ${entry.questTitle} = ${entry.outcome.toUpperCase()}${entry.note ? ` (${entry.note})` : ""}`,
      ),
    ),
    "",
    "Recent Journal:",
    formatLines(
      context.journal.map((entry) => `${entry.localDate}: ${entry.body}`),
    ),
    "",
    "Recent Weekly Stories:",
    formatLines(
      context.stories.map(
        (story) =>
          `${story.weekStart}-${story.weekEnd}: ${story.title}; ${story.summary}; next ${story.nextQuest}`,
      ),
    ),
  ].join("\n");
}

function formatLines(lines: string[]) {
  return lines.length > 0
    ? lines.map((line) => `- ${line}`).join("\n")
    : "- none";
}

function formatRate(value: number | null) {
  return value === null ? "not enough data" : `${value}%`;
}
