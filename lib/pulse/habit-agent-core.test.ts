import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDeleteHabitProposal,
  buildHabitAgentSystemPrompt,
  habitAgentActionSchema,
  habitAgentModel,
  type HabitAgentContext,
  type HabitAgentHabit,
} from "@/lib/pulse/habit-agent-core";

function makeHabit(overrides: Partial<HabitAgentHabit> = {}): HabitAgentHabit {
  return {
    id: "quest-1",
    title: "Write 500 words",
    status: "active",
    proofCount: 0,
    winCount: 0,
    passCount: 0,
    lastCheckInDate: null,
    archivedAt: null,
    ...overrides,
  };
}

function makeContext(): HabitAgentContext {
  return {
    today: "2026-06-12",
    activeQuestLimit: 12,
    character: {
      id: "character-1",
      name: "Builder",
    },
    activeHabits: [
      makeHabit({
        id: "quest-1",
        proofCount: 3,
        winCount: 2,
        passCount: 1,
        lastCheckInDate: "2026-06-11",
      }),
    ],
    archivedHabits: [
      makeHabit({
        id: "quest-2",
        title: "Evening walk",
        status: "archived",
        proofCount: 9,
        winCount: 7,
        passCount: 2,
        lastCheckInDate: "2026-05-30",
        archivedAt: "2026-06-01",
      }),
    ],
    suggestions: [
      {
        type: "reword",
        questTitle: "Write 500 words",
        reason: "Low win rate in the last 30 days.",
      },
    ],
  };
}

describe("habitAgentActionSchema", () => {
  it("uses the direct OpenAI Habit Agent model", () => {
    assert.equal(habitAgentModel, "gpt-5.4-nano");
  });

  it("accepts habit operations and rejects non-habit actions", () => {
    for (const action of [
      { type: "createHabit", title: "Read 10 pages" },
      {
        type: "updateHabit",
        questId: "quest-1",
        title: "Write one paragraph",
      },
      { type: "archiveHabit", questId: "quest-1" },
      { type: "restoreHabit", questId: "quest-2" },
      { type: "deleteHabit", questId: "quest-3" },
    ]) {
      assert.equal(habitAgentActionSchema.safeParse(action).success, true);
    }

    for (const action of [
      {
        type: "saveCheckIn",
        questId: "quest-1",
        outcome: "win",
        localDate: "2026-06-12",
      },
      { type: "saveJournal", localDate: "2026-06-12", body: "Done." },
      { type: "deleteProof", checkInId: "check-in-1" },
      { type: "generateWeeklyStory" },
    ]) {
      assert.equal(habitAgentActionSchema.safeParse(action).success, false);
    }
  });
});

describe("buildHabitAgentSystemPrompt", () => {
  it("includes confirmation-only and delete safety rules", () => {
    const prompt = buildHabitAgentSystemPrompt(makeContext());

    assert.match(prompt, /Habit Agent/);
    assert.match(prompt, /Character: Builder/);
    assert.match(prompt, /Write 500 words \[id:quest-1\]/);
    assert.match(prompt, /The user must confirm each card/);
    assert.match(prompt, /Never claim you created, updated, archived/);
    assert.match(prompt, /Delete is only valid for habits with zero Proof/);
    assert.match(prompt, /propose archiving it instead/);
    assert.match(prompt, /do not create a card/);
    assert.match(prompt, /Do not propose Check-ins, Journal entries/);
    assert.match(prompt, /Never reveal ids, UUIDs/);
  });
});

describe("buildDeleteHabitProposal", () => {
  it("returns deleteHabit for zero-Proof habits", () => {
    const proposal = buildDeleteHabitProposal(
      makeHabit({ proofCount: 0, status: "active" }),
    );

    assert.equal(proposal?.action.type, "deleteHabit");
  });

  it("returns archiveHabit for active habits with Proof", () => {
    const proposal = buildDeleteHabitProposal(
      makeHabit({ proofCount: 4, status: "active" }),
    );

    assert.equal(proposal?.action.type, "archiveHabit");
  });

  it("refuses a mutation card for archived habits with Proof", () => {
    const proposal = buildDeleteHabitProposal(
      makeHabit({ proofCount: 4, status: "archived" }),
    );

    assert.equal(proposal, null);
  });
});
