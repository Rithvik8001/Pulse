import {
  formatLocalDate,
  offsetLocalDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";

export const identityDefaultWindowDays = 90;
export const identityAllWindowDays = 3650;
export const identitySnapshotModel = "openai/gpt-5.4-nano";
export const identityMaxPromptProof = 80;
export const identityMaxPromptProofNotes = 30;
export const identityMaxPromptJournals = 24;
export const identityMaxPromptStories = 10;
export const identityPromptProofNoteChars = 180;
export const identityPromptJournalChars = 300;

export type IdentityQuestInput = {
  id: string;
  title: string;
  status: "active" | "archived";
  position: number;
};

export type IdentityCheckInInput = {
  id: string;
  questId: string;
  questTitle: string;
  localDate: string;
  outcome: "win" | "pass";
  note: string | null;
};

export type IdentityJournalInput = {
  id: string;
  localDate: string;
  body: string;
};

export type IdentityStoryInput = {
  id: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  summary: string;
  patternBullets: string[];
};

export type IdentitySnapshotCore = {
  headline: string;
  summary: string;
  identityStatement: string;
  themeBullets: string[];
  evidenceBullets: string[];
  nextIdentityMove: string;
};

export type IdentityRange = {
  start: string;
  end: string;
  days: number;
};

export type IdentityEvidenceKind =
  | "proof"
  | "journal"
  | "story"
  | "milestone"
  | "signal";

export type IdentityEvidenceNode = {
  id: string;
  kind: IdentityEvidenceKind;
  localDate: string;
  title: string;
  detail: string;
  weight: number;
  questTitle?: string;
};

export type IdentityMilestone = {
  id: string;
  localDate: string;
  title: string;
  detail: string;
  kind:
    | "first-proof"
    | "proof-threshold"
    | "comeback"
    | "strongest-week"
    | "most-proven-quest"
    | "first-journal"
    | "first-story";
};

export type IdentitySignal = {
  questId: string;
  questTitle: string;
  questStatus: "active" | "archived";
  proofCount: number;
  winCount: number;
  passCount: number;
  winRate: number | null;
  proofNoteCount: number;
  currentStreak: number;
  longestStreak: number;
  activeWeeks: number;
  lastProofDate: string | null;
  score: number;
  reason: string;
};

export type IdentityTheme = {
  label: string;
  count: number;
  source: "story";
};

export type IdentityWeeklyGroup = {
  weekStart: string;
  weekEnd: string;
  label: string;
  proofCount: number;
  winCount: number;
  passCount: number;
  journalCount: number;
  storyCount: number;
};

export type IdentityComputedData = {
  range: IdentityRange;
  nodes: IdentityEvidenceNode[];
  milestones: IdentityMilestone[];
  signals: IdentitySignal[];
  themes: IdentityTheme[];
  weeklyGroups: IdentityWeeklyGroup[];
  fallbackSnapshot: IdentitySnapshotCore;
};

export function buildIdentityRange(
  today: string,
  days = identityDefaultWindowDays,
): IdentityRange {
  return {
    start: offsetLocalDate(today, -(days - 1)),
    end: today,
    days,
  };
}

export function computeIdentityData({
  checkIns,
  journals,
  quests,
  range,
  stories,
}: {
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  quests: IdentityQuestInput[];
  range: IdentityRange;
  stories: IdentityStoryInput[];
}): IdentityComputedData {
  const rangeCheckIns = checkIns.filter((entry) =>
    isInRange(entry.localDate, range),
  );
  const rangeJournals = journals.filter((entry) =>
    isInRange(entry.localDate, range),
  );
  const rangeStories = stories.filter((story) =>
    isInRange(story.weekStart, range),
  );
  const weeklyGroups = buildWeeklyGroups({
    checkIns: rangeCheckIns,
    journals: rangeJournals,
    range,
    stories: rangeStories,
  });
  const signals = buildIdentitySignals({
    checkIns: rangeCheckIns,
    quests,
    today: range.end,
  });
  const milestones = buildIdentityMilestones({
    checkIns: rangeCheckIns,
    journals: rangeJournals,
    signals,
    stories: rangeStories,
    weeklyGroups,
  });
  const themes = extractStoryThemes(rangeStories);
  const nodes = buildIdentityEvidenceNodes({
    journals: rangeJournals,
    milestones,
    signals,
    stories: rangeStories,
    weeklyGroups,
  });

  return {
    range,
    nodes,
    milestones,
    signals,
    themes,
    weeklyGroups,
    fallbackSnapshot: buildFallbackSnapshot({
      checkIns: rangeCheckIns,
      journals: rangeJournals,
      milestones,
      signals,
      themes,
    }),
  };
}

export function buildIdentitySignals({
  checkIns,
  quests,
  today,
}: {
  checkIns: IdentityCheckInInput[];
  quests: IdentityQuestInput[];
  today: string;
}): IdentitySignal[] {
  const byQuest = new Map<
    string,
    {
      proofCount: number;
      winCount: number;
      passCount: number;
      proofNoteCount: number;
      dates: Set<string>;
      weeks: Set<string>;
      lastProofDate: string | null;
    }
  >();

  for (const quest of quests) {
    byQuest.set(quest.id, {
      proofCount: 0,
      winCount: 0,
      passCount: 0,
      proofNoteCount: 0,
      dates: new Set(),
      weeks: new Set(),
      lastProofDate: null,
    });
  }

  for (const entry of checkIns) {
    const bucket = byQuest.get(entry.questId);
    if (!bucket) {
      continue;
    }

    bucket.proofCount += 1;
    if (entry.outcome === "pass") {
      bucket.passCount += 1;
    } else {
      bucket.winCount += 1;
    }
    if (entry.note?.trim()) {
      bucket.proofNoteCount += 1;
    }
    bucket.dates.add(entry.localDate);
    bucket.weeks.add(getWeekStart(entry.localDate));
    bucket.lastProofDate =
      bucket.lastProofDate === null || entry.localDate > bucket.lastProofDate
        ? entry.localDate
        : bucket.lastProofDate;
  }

  return quests
    .map((quest) => {
      const bucket = byQuest.get(quest.id);
      const proofCount = bucket?.proofCount ?? 0;
      const winCount = bucket?.winCount ?? 0;
      const passCount = bucket?.passCount ?? 0;
      const sortedDates = [...(bucket?.dates ?? new Set<string>())].sort();
      const currentStreak = computeCurrentStreak(new Set(sortedDates), today);
      const longestStreak = computeLongestStreak(sortedDates);
      const winRate =
        proofCount > 0 ? Math.round((winCount / proofCount) * 100) : null;
      const activeWeeks = bucket?.weeks.size ?? 0;
      const proofNoteCount = bucket?.proofNoteCount ?? 0;
      const score = Math.round(
        proofCount * 3 +
          winCount * 2 +
          passCount +
          activeWeeks * 4 +
          proofNoteCount * 1.5 +
          longestStreak * 2 +
          currentStreak * 3,
      );

      return {
        questId: quest.id,
        questTitle: quest.title,
        questStatus: quest.status,
        proofCount,
        winCount,
        passCount,
        winRate,
        proofNoteCount,
        currentStreak,
        longestStreak,
        activeWeeks,
        lastProofDate: bucket?.lastProofDate ?? null,
        score,
        reason: buildSignalReason({
          activeWeeks,
          currentStreak,
          passCount,
          proofCount,
          proofNoteCount,
          winRate,
        }),
      };
    })
    .filter(
      (signal) => signal.proofCount > 0 || signal.questStatus === "active",
    )
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.questTitle.localeCompare(second.questTitle);
    });
}

