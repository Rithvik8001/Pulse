import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const pulseFiles = [
  "dashboard.ts",
  "momentum.ts",
  "stats.ts",
  "proof.ts",
  "journal.ts",
  "story.ts",
  "suggestions.ts",
  "quests.ts",
  "coach.ts",
  "habit-agent.ts",
];

describe("ForUser loader boundaries", () => {
  it("does not call requireUserId inside exported ForUser functions", () => {
    for (const file of pulseFiles) {
      const source = readFileSync(join(process.cwd(), "lib/pulse", file), "utf8");
      const matches = source.matchAll(
        /export async function \w+ForUser\([^]*?^}/gm,
      );

      for (const match of matches) {
        assert.doesNotMatch(
          match[0],
          /requireUserId\(/,
          `${file} has requireUserId inside a ForUser loader`,
        );
      }
    }
  });
});
