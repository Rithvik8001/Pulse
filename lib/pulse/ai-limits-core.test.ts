import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decideAiLimit,
  estimateMessagesTokens,
  estimateTokens,
  getAiLimitConfig,
  getPeriodResetAt,
  getPeriodStart,
  trimAiChatMessages,
  validateAiChatMessages,
} from "@/lib/pulse/ai-limits-core";

describe("getAiLimitConfig", () => {
  it("uses conservative defaults", () => {
    const config = getAiLimitConfig({});

    assert.equal(config.enabled, true);
    assert.equal(config.globalDailyRequestLimit, 50);
    assert.equal(config.globalDailyTokenLimit, 500_000);
    assert.equal(config.features["pulse-coach"].requestLimit, 5);
    assert.equal(config.features["pulse-coach"].tokenLimit, 60_000);
    assert.equal(config.features["habit-agent"].requestLimit, 3);
    assert.equal(config.features["reword-suggestions"].requestLimit, 5);
    assert.equal(config.features["weekly-story"].period, "week");
    assert.equal(config.features["weekly-story"].requestLimit, 2);
    assert.equal(config.features["identity-timeline"].period, "week");
    assert.equal(config.features["identity-timeline"].tokenLimit, 35_000);
  });

  it("honors environment overrides", () => {
    const config = getAiLimitConfig({
      AI_LIMITS_ENABLED: "false",
      AI_GLOBAL_DAILY_REQUEST_LIMIT: "12",
      AI_GLOBAL_DAILY_TOKEN_LIMIT: "12345",
      AI_PULSE_COACH_DAILY_REQUEST_LIMIT: "2",
      AI_PULSE_COACH_DAILY_TOKEN_LIMIT: "777",
      AI_WEEKLY_STORY_WEEKLY_REQUEST_LIMIT: "1",
      AI_WEEKLY_STORY_WEEKLY_TOKEN_LIMIT: "999",
      AI_IDENTITY_TIMELINE_WEEKLY_REQUEST_LIMIT: "1",
      AI_IDENTITY_TIMELINE_WEEKLY_TOKEN_LIMIT: "888",
    });

    assert.equal(config.enabled, false);
    assert.equal(config.globalDailyRequestLimit, 12);
    assert.equal(config.globalDailyTokenLimit, 12_345);
    assert.equal(config.features["pulse-coach"].requestLimit, 2);
    assert.equal(config.features["pulse-coach"].tokenLimit, 777);
    assert.equal(config.features["weekly-story"].requestLimit, 1);
    assert.equal(config.features["weekly-story"].tokenLimit, 999);
    assert.equal(config.features["identity-timeline"].requestLimit, 1);
    assert.equal(config.features["identity-timeline"].tokenLimit, 888);
  });
});

describe("AI limit periods", () => {
  it("builds local daily periods", () => {
    const date = new Date("2026-06-13T12:00:00");

    assert.equal(getPeriodStart(date, "day"), "2026-06-13");
    assert.equal(
      getPeriodResetAt("2026-06-13", "day").toISOString(),
      new Date("2026-06-14T00:00:00").toISOString(),
    );
  });

  it("builds Monday-start weekly periods", () => {
    const saturday = new Date("2026-06-13T12:00:00");
    const sunday = new Date("2026-06-14T12:00:00");

    assert.equal(getPeriodStart(saturday, "week"), "2026-06-08");
    assert.equal(getPeriodStart(sunday, "week"), "2026-06-08");
    assert.equal(
      getPeriodResetAt("2026-06-08", "week").toISOString(),
      new Date("2026-06-15T00:00:00").toISOString(),
    );
  });
});

describe("AI token estimation and chat validation", () => {
  it("estimates text with a simple four-character heuristic", () => {
    assert.equal(estimateTokens(""), 0);
    assert.equal(estimateTokens("1234"), 1);
    assert.equal(estimateTokens("12345"), 2);
  });

  it("estimates and trims UI messages", () => {
    const messages = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `message-${index}` }],
    }));
    const trimmed = trimAiChatMessages(messages);

    assert.equal(trimmed.length, 12);
    assert.equal(trimmed[0].parts[0].text, "message-2");
    assert.ok(estimateMessagesTokens(trimmed) > 0);
  });

  it("rejects oversized user text", () => {
    const tooLong = "x".repeat(2001);
    const result = validateAiChatMessages([
      { role: "user", parts: [{ type: "text", text: tooLong }] },
    ]);

    assert.equal(result.valid, false);
  });

  it("rejects oversized total user text", () => {
    const result = validateAiChatMessages(
      Array.from({ length: 5 }, () => ({
        role: "user",
        parts: [{ type: "text", text: "x".repeat(1700) }],
      })),
    );

    assert.equal(result.valid, false);
  });
});

describe("decideAiLimit", () => {
  const config = getAiLimitConfig({});
  const featureLimit = config.features["pulse-coach"];
  const resetAt = new Date("2026-06-14T00:00:00");

  it("allows requests below quota", () => {
    const decision = decideAiLimit({
      config,
      featureLimit,
      userSnapshot: {
        requestCount: 4,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      globalSnapshot: {
        requestCount: 10,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      estimatedTokens: 10,
      resetAt,
      globalResetAt: resetAt,
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.remaining, 0);
  });

  it("blocks when user request quota is exhausted", () => {
    const decision = decideAiLimit({
      config,
      featureLimit,
      userSnapshot: {
        requestCount: 5,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      globalSnapshot: {
        requestCount: 10,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      estimatedTokens: 10,
      resetAt,
      globalResetAt: resetAt,
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.reason, "user_requests");
  });

  it("blocks when global cap is exhausted", () => {
    const decision = decideAiLimit({
      config,
      featureLimit,
      userSnapshot: {
        requestCount: 0,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      globalSnapshot: {
        requestCount: 50,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      estimatedTokens: 10,
      resetAt,
      globalResetAt: resetAt,
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.reason, "global_requests");
  });

  it("blocks on token caps", () => {
    const decision = decideAiLimit({
      config,
      featureLimit,
      userSnapshot: {
        requestCount: 0,
        estimatedTokenCount: 59_999,
        totalTokenCount: 0,
      },
      globalSnapshot: {
        requestCount: 0,
        estimatedTokenCount: 100,
        totalTokenCount: 100,
      },
      estimatedTokens: 2,
      resetAt,
      globalResetAt: resetAt,
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.reason, "user_tokens");
  });

  it("allows without enforcing when disabled", () => {
    const disabledConfig = { ...config, enabled: false };
    const decision = decideAiLimit({
      config: disabledConfig,
      featureLimit,
      userSnapshot: {
        requestCount: 999,
        estimatedTokenCount: 999_999,
        totalTokenCount: 999_999,
      },
      globalSnapshot: {
        requestCount: 999,
        estimatedTokenCount: 999_999,
        totalTokenCount: 999_999,
      },
      estimatedTokens: 100_000,
      resetAt,
      globalResetAt: resetAt,
    });

    assert.equal(decision.allowed, true);
  });
});
