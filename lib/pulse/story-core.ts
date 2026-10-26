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

const SHARED_LINE =
  'Words to use with the person: habit (not quest), check-in (not proof), done and skipped (not win and pass), weekly recap (not story), consistency (not momentum), "N days in a row" (not streak). Never use quest, proof, win, pass, momentum, character or streak in replies.';

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
      return `- ${entry.localDate}: ${entry.questTitle}: ${entry.outcome === "win" ? "done" : "skipped"}.${note}`;
    })
    .join("\n");
  const journalSection =
    journal.length > 0
      ? `\n\nJournal entries this week:\n${journal
          .map((entry) => `- ${entry.localDate}: ${entry.body}`)
          .join("\n")}`
      : "";

  return `Write a weekly recap for a Pulse user.

${SHARED_LINE}

Who they are becoming: ${characterName}
Week: ${week.start} through ${week.end}
Active habits: ${quests.join(", ")}

Check-ins this week:
${proofLines || "- No check-ins this week."}${journalSection}

Return a concise, emotionally intelligent reflection with:
- a title that sounds like a weekly letter, not a metric report
- a one-sentence summary
- a letter body in second person, 2-4 short paragraphs
- 2-4 pattern bullets grounded in the check-ins and journal entries above
- one small, concrete habit to try next week`;
}
