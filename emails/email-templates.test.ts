import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import WelcomeEmail from "@/emails/welcome";
import WeeklyDigestEmail from "@/emails/weekly-digest";

describe("email templates", () => {
  it("renders welcome email with dashboard and unsubscribe links", () => {
    const html = renderToStaticMarkup(
      createElement(WelcomeEmail, {
        characterName: "Writer",
        dashboardUrl: "https://pulse.example/dashboard",
        unsubscribeUrl: "https://pulse.example/api/email/unsubscribe?token=abc",
      }),
    );

    assert.match(html, /Welcome, Writer/);
    assert.match(html, /https:\/\/pulse\.example\/dashboard/);
    assert.match(html, /unsubscribe\?token=abc/);
  });

  it("renders weekly digest with Proof counts and Story CTA", () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyDigestEmail, {
        characterName: "Runner",
        weekLabel: "2026-06-08 to 2026-06-14",
        totalProof: 4,
        winCount: 3,
        passCount: 1,
        strongestQuest: "Morning run",
        needsAttentionQuest: "Stretch",
        storyTitle: "The Steady Week",
        storySummary: "Small actions kept showing up.",
        dashboardUrl: "https://pulse.example/dashboard",
        storyUrl: "https://pulse.example/dashboard/story",
        unsubscribeUrl: "https://pulse.example/api/email/unsubscribe?token=abc",
      }),
    );

    assert.match(html, /Runner&#x27;s week in Proof/);
    assert.match(html, /4 pieces/);
    assert.match(html, /Morning run/);
    assert.match(html, /The Steady Week/);
    assert.match(html, /https:\/\/pulse\.example\/dashboard\/story/);
  });
});
