import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPulseCoachSystemPrompt,
  coachActionSchema,
  coachJournalLimit,
  coachRecentProofLimit,
  coachStoryLimit,
  compressPulseCoachContext,
  pulseCoachModel,
  type PulseCoachContext,
} from "@/lib/pulse/coach-core";

function makeContext(): PulseCoachContext {
  return {
    today: "2026-06-07",
    isSetupComplete: true,
    character: { id: "character-1", name: "Builder" },
    activeQuests: [
      {
        id: "quest-1",
        title: "Ship one useful thing",
        todayOutcome: "win",
        todayNote: "Opened the editor and finished the smallest slice.",
        proof30d: 8,
        wins30d: 6,
        passes30d: 2,
        lastCheckInDate: "2026-06-07",
        currentStreak: 4,
        longestStreak: 9,
        isAtRisk: false,
      },
    ],
    archivedQuests: [
      {
        id: "quest-2",
        title: "Evening walk",
        proofCount: 12,
        winCount: 9,
        archivedAt: "2026-05-30",
      },
    ],
    recentProof: [
      {
        localDate: "2026-06-07",
        questTitle: "Ship one useful thing",
        outcome: "win",
        note: "A useful proof note.",
      },
    ],
    proofSummary: {
      rangeStart: "2026-03-10",
      rangeEnd: "2026-06-07",
      total: 31,
      wins: 22,
      passes: 9,
      mostProvenQuest: "Ship one useful thing",
    },
    statsSummary: {
      totalProof: 31,
      overallWinRate: 71,
      strongestQuest: "Ship one useful thing",
      needsAttentionQuest: "Deep work",
      weeklyTrend: "May 18:70%, May 25:75%, Jun 1:80%",
    },
    momentum: {
      score: 78,
      tier: "On Fire",
      longestStreakEver: 9,
      atRiskCount: 1,
    },
    suggestions: [
      {
        type: "reword",
        questTitle: "Deep work",
        reason: "Under 30% wins in the last 30 days.",
      },
    ],
    journal: [
      {
        localDate: "2026-06-07",
        body: "Proof: shipped. Drift: checked phone. Next: start with one file.",
      },
    ],
    stories: [
      {
        weekStart: "2026-06-01",
        weekEnd: "2026-06-07",
        title: "The week you kept returning",
        summary: "You kept finding a smaller door back in.",
        nextQuest: "Open the work before opening messages.",
      },
    ],
  };
}

describe("buildPulseCoachSystemPrompt", () => {
  it("uses the AI Gateway Pulse Coach model", () => {
    assert.equal(pulseCoachModel, "openai/gpt-5.4-nano");
  });

  it("includes full Pulse context and proposal-only action rules", () => {
    const prompt = buildPulseCoachSystemPrompt(makeContext());

    assert.match(prompt, /Pulse Coach/);
    assert.match(prompt, /Character: Builder/);
    assert.match(prompt, /Ship one useful thing \[id:quest-1\]/);
    assert.match(prompt, /90-day Proof: 31 total, 22 Wins, 9 Passes/);
    assert.match(prompt, /Stats: 31 Proof in 12 weeks/);
    assert.match(prompt, /Momentum: 78\/100 \(On Fire\)/);
    assert.match(prompt, /Adaptive Suggestions/);
    assert.match(prompt, /Recent Journal/);
    assert.match(prompt, /Recent Weekly Stories/);
    assert.match(prompt, /The user must confirm before Pulse changes anything/);
    assert.match(prompt, /Never reveal ids, UUIDs, database keys/);
    assert.match(prompt, /refer to Quests by title, never by id/);
    assert.match(prompt, /Format answers in Markdown/);
    assert.match(prompt, /Use 1-3 meaningful emojis/);
  });

  it("handles incomplete setup without pretending actions can mutate safely", () => {
    const context = {
      ...makeContext(),
      isSetupComplete: false,
      character: null,
      activeQuests: [],
      archivedQuests: [],
    };
    const prompt = buildPulseCoachSystemPrompt(context);

    assert.match(prompt, /has not created a Character yet/);
    assert.match(prompt, /must be confirmed by the user/);
  });
});

describe("compressPulseCoachContext", () => {
  it("caps long context lists and trims long text fields", () => {
    const longText = "x".repeat(260);
    const context = {
      ...makeContext(),
      recentProof: Array.from(
        { length: coachRecentProofLimit + 3 },
        (_, i) => ({
          localDate: `2026-06-${String(i + 1).padStart(2, "0")}`,
          questTitle: "Quest",
          outcome: "win" as const,
          note: longText,
        }),
      ),
      journal: Array.from({ length: coachJournalLimit + 2 }, (_, i) => ({
        localDate: `2026-06-${String(i + 1).padStart(2, "0")}`,
        body: longText,
      })),
      stories: Array.from({ length: coachStoryLimit + 2 }, (_, i) => ({
        weekStart: `2026-05-${String(i + 1).padStart(2, "0")}`,
        weekEnd: `2026-05-${String(i + 7).padStart(2, "0")}`,
        title: "Story",
        summary: longText,
        nextQuest: longText,
      })),
    };

    const compressed = compressPulseCoachContext(context);

    assert.equal(compressed.recentProof.length, coachRecentProofLimit);
    assert.equal(compressed.journal.length, coachJournalLimit);
    assert.equal(compressed.stories.length, coachStoryLimit);
    assert.ok((compressed.recentProof[0].note?.length ?? 0) <= 180);
    assert.ok(compressed.journal[0].body.length <= 180);
    assert.ok(compressed.stories[0].summary.length <= 180);
  });
});

describe("coachActionSchema", () => {
  it("accepts core confirmed actions and rejects unsupported destructive actions", () => {
    assert.equal(
      coachActionSchema.safeParse({
        type: "saveCheckIn",
        questId: "quest-1",
        outcome: "win",
        localDate: "2026-06-07",
        note: "Done.",
      }).success,
      true,
    );
    assert.equal(
      coachActionSchema.safeParse({
        type: "deleteProof",
        checkInId: "check-in-1",
      }).success,
      false,
    );
  });
});
