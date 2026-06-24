import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildIdentityPrompt,
  buildIdentityRange,
  computeIdentityData,
  identityMaxPromptJournals,
  identityMaxPromptProof,
  identityPromptJournalChars,
  identityPromptProofNoteChars,
  identitySnapshotModel,
  type IdentityCheckInInput,
  type IdentityJournalInput,
  type IdentityQuestInput,
  type IdentityStoryInput,
} from "@/lib/pulse/identity-core";

const quests: IdentityQuestInput[] = [
  { id: "quest-1", title: "Ship one useful thing", status: "active", position: 0 },
  { id: "quest-2", title: "Evening walk", status: "archived", position: 1 },
];

function proof(
  id: string,
  questId: string,
  localDate: string,
  outcome: "win" | "pass" = "win",
  note = "Useful proof note.",
): IdentityCheckInInput {
  return {
    id,
    questId,
    questTitle:
      questId === "quest-1" ? "Ship one useful thing" : "Evening walk",
    localDate,
    outcome,
    note,
  };
}

const stories: IdentityStoryInput[] = [
  {
    id: "story-1",
    weekStart: "2026-06-01",
    weekEnd: "2026-06-07",
    title: "The week you kept returning",
    summary: "You kept finding a smaller door back in.",
    patternBullets: [
      "You restarted quickly after drift.",
      "You protected small shipping blocks.",
    ],
  },
];

describe("computeIdentityData", () => {
  it("uses the configured snapshot model", () => {
    assert.equal(identitySnapshotModel, "openai/gpt-5.4-nano");
  });

  it("detects milestones, comebacks, themes, weekly groups, and archived signals", () => {
    const checkIns = [
      proof("proof-1", "quest-1", "2026-05-20"),
      proof("proof-2", "quest-1", "2026-05-21"),
      proof("proof-3", "quest-2", "2026-05-22", "pass"),
      proof("proof-4", "quest-1", "2026-06-03"),
      proof("proof-5", "quest-1", "2026-06-04"),
      proof("proof-6", "quest-1", "2026-06-05"),
      proof("proof-7", "quest-1", "2026-06-06"),
      proof("proof-8", "quest-1", "2026-06-07"),
      proof("proof-9", "quest-1", "2026-06-08"),
      proof("proof-10", "quest-1", "2026-06-09"),
    ];
    const data = computeIdentityData({
      checkIns,
      journals: [
        {
          id: "journal-1",
          localDate: "2026-06-04",
          body: "I noticed that smaller starts help.",
        },
      ],
      quests,
      range: buildIdentityRange("2026-06-10", 30),
      stories,
    });

    assert.ok(
      data.milestones.some((milestone) => milestone.kind === "first-proof"),
    );
    assert.ok(
      data.milestones.some((milestone) => milestone.kind === "proof-threshold"),
    );
    assert.ok(data.milestones.some((milestone) => milestone.kind === "comeback"));
    assert.ok(
      data.milestones.some((milestone) => milestone.kind === "strongest-week"),
    );
    assert.ok(data.weeklyGroups.some((week) => week.proofCount > 0));
    assert.ok(data.themes.some((theme) => /restarted/i.test(theme.label)));
    assert.ok(
      data.signals.some(
        (signal) =>
          signal.questTitle === "Evening walk" &&
          signal.questStatus === "archived" &&
          signal.proofCount === 1,
      ),
    );
    assert.ok(data.nodes.some((node) => node.kind === "journal"));
  });

  it("returns a useful empty state without throwing", () => {
    const data = computeIdentityData({
      checkIns: [],
      journals: [],
      quests,
      range: buildIdentityRange("2026-06-10", 30),
      stories: [],
    });

    assert.equal(data.milestones.length, 0);
    assert.equal(data.themes.length, 0);
    assert.ok(data.fallbackSnapshot.identityStatement.length > 0);
    assert.ok(data.signals.some((signal) => signal.proofCount === 0));
  });
});

describe("buildIdentityPrompt", () => {
  it("bounds source material and omits private database ids", () => {
    const checkIns = Array.from({ length: identityMaxPromptProof + 5 }, (_, i) =>
      proof(
        `private-proof-${i}`,
        "quest-1",
        `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
        "win",
        "x".repeat(identityPromptProofNoteChars + 80),
      ),
    );
    const journals: IdentityJournalInput[] = Array.from(
      { length: identityMaxPromptJournals + 3 },
      (_, i) => ({
        id: `private-journal-${i}`,
        localDate: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
        body: "j".repeat(identityPromptJournalChars + 80),
      }),
    );
    const data = computeIdentityData({
      checkIns,
      journals,
      quests,
      range: buildIdentityRange("2026-06-28", 90),
      stories,
    });
    const prompt = buildIdentityPrompt({
      characterName: "Builder",
      checkIns,
      journals,
      range: data.range,
      signals: data.signals,
      stories,
      themes: data.themes,
    });

    assert.doesNotMatch(prompt, /private-proof-/);
    assert.doesNotMatch(prompt, /private-journal-/);
    assert.match(prompt, /Do not diagnose/);
    assert.ok(prompt.length < 30_000);
  });
});