export function buildIdentityMilestones({
  checkIns,
  journals,
  signals,
  stories,
  weeklyGroups,
}: {
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  signals: IdentitySignal[];
  stories: IdentityStoryInput[];
  weeklyGroups: IdentityWeeklyGroup[];
}): IdentityMilestone[] {
  const milestones: IdentityMilestone[] = [];
  const sortedProof = [...checkIns].sort((first, second) =>
    first.localDate.localeCompare(second.localDate),
  );

  if (sortedProof[0]) {
    milestones.push({
      id: "first-proof",
      localDate: sortedProof[0].localDate,
      title: "First check-in",
      detail: `${sortedProof[0].questTitle} was your first check-in.`,
      kind: "first-proof",
    });
  }

  for (const threshold of [10, 25, 50, 100, 200, 365]) {
    const entry = sortedProof[threshold - 1];
    if (!entry) {
      continue;
    }
    milestones.push({
      id: `proof-${threshold}`,
      localDate: entry.localDate,
      title: `${threshold} check-ins`,
      detail: `You reached ${threshold} check-ins.`,
      kind: "proof-threshold",
    });
  }

  const comeback = findComebackMilestone(sortedProof);
  if (comeback) {
    milestones.push(comeback);
  }

  const strongestWeek = [...weeklyGroups]
    .filter((week) => week.proofCount > 0)
    .sort((first, second) => {
      if (second.proofCount !== first.proofCount) {
        return second.proofCount - first.proofCount;
      }
      return second.winCount - first.winCount;
    })[0];
  if (strongestWeek) {
    milestones.push({
      id: "strongest-week",
      localDate: strongestWeek.weekStart,
      title: "Busiest week",
      detail: `${strongestWeek.proofCount} ${strongestWeek.proofCount === 1 ? "check-in" : "check-ins"} in one week.`,
      kind: "strongest-week",
    });
  }

  const mostProven = signals.find((signal) => signal.proofCount > 0);
  if (mostProven?.lastProofDate) {
    milestones.push({
      id: "most-proven-quest",
      localDate: mostProven.lastProofDate,
      title: "Most checked-in habit",
      detail: `${mostProven.questTitle}: ${mostProven.proofCount} ${mostProven.proofCount === 1 ? "check-in" : "check-ins"}.`,
      kind: "most-proven-quest",
    });
  }

  const firstJournal = [...journals].sort((first, second) =>
    first.localDate.localeCompare(second.localDate),
  )[0];
  if (firstJournal) {
    milestones.push({
      id: "first-journal",
      localDate: firstJournal.localDate,
      title: "First journal entry",
      detail: "You started writing next to your check-ins.",
      kind: "first-journal",
    });
  }

  const firstStory = [...stories].sort((first, second) =>
    first.weekStart.localeCompare(second.weekStart),
  )[0];
  if (firstStory) {
    milestones.push({
      id: "first-story",
      localDate: firstStory.weekStart,
      title: "First weekly recap",
      detail: firstStory.title,
      kind: "first-story",
    });
  }

  return milestones.sort((first, second) =>
    second.localDate.localeCompare(first.localDate),
  );
}

