import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeStatsData } from "@/lib/pulse/stats-core";

const baseDate = new Date("2026-06-06T12:00:00");

const quests = [
  {
    id: "quest-active",
    title: "Write 500 words",
    status: "active" as const,
    position: 1,
  },
  {
    id: "quest-archived",
    title: "Evening run",
    status: "archived" as const,
    position: 2,
  },
  {
    id: "quest-empty",
    title: "Read 10 pages",
    status: "active" as const,
    position: 3,
  },
];

describe("computeStatsData", () => {
  it("builds 12 weekly buckets including empty weeks", () => {
    const stats = computeStatsData({
      baseDate,
      checkIns: [],
      quests,
    });

    assert.equal(stats.weeklyTrend.length, 12);
    assert.equal(stats.weeklyTrend[0].weekStart, "2026-03-16");
    assert.equal(stats.weeklyTrend.at(-1)?.weekStart, "2026-06-01");
    assert.equal(
      stats.weeklyTrend.every((week) => week.totalCount === 0),
      true,
    );
    assert.equal(stats.summary.overallWinRate, null);
  });

  it("computes rounded win rates without divide-by-zero noise", () => {
    const stats = computeStatsData({
      baseDate,
      checkIns: [
        {
          questId: "quest-active",
          localDate: "2026-06-01",
          outcome: "win",
        },
        {
          questId: "quest-active",
          localDate: "2026-06-02",
          outcome: "win",
        },
        {
          questId: "quest-active",
          localDate: "2026-06-03",
          outcome: "pass",
        },
      ],
      quests,
    });
    const week = stats.weeklyTrend.at(-1);
    const quest = stats.questStats.find(
      (item) => item.questId === "quest-active",
    );

    assert.equal(week?.winRate, 67);
    assert.equal(quest?.winRate, 67);
    assert.equal(stats.summary.overallWinRate, 67);
  });

  it("includes archived Quests with Proof in the analytics window", () => {
    const stats = computeStatsData({
      baseDate,
      checkIns: [
        {
          questId: "quest-archived",
          localDate: "2026-05-20",
          outcome: "win",
        },
      ],
      quests,
    });
    const archived = stats.questStats.find(
      (quest) => quest.questId === "quest-archived",
    );

    assert.equal(archived?.questStatus, "archived");
    assert.equal(archived?.totalCount, 1);
  });

  it("keeps active Quests with no window data but avoids ranking them as failures", () => {
    const stats = computeStatsData({
      baseDate,
      checkIns: [],
      quests,
    });
    const emptyQuest = stats.questStats.find(
      (quest) => quest.questId === "quest-empty",
    );

    assert.equal(emptyQuest?.totalCount, 0);
    assert.equal(emptyQuest?.winRate, null);
    assert.equal(stats.summary.strongestQuest, null);
    assert.equal(stats.summary.needsAttentionQuest?.questStatus, "active");
    assert.equal(stats.summary.needsAttentionQuest?.winRate, null);
  });

  it("identifies strongest and needs-attention Quests with minimum sample size", () => {
    const stats = computeStatsData({
      baseDate,
      checkIns: [
        {
          questId: "quest-active",
          localDate: "2026-06-01",
          outcome: "win",
        },
        {
          questId: "quest-active",
          localDate: "2026-06-02",
          outcome: "win",
        },
        {
          questId: "quest-active",
          localDate: "2026-06-03",
          outcome: "win",
        },
        {
          questId: "quest-archived",
          localDate: "2026-06-01",
          outcome: "pass",
        },
        {
          questId: "quest-archived",
          localDate: "2026-06-02",
          outcome: "pass",
        },
        {
          questId: "quest-archived",
          localDate: "2026-06-03",
          outcome: "win",
        },
      ],
      quests,
    });

    assert.equal(stats.summary.strongestQuest?.questId, "quest-active");
    assert.equal(stats.summary.needsAttentionQuest?.questId, "quest-archived");
  });
});
