import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hashUserId,
  toStructuredLogEvent,
} from "@/lib/observability/logger";

describe("logger", () => {
  it("hashes user ids without exposing the raw value", () => {
    const hash = hashUserId("user-123");

    assert.notEqual(hash, "user-123");
    assert.equal(hash.length, 24);
    assert.equal(hash, hashUserId("user-123"));
  });

  it("normalizes errors and removes undefined metadata", () => {
    const event = toStructuredLogEvent("error", {
      event: "test_event",
      message: "Test event",
      userId: "user-123",
      metadata: {
        kept: "yes",
        dropped: undefined,
      },
      error: new Error("Something failed"),
    });

    assert.equal(event.level, "error");
    assert.equal(event.userIdHash, hashUserId("user-123"));
    assert.deepEqual(event.metadata, { kept: "yes" });
    assert.deepEqual(event.error, {
      name: "Error",
      message: "Something failed",
    });
  });
});