export function buildWeeklyGroups({
  checkIns,
  journals,
  range,
  stories,
}: {
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  range: IdentityRange;
  stories: IdentityStoryInput[];
}): IdentityWeeklyGroup[] {
  const groups = new Map<string, IdentityWeeklyGroup>();
  let cursor = getWeekStart(range.start);
  const lastWeek = getWeekStart(range.end);

  while (cursor <= lastWeek) {
    const weekEnd = offsetLocalDate(cursor, 6);
    groups.set(cursor, {
      weekStart: cursor,
      weekEnd,
      label: formatWeekLabel(cursor),
      proofCount: 0,
      winCount: 0,
      passCount: 0,
      journalCount: 0,
      storyCount: 0,
    });
    cursor = offsetLocalDate(cursor, 7);
  }

  for (const entry of checkIns) {
    const group = groups.get(getWeekStart(entry.localDate));
    if (!group) {
      continue;
    }
    group.proofCount += 1;
    if (entry.outcome === "pass") {
      group.passCount += 1;
    } else {
      group.winCount += 1;
    }
  }

  for (const entry of journals) {
    const group = groups.get(getWeekStart(entry.localDate));
    if (group) {
      group.journalCount += 1;
    }
  }

  for (const story of stories) {
    const group = groups.get(getWeekStart(story.weekStart));
    if (group) {
      group.storyCount += 1;
    }
  }

  return [...groups.values()].filter(
    (group) =>
      group.proofCount > 0 || group.journalCount > 0 || group.storyCount > 0,
  );
}

