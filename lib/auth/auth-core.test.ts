import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthRedirectOrigin,
  isResetSuccessParam,
  safeRedirectPath,
  validatePasswordUpdate,
} from "@/lib/auth/auth-core";

describe("auth-core", () => {
  it("validates matching reset passwords", () => {
    assert.deepEqual(validatePasswordUpdate("password-1", "password-1"), {
      isValid: true,
      password: "password-1",
    });
  });

  it("rejects short or mismatched reset passwords", () => {
    const short = validatePasswordUpdate("short", "short");
    assert.equal(short.isValid, false);
    if (!short.isValid) {
      assert.equal(short.errors.password, "Use at least 8 characters.");
    }

    const mismatch = validatePasswordUpdate("password-1", "password-2");
    assert.equal(mismatch.isValid, false);
    if (!mismatch.isValid) {
      assert.equal(mismatch.errors.confirmPassword, "Passwords must match.");
    }
  });

  it("keeps localhost redirect origins local", () => {
    assert.equal(
      buildAuthRedirectOrigin({
        forwardedHost: null,
        forwardedProto: "http",
        host: "localhost:3000",
        siteUrl: "https://pulse.example",
      }),
      "http://localhost:3000",
    );
  });

  it("uses production site URL for non-local requests", () => {
    assert.equal(
      buildAuthRedirectOrigin({
        forwardedHost: "preview.vercel.app",
        forwardedProto: "https",
        host: "internal.vercel.app",
        siteUrl: "https://pulse.example",
      }),
      "https://pulse.example",
    );
  });

  it("rejects unsafe redirect paths", () => {
    assert.equal(safeRedirectPath("https://evil.example"), "/dashboard");
    assert.equal(safeRedirectPath("//evil.example"), "/dashboard");
    assert.equal(safeRedirectPath(null), "/dashboard");
    assert.equal(safeRedirectPath("/reset-password"), "/reset-password");
  });

  it("recognizes only the reset success query value", () => {
    assert.equal(isResetSuccessParam("success"), true);
    assert.equal(isResetSuccessParam("https://evil.example"), false);
    assert.equal(isResetSuccessParam(undefined), false);
  });
});
