import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildUnsubscribeUrl,
  getPreviousWeekRange,
  isValidEmail,
  isWeeklyDigestEligible,
  normalizeEmail,
  weeklyDigestDedupeKey,
  welcomeDedupeKey,
} from "@/lib/email/email-core";

describe("email-core", () => {
  it("normalizes and validates email addresses", () => {
    assert.equal(
      normalizeEmail("  Rithvik@Example.COM "),
      "rithvik@example.com",
    );
    assert.equal(isValidEmail("rithvik@example.com"), true);
    assert.equal(isValidEmail("not-an-email"), false);
  });

  it("builds stable delivery dedupe keys", () => {
    assert.equal(welcomeDedupeKey("user-1"), "welcome:user-1");
    assert.equal(
      weeklyDigestDedupeKey("user-1", "2026-06-08"),
      "weekly_digest:user-1:2026-06-08",
    );
  });

  it("builds unsubscribe URLs with token query params", () => {
    assert.equal(
      buildUnsubscribeUrl("https://pulse.example", "token-123"),
      "https://pulse.example/api/email/unsubscribe?token=token-123",
    );
  });

  it("computes the previous Monday-start week", () => {
    assert.deepEqual(getPreviousWeekRange("2026-06-15"), {
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("requires subscription, activity, and no existing delivery for weekly digest", () => {
    assert.equal(
      isWeeklyDigestEligible({
        productEmailsEnabled: true,
        weeklyDigestEnabled: true,
        unsubscribedAt: null,
        activityCount: 1,
        deliveryExists: false,
      }),
      true,
    );
    assert.equal(
      isWeeklyDigestEligible({
        productEmailsEnabled: true,
        weeklyDigestEnabled: true,
        unsubscribedAt: null,
        activityCount: 0,
        deliveryExists: false,
      }),
      false,
    );
    assert.equal(
      isWeeklyDigestEligible({
        productEmailsEnabled: false,
        weeklyDigestEnabled: true,
        unsubscribedAt: null,
        activityCount: 1,
        deliveryExists: false,
      }),
      false,
    );
    assert.equal(
      isWeeklyDigestEligible({
        productEmailsEnabled: true,
        weeklyDigestEnabled: true,
        unsubscribedAt: new Date(),
        activityCount: 1,
        deliveryExists: false,
      }),
      false,
    );
    assert.equal(
      isWeeklyDigestEligible({
        productEmailsEnabled: true,
        weeklyDigestEnabled: true,
        unsubscribedAt: null,
        activityCount: 1,
        deliveryExists: true,
      }),
      false,
    );
  });
});