export function extractStoryThemes(
  stories: IdentityStoryInput[],
): IdentityTheme[] {
  const themes = new Map<string, { label: string; count: number }>();

  for (const story of stories) {
    for (const bullet of story.patternBullets) {
      const label = normalizeThemeLabel(bullet);
      if (!label) {
        continue;
      }
      const key = label.toLocaleLowerCase();
      const theme = themes.get(key) ?? { label, count: 0 };
      theme.count += 1;
      themes.set(key, theme);
    }
  }

  return [...themes.values()]
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }
      return first.label.localeCompare(second.label);
    })
    .slice(0, 8)
    .map((theme) => ({ ...theme, source: "story" }));
}

const SHARED_LINE =
  'Words to use with the person: habit (not quest), check-in (not proof), done and skipped (not win and pass), weekly recap (not story), consistency (not momentum), "N days in a row" (not streak). Never use quest, proof, win, pass, momentum, character or streak in replies.';

export function buildIdentityPrompt({
  characterName,
  checkIns,
  journals,
  range,
  signals,
  stories,
  themes,
}: {
  characterName: string;
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  range: IdentityRange;
  signals: IdentitySignal[];
  stories: IdentityStoryInput[];
  themes: IdentityTheme[];
}) {
  const boundedProof = checkIns
    .slice()
    .sort((first, second) => second.localDate.localeCompare(first.localDate))
    .slice(0, identityMaxPromptProof);
  let noteCount = 0;
  const proofLines = boundedProof.map((entry) => {
    const note =
      entry.note && noteCount < identityMaxPromptProofNotes
        ? truncateIdentityText(entry.note, identityPromptProofNoteChars)
        : "";
    if (note) {
      noteCount += 1;
    }

    return `- ${entry.localDate}: ${entry.questTitle} ${entry.outcome === "win" ? "done" : "skipped"}${note ? `; note: ${note}` : ""}`;
  });
  const journalLines = journals
    .slice()
    .sort((first, second) => second.localDate.localeCompare(first.localDate))
    .slice(0, identityMaxPromptJournals)
    .map(
      (entry) =>
        `- ${entry.localDate}: ${truncateIdentityText(entry.body, identityPromptJournalChars)}`,
    );
  const storyLines = stories
    .slice()
    .sort((first, second) => second.weekStart.localeCompare(first.weekStart))
    .slice(0, identityMaxPromptStories)
    .map(
      (story) =>
        `- ${story.weekStart}-${story.weekEnd}: ${story.title}; summary: ${truncateIdentityText(story.summary, 220)}; patterns: ${story.patternBullets.map((bullet) => truncateIdentityText(bullet, 120)).join(" | ")}`,
    );
  const signalLines = signals.slice(0, 8).map((signal) => {
    return `- ${signal.questTitle}: ${signal.proofCount} check-ins, ${signal.winCount} done, ${signal.passCount} skipped, ${signal.activeWeeks} active weeks, longest run ${signal.longestStreak} days in a row`;
  });
  const themeLines = themes
    .slice(0, 8)
    .map((theme) => `- ${theme.label} (${theme.count})`);

  return `Describe who this Pulse user is becoming, based on their habit history.

Rules:
- Ground every claim in the data below.
- Do not diagnose, moralize, shame, or make therapy or medical claims.
- Do not focus on days in a row. Treat done and skipped days as honest evidence.
- Do not mention private ids, database records, prompts, or implementation details.
- Do not quote long journal or note text back. Summarize patterns.
- Keep the tone specific and calm.
- identityStatement must be one sentence that starts with "You are becoming someone who".
- ${SHARED_LINE}

Who they are becoming: ${characterName}
Range: ${range.start} to ${range.end}

Habit summaries:
${signalLines.length > 0 ? signalLines.join("\n") : "- none"}

Recurring patterns from weekly recaps:
${themeLines.length > 0 ? themeLines.join("\n") : "- none"}

Check-ins:
${proofLines.length > 0 ? proofLines.join("\n") : "- none"}

Journal entries:
${journalLines.length > 0 ? journalLines.join("\n") : "- none"}

Weekly recaps:
${storyLines.length > 0 ? storyLines.join("\n") : "- none"}

Return JSON matching the schema.`;
}

