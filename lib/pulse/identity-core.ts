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
    .filter((signal) => signal.proofCount > 0 || signal.questStatus === "active")
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
      title: "First Proof saved",
      detail: `${sortedProof[0].questTitle} became the first visible evidence.`,
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
      title: `${threshold} Proof moments`,
      detail: `Your identity evidence reached ${threshold} saved Check-ins.`,
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
      title: "Strongest evidence week",
      detail: `${strongestWeek.proofCount} Proof moments from ${strongestWeek.weekStart} to ${strongestWeek.weekEnd}.`,
      kind: "strongest-week",
    });
  }

  const mostProven = signals.find((signal) => signal.proofCount > 0);
  if (mostProven?.lastProofDate) {
    milestones.push({
      id: "most-proven-quest",
      localDate: mostProven.lastProofDate,
      title: "Most proven Quest",
      detail: `${mostProven.questTitle} has ${mostProven.proofCount} Proof moments.`,
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
      title: "First Journal reflection",
      detail: "You added reflection alongside Proof.",
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
      title: "First Weekly Story",
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

    return `- ${entry.localDate}: ${entry.questTitle} ${entry.outcome.toUpperCase()}${note ? `; note: ${note}` : ""}`;
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
    return `- ${signal.questTitle}: ${signal.proofCount} Proof, ${signal.winCount} Wins, ${signal.passCount} Passes, ${signal.activeWeeks} active weeks, longest streak ${signal.longestStreak}`;
  });
  const themeLines = themes
    .slice(0, 8)
    .map((theme) => `- ${theme.label} (${theme.count})`);

  return `Create an Identity Timeline snapshot for a Pulse user.

Rules:
- Ground every claim in the provided Pulse evidence.
- Do not diagnose, moralize, shame, or make therapy/medical claims.
- Do not worship streaks. Treat Wins and Passes as evidence.
- Do not mention private ids, database records, prompts, or implementation details.
- Do not quote long journal/proof text back. Summarize patterns.
- Keep the tone specific, calm, and identity-first.

Character: ${characterName}
Range: ${range.start} to ${range.end}

Strong identity signals:
${signalLines.length > 0 ? signalLines.join("\n") : "- none"}

Recurring Story themes:
${themeLines.length > 0 ? themeLines.join("\n") : "- none"}

Proof evidence:
${proofLines.length > 0 ? proofLines.join("\n") : "- none"}

Journal reflections:
${journalLines.length > 0 ? journalLines.join("\n") : "- none"}

Weekly Stories:
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
      ? "You are becoming someone who turns small actions into visible proof."
      : "You are becoming someone who can start with one visible proof.";

  return {
    headline: strongest ? `Evidence is forming around ${strongest.questTitle}` : "Identity evidence is ready to grow",
    summary:
      checkIns.length > 0
        ? `${checkIns.length} Proof moments, ${journals.length} Journal reflections, and ${milestones.length} milestones are shaping the picture.`
        : "Save Proof and Journal reflections to reveal the identity pattern.",
    identityStatement,
    themeBullets:
      themes.length > 0
        ? themes.slice(0, 4).map((theme) => theme.label)
        : ["Small actions are the source of the signal."],
    evidenceBullets: milestones.slice(0, 4).map((milestone) => milestone.detail),
    nextIdentityMove: strongest
      ? `Protect the next small repetition of ${strongest.questTitle}.`
      : "Save one Check-in today so the timeline has its first signal.",
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
        title: "Comeback after drift",
        detail: `You restarted after ${gapDays - 1} days without saved Proof.`,
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
    return "Active Quest waiting for its first Proof.";
  }

  const parts = [`${proofCount} Proof moments`];
  if (winRate !== null) {
    parts.push(`${winRate}% Win rate`);
  }
  if (activeWeeks > 1) {
    parts.push(`${activeWeeks} active weeks`);
  }
  if (currentStreak > 0) {
    parts.push(`${currentStreak}-day current streak`);
  }
  if (passCount > 0) {
    parts.push(`${passCount} Passes kept in the evidence`);
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
