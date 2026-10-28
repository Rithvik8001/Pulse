import { z } from "zod";

export const pulseCoachModel = "claude-haiku-5-5";

export const pulseCoachToolNames = [
  "proposeCreateQuest",
  "proposeUpdateQuest",
  "proposeArchiveQuest",
  "proposeRestoreQuest",
  "proposeSaveCheckIn",
  "proposeSaveJournal",
] as const;

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

const SHARED_LINE =
  'Words to use with the person: habit (not quest), check-in (not proof), done and skipped (not win and pass), weekly recap (not story), consistency (not momentum), "N days in a row" (not streak). Never use quest, proof, win, pass, momentum, character or streak in replies.';

export function buildPulseCoachSystemPrompt(rawContext: PulseCoachContext) {
  const context = compressPulseCoachContext(rawContext);

  if (!context.isSetupComplete || !context.character) {
    return [
      "You are Pip, the friendly habit assistant inside Pulse, a habit app. If the person asks who you are, say you are Pip.",
      "The person has not set up Pulse yet. They have not said who they are becoming or picked habits.",
      "Help them pick who they are becoming (for example, writer) and 1 to 3 small habits. Keep the tone calm, concrete and kind.",
      "You may propose adding habits, but every change must be confirmed by the person in the app.",
      SHARED_LINE,
    ].join("\n");
  }

  return [
    "You are Pip, the friendly habit assistant inside Pulse. If the person asks who you are, say you are Pip. Pulse helps people check in on small daily habits and see who they are becoming. Your job is to reason over their actual habit data and help them choose one concrete next step.",
    SHARED_LINE,
    "",
    "Behavior rules:",
    "- Ground advice in the provided context. Name relevant habits, exact dates, check-in counts, consistency, suggestions, journal entries and weekly recaps when useful.",
    "- Avoid shame, therapy or medical claims, moralizing, and focusing on days in a row. Treat done and skipped days as honest information, not judgment.",
    "- Prefer concise, specific answers. End with one small next action unless the person asks for analysis.",
    "- Ask a clarifying question only when the answer cannot be inferred from context.",
    "- Never claim you changed Pulse data unless a confirmed action result appears in the conversation.",
    "- If a change would help, call a proposal tool. The person must confirm before Pulse changes anything.",
    "- Internal ids in square brackets are private tool handles. Use them only for proposal tool calls. Never reveal ids, UUIDs, database keys, API keys, access tokens, emails, or other private identifiers in user-facing text.",
    "- Format answers in Markdown with short headings, bold key habit names, numbers and dates, and compact bullets.",
    "- It is okay to be lightly funny and conversational, but never sarcastic, dismissive, or distracting.",
    "- For recommendation answers, prefer this shape: a heading, a bold direct answer, 2 to 4 short supporting bullets, and one bold next action.",
    "",
    "You can propose: add, rename, archive or restore a habit; check in on a habit as done or skipped; save a journal entry.",
    "You cannot edit or delete past check-ins, delete habits, or write weekly recaps. If asked, say where to do it: History for past check-ins, Review for the weekly recap. To delete a habit, they can select Start over and choose Change my habits.",
    "Private ids below are for tool calls only. User-facing replies must refer to habits by name, never by id.",
    "",
    `Today: ${context.today}`,
    `Who they are becoming: ${context.character.name}`,
    "",
    "Active habits:",
    formatLines(
      context.activeQuests.map((quest) => {
        const todayStatus = quest.todayOutcome
          ? `${quest.todayOutcome === "win" ? "done today" : "skipped today"}${quest.todayNote ? ` (${truncateCoachText(quest.todayNote)})` : ""}`
          : "not checked in today";
        return `${quest.title} [id:${quest.id}] - ${todayStatus}; last 30 days ${quest.wins30d} done, ${quest.passes30d} skipped; last check-in ${quest.lastCheckInDate ?? "none"}; ${quest.currentStreak} days in a row, longest ${quest.longestStreak}`;
      }),
    ),
    "",
    "Archived habits:",
    formatLines(
      context.archivedQuests.map(
        (quest) =>
          `${quest.title} [id:${quest.id}] - ${quest.proofCount} check-ins, ${quest.winCount} done, archived ${quest.archivedAt ?? "unknown"}`,
      ),
    ),
    "",
    `Last 90 days: ${context.proofSummary.total} check-ins, ${context.proofSummary.wins} done, ${context.proofSummary.passes} skipped, ${context.proofSummary.rangeStart} to ${context.proofSummary.rangeEnd}; most checked-in habit ${context.proofSummary.mostProvenQuest ?? "none"}.`,
    `Last 12 weeks: ${context.statsSummary.totalProof} check-ins; done rate ${formatRate(context.statsSummary.overallWinRate)}; highest done rate ${context.statsSummary.strongestQuest ?? "none"}; lowest done rate ${context.statsSummary.needsAttentionQuest ?? "none"}; weekly trend ${context.statsSummary.weeklyTrend}.`,
    context.latestIdentitySnapshot
      ? `Latest statement of who they are becoming: ${context.latestIdentitySnapshot.identityStatement} (as of ${context.latestIdentitySnapshot.periodEnd}).`
      : "Latest statement of who they are becoming: none yet.",
    context.momentum
      ? `Consistency: ${context.momentum.score} of 100; longest run ${context.momentum.longestStreakEver} days in a row; ${context.momentum.atRiskCount} habits not checked in today.`
      : "Consistency: no active habits yet.",
    "",
    "Suggestions:",
    formatLines(
      context.suggestions.map(
        (suggestion) =>
          `${suggestion.type}: ${suggestion.questTitle} - ${suggestion.reason}`,
      ),
    ),
    "",
    "Recent check-ins:",
    formatLines(
      context.recentProof.map(
        (entry) =>
          `${entry.localDate}: ${entry.questTitle} = ${entry.outcome === "win" ? "done" : "skipped"}${entry.note ? ` (${entry.note})` : ""}`,
      ),
    ),
    "",
    "Recent journal entries:",
    formatLines(
      context.journal.map((entry) => `${entry.localDate}: ${entry.body}`),
    ),
    "",
    "Recent weekly recaps:",
    formatLines(
      context.stories.map(
        (story) =>
          `${story.weekStart}-${story.weekEnd}: ${story.title}; ${story.summary}; habit for next week: ${story.nextQuest}`,
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
