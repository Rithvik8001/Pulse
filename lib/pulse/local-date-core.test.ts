import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatLocalDate,
  offsetLocalDate,
  parseLocalDate,
} from "@/lib/pulse/local-date-core";

describe("local-date-core", () => {
  it("parses local dates at noon without shifting the calendar day", () => {
    const parsed = parseLocalDate("2026-01-01");

    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 0);
    assert.equal(parsed.getDate(), 1);
    assert.equal(parsed.getHours(), 12);
    assert.equal(formatLocalDate(parsed), "2026-01-01");
  });

  it("offsets across previous and next local days", () => {
    assert.equal(offsetLocalDate("2026-03-01", -1), "2026-02-28");
    assert.equal(offsetLocalDate("2026-02-28", 1), "2026-03-01");
  });

  it("keeps 30-day boundary math on local-date strings", () => {
    assert.equal(offsetLocalDate("2026-06-12", -30), "2026-05-13");
    assert.equal(offsetLocalDate("2026-05-13", 30), "2026-06-12");
  });
});
