import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getJournalHistoryStart,
  journalBodyMaxLength,
  normalizeJournalBody,
  normalizeJournalDate,
  validateJournalBody,
} from "@/lib/pulse/journal-core";

describe("journal-core", () => {
  it("normalizes valid dates and falls back for invalid dates", () => {
    assert.equal(
      normalizeJournalDate("2026-06-06", "2026-06-01"),
      "2026-06-06",
    );
    assert.equal(normalizeJournalDate("nope", "2026-06-01"), "2026-06-01");
    assert.equal(normalizeJournalDate(null, "2026-06-01"), "2026-06-01");
  });

  it("computes a 30-day inclusive history start", () => {
    assert.equal(
      getJournalHistoryStart(new Date("2026-06-06T12:00:00")),
      "2026-05-08",
    );
  });

  it("normalizes and validates Journal bodies", () => {
    assert.equal(
      normalizeJournalBody("  Proof: showed up   \n\n\nNext: rest  "),
      "Proof: showed up\nNext: rest",
    );
    assert.equal(validateJournalBody(""), "Write a reflection before saving.");
    assert.equal(validateJournalBody("A steady day."), null);
    assert.equal(
      validateJournalBody("x".repeat(journalBodyMaxLength + 1)),
      `Keep Journal entries under ${journalBodyMaxLength} characters.`,
    );
  });
});
