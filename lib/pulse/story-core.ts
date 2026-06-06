export type StoryPromptProof = {
  localDate: string;
  outcome: "win" | "pass";
  note: string | null;
  questTitle: string;
};

export type StoryPromptJournalReflection = {
  localDate: string;
  body: string;
};

export type StoryPromptWeekRange = {
  start: string;
  end: string;
};

export function buildWeeklyStoryPrompt({
  characterName,
  journal = [],
  proof,
  quests,
  week,
}: {
  characterName: string;
  journal?: StoryPromptJournalReflection[];
  proof: StoryPromptProof[];
  quests: string[];
  week: StoryPromptWeekRange;
}) {
  const proofLines = proof
    .map((entry) => {
      const note = entry.note ? ` Note: ${entry.note}` : "";
      return `- ${entry.localDate}: ${entry.questTitle} = ${entry.outcome.toUpperCase()}.${note}`;
    })
    .join("\n");
  const journalSection =
    journal.length > 0
      ? `\n\nJournal reflections from this week:\n${journal
          .map((entry) => `- ${entry.localDate}: ${entry.body}`)
          .join("\n")}`
      : "";

  return `Write a Weekly Story for a Pulse user.

Character: ${characterName}
Week: ${week.start} through ${week.end}
Active quests: ${quests.join(", ")}

Proof from this week:
${proofLines || "- No Check-ins saved this week."}${journalSection}

Return a concise, emotionally intelligent reflection with:
- a title that sounds like a weekly letter, not a metric report
- a one-sentence summary
- a letter body in second person, 2-4 short paragraphs
- 2-4 pattern bullets grounded in the provided proof
- one next-week quest recommendation that is small and concrete`;
}
