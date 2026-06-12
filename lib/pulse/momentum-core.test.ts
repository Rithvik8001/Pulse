import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeMomentum } from "@/lib/pulse/momentum-core";

const activeQuests = [{ id: "quest-1", title: "Walk" }];

describe("computeMomentum", () => {
  it("counts the current streak when today has a win", () => {
    const momentum = computeMomentum(
      activeQuests,
      [
        { questId: "quest-1", localDate: "2026-06-10", outcome: "win" },
        { questId: "quest-1", localDate: "2026-06-11", outcome: "win" },
        { questId: "quest-1", localDate: "2026-06-12", outcome: "win" },
      ],
      "2026-06-12",
    );

    assert.equal(momentum.questStreaks[0]?.currentStreak, 3);
    assert.equal(momentum.questStreaks[0]?.isAtRisk, false);
  });

  it("marks a streak at risk when yesterday has Proof but today does not", () => {
    const momentum = computeMomentum(
      activeQuests,
      [
        { questId: "quest-1", localDate: "2026-06-10", outcome: "win" },
        { questId: "quest-1", localDate: "2026-06-11", outcome: "win" },
      ],
      "2026-06-12",
    );

    assert.equal(momentum.questStreaks[0]?.currentStreak, 2);
    assert.equal(momentum.questStreaks[0]?.isAtRisk, true);
    assert.equal(momentum.atRiskCount, 1);
  });

  it("computes longest streak across adjacent local dates", () => {
    const momentum = computeMomentum(
      activeQuests,
      [
        { questId: "quest-1", localDate: "2026-06-01", outcome: "win" },
        { questId: "quest-1", localDate: "2026-06-03", outcome: "win" },
        { questId: "quest-1", localDate: "2026-06-04", outcome: "pass" },
        { questId: "quest-1", localDate: "2026-06-05", outcome: "win" },
      ],
      "2026-06-12",
    );

    assert.equal(momentum.questStreaks[0]?.currentStreak, 0);
    assert.equal(momentum.questStreaks[0]?.longestStreak, 3);
    assert.equal(momentum.longestStreakEver, 3);
  });

  it("does not break adjacent dates around DST from UTC parsing", () => {
    const momentum = computeMomentum(
      activeQuests,
      [
        { questId: "quest-1", localDate: "2026-03-07", outcome: "win" },
        { questId: "quest-1", localDate: "2026-03-08", outcome: "win" },
        { questId: "quest-1", localDate: "2026-03-09", outcome: "win" },
      ],
      "2026-03-09",
    );

    assert.equal(momentum.questStreaks[0]?.currentStreak, 3);
    assert.equal(momentum.questStreaks[0]?.longestStreak, 3);
  });

  it("includes the exact 30-day boundary and excludes older Proof", () => {
    const momentum = computeMomentum(
      activeQuests,
      [
        { questId: "quest-1", localDate: "2026-05-12", outcome: "pass" },
        { questId: "quest-1", localDate: "2026-05-13", outcome: "win" },
      ],
      "2026-06-12",
    );

    assert.equal(momentum.questStreaks[0]?.checkInCount30d, 1);
    assert.equal(momentum.questStreaks[0]?.winRate30d, 1);
  });
});