export function truncateIdentityText(value: string, maxLength: number) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function buildIdentityEvidenceNodes({
  journals,
  milestones,
  signals,
  stories,
  weeklyGroups,
}: {
  journals: IdentityJournalInput[];
  milestones: IdentityMilestone[];
  signals: IdentitySignal[];
  stories: IdentityStoryInput[];
  weeklyGroups: IdentityWeeklyGroup[];
}): IdentityEvidenceNode[] {
  const weeklyNodes = weeklyGroups.map((week) => ({
    id: `week-${week.weekStart}`,
    kind: "proof" as const,
    localDate: week.weekStart,
    title: `${week.proofCount} Proof this week`,
    detail: `${week.winCount} Wins, ${week.passCount} Passes${week.journalCount > 0 ? `, ${week.journalCount} Journal` : ""}.`,
    weight: Math.min(5, Math.max(1, week.proofCount)),
  }));
  const storyNodes = stories.map((story) => ({
    id: `story-${story.id}`,
    kind: "story" as const,
    localDate: story.weekStart,
    title: story.title,
    detail: story.summary,
    weight: 3,
  }));
  const journalNodes = journals.slice(-12).map((journal) => ({
    id: `journal-${journal.id}`,
    kind: "journal" as const,
    localDate: journal.localDate,
    title: "Journal reflection",
    detail: truncateIdentityText(journal.body, 150),
    weight: 2,
  }));
  const milestoneNodes = milestones.map((milestone) => ({
    id: `milestone-${milestone.id}`,
    kind: "milestone" as const,
    localDate: milestone.localDate,
    title: milestone.title,
    detail: milestone.detail,
    weight: 4,
  }));
  const signalNodes = signals.slice(0, 5).map((signal) => ({
    id: `signal-${signal.questId}`,
    kind: "signal" as const,
    localDate: signal.lastProofDate ?? "",
    title: signal.questTitle,
    detail: signal.reason,
    weight: Math.min(5, Math.max(2, Math.ceil(signal.score / 25))),
    questTitle: signal.questTitle,
  }));

  return [
    ...weeklyNodes,
    ...journalNodes,
    ...storyNodes,
    ...milestoneNodes,
    ...signalNodes,
  ]
    .filter((node) => node.localDate)
    .sort((first, second) => second.localDate.localeCompare(first.localDate))
    .slice(0, 48);
}

