import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseCoachProposal,
  parseHabitProposal,
  redactPrivateIdentifiers,
} from "@/components/product/assistant/assistant-proposals";

describe("assistant proposals", () => {
  it("parses valid coach and habit proposals", () => {
    assert.equal(
      parseCoachProposal({
        title: "Save Win",
        summary: "Save a win.",
        action: {
          type: "saveCheckIn",
          questId: "quest-1",
          outcome: "win",
          localDate: "2026-06-23",
        },
      })?.actionLabel,
      "Check-in",
    );
    assert.equal(
      parseHabitProposal({
        title: "Delete Habit",
        summary: "Delete a zero-Proof habit.",
        action: { type: "deleteHabit", questId: "quest-1" },
      })?.destructive,
      true,
    );
  });

  it("redacts private identifiers from assistant text", () => {
    const redacted = redactPrivateIdentifiers(
      "Use [id:abc] and email test@example.com with 123e4567-e89b-12d3-a456-426614174000.",
    );

    assert.doesNotMatch(redacted, /test@example\.com/);
    assert.doesNotMatch(redacted, /123e4567/);
    assert.doesNotMatch(redacted, /\[id:abc\]/);
  });
});
