import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultLocale,
  defaultTimeZone,
  isValidTimeZone,
  normalizeLocale,
  normalizeTimeZone,
  normalizeUserSettings,
} from "@/lib/pulse/user-settings-core";

describe("user-settings-core", () => {
  it("accepts valid IANA time zones", () => {
    assert.equal(isValidTimeZone("America/New_York"), true);
    assert.equal(normalizeTimeZone("America/Los_Angeles"), "America/Los_Angeles");
  });

  it("falls back for invalid or blank time zones", () => {
    assert.equal(isValidTimeZone("Not/AZone"), false);
    assert.equal(normalizeTimeZone("Not/AZone"), defaultTimeZone);
    assert.equal(normalizeTimeZone(""), defaultTimeZone);
    assert.equal(normalizeTimeZone(null), defaultTimeZone);
  });

  it("canonicalizes valid locales and falls back for invalid locales", () => {
    assert.equal(normalizeLocale("en-us"), "en-US");
    assert.equal(normalizeLocale("bad locale"), defaultLocale);
    assert.equal(normalizeLocale(null), defaultLocale);
  });

  it("normalizes settings together", () => {
    assert.deepEqual(
      normalizeUserSettings({
        locale: "fr-ca",
        timeZone: "Europe/Paris",
      }),
      {
        locale: "fr-CA",
        timeZone: "Europe/Paris",
      },
    );
  });
});