function buildFallbackSnapshot({
  checkIns,
  journals,
  milestones,
  signals,
  themes,
}: {
  checkIns: IdentityCheckInInput[];
  journals: IdentityJournalInput[];
  milestones: IdentityMilestone[];
  signals: IdentitySignal[];
  themes: IdentityTheme[];
}): IdentitySnapshotCore {
  const strongest = signals[0];
  const identityStatement = strongest
    ? `You are becoming someone who keeps showing up for ${strongest.questTitle}.`
    : checkIns.length > 0
      ? "You are becoming someone who turns small actions into habits."
      : "You are becoming someone who starts with one small step.";

  return {
    headline: strongest
      ? `A pattern is forming around ${strongest.questTitle}`
      : "Your picture is ready to grow",
    summary:
      checkIns.length > 0
        ? `${checkIns.length} ${checkIns.length === 1 ? "check-in" : "check-ins"}, ${journals.length} ${journals.length === 1 ? "journal entry" : "journal entries"} and ${milestones.length} ${milestones.length === 1 ? "milestone" : "milestones"} so far.`
        : "Check in and write in your journal to fill this in.",
    identityStatement,
    themeBullets:
      themes.length > 0
        ? themes.slice(0, 4).map((theme) => theme.label)
        : ["Small actions, repeated, are the whole picture."],
    evidenceBullets: milestones
      .slice(0, 4)
      .map((milestone) => milestone.detail),
    nextIdentityMove: strongest
      ? `Do ${strongest.questTitle} again the next time it comes up.`
      : "Check in once today to get started.",
  };
}

function findComebackMilestone(
  sortedProof: IdentityCheckInInput[],
): IdentityMilestone | null {
  const uniqueDates = [...new Set(sortedProof.map((entry) => entry.localDate))];

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = parseLocalDate(uniqueDates[index - 1]);
    const current = parseLocalDate(uniqueDates[index]);
    const gapDays = Math.round(
      (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (gapDays >= 7) {
      return {
        id: "comeback-after-gap",
        localDate: uniqueDates[index],
        title: "Came back after a break",
        detail: `You checked in again after ${gapDays - 1} days away.`,
        kind: "comeback",
      };
    }
  }

  return null;
}

function buildSignalReason({
  activeWeeks,
  currentStreak,
  passCount,
  proofCount,
  proofNoteCount,
  winRate,
}: {
  activeWeeks: number;
  currentStreak: number;
  passCount: number;
  proofCount: number;
  proofNoteCount: number;
  winRate: number | null;
}) {
  if (proofCount === 0) {
    return "No check-ins yet.";
  }

  const parts = [
    `${proofCount} ${proofCount === 1 ? "check-in" : "check-ins"}`,
  ];
  if (winRate !== null) {
    parts.push(`${winRate}% done`);
  }
  if (activeWeeks > 1) {
    parts.push(`${activeWeeks} active weeks`);
  }
  if (currentStreak > 0) {
    parts.push(
      `${currentStreak} ${currentStreak === 1 ? "day" : "days"} in a row`,
    );
  }
  if (passCount > 0) {
    parts.push(`${passCount} skipped`);
  }
  if (proofNoteCount > 0) {
    parts.push(`${proofNoteCount} notes`);
  }

  return parts.join(" · ");
}

function computeCurrentStreak(dateSet: Set<string>, today: string) {
  if (!dateSet.has(today)) {
    return 0;
  }

  let streak = 0;
  let cursor = today;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = offsetLocalDate(cursor, -1);
  }

  return streak;
}

function computeLongestStreak(sortedDates: string[]) {
  if (sortedDates.length === 0) {
    return 0;
  }

  let current = 1;
  let longest = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    if (sortedDates[index] === offsetLocalDate(sortedDates[index - 1], 1)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function getWeekStart(localDate: string) {
  const date = parseLocalDate(localDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);

  return formatLocalDate(date);
}

function formatWeekLabel(weekStart: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(parseLocalDate(weekStart));
}

function isInRange(localDate: string, range: IdentityRange) {
  return localDate >= range.start && localDate <= range.end;
}

function normalizeThemeLabel(value: string) {
  const text = value.trim().replace(/\s+/g, " ");

  if (!text) {
    return "";
  }

  return text.length > 120 ? `${text.slice(0, 119).trim()}...` : text;
}
