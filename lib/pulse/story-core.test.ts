import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWeeklyStoryPrompt } from "@/lib/pulse/story-core";

describe("buildWeeklyStoryPrompt", () => {
  it("includes Journal reflections when present", () => {
    const prompt = buildWeeklyStoryPrompt({
      characterName: "Writer",
      journal: [
        {
          localDate: "2026-06-04",
          body: "Proof: I wrote before checking my phone.",
        },
      ],
      proof: [
        {
          localDate: "2026-06-04",
          outcome: "win",
          note: "500 words",
          questTitle: "Write",
        },
      ],
      quests: ["Write"],
      week: {
        start: "2026-06-01",
        end: "2026-06-07",
      },
    });

    assert.match(prompt, /Journal reflections from this week/);
    assert.match(prompt, /I wrote before checking my phone/);
    assert.match(prompt, /Write = WIN/);
  });

  it("still works when Journal is absent and Proof is empty", () => {
    const prompt = buildWeeklyStoryPrompt({
      characterName: "Builder",
      proof: [],
      quests: ["Walk"],
      week: {
        start: "2026-06-01",
        end: "2026-06-07",
      },
    });

    assert.match(prompt, /No Check-ins saved this week/);
    assert.doesNotMatch(prompt, /Journal reflections from this week/);
  });
});
