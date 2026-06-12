export type PasswordValidationResult =
  | { isValid: true; password: string }
  | {
      isValid: false;
      password: string;
      errors: {
        password?: string;
        confirmPassword?: string;
      };
    };

export const passwordMinLength = 8;
export const passwordResetIntentCookie = "pulse-password-reset";

export function normalizeEmail(value: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizePassword(value: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function safeRedirectPath(
  value: FormDataEntryValue | string | string[] | null | undefined,
  fallback = "/dashboard",
) {
  const next = Array.isArray(value) ? value[0] : value;

  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export function isResetSuccessParam(
  value: string | string[] | null | undefined,
) {
  const reset = Array.isArray(value) ? value[0] : value;

  return reset === "success";
}

export function validatePasswordUpdate(
  passwordValue: FormDataEntryValue | string | null,
  confirmPasswordValue: FormDataEntryValue | string | null,
): PasswordValidationResult {
  const password = normalizePassword(passwordValue);
  const confirmPassword = normalizePassword(confirmPasswordValue);
  const errors: {
    password?: string;
    confirmPassword?: string;
  } = {};

  if (password.length < passwordMinLength) {
    errors.password = `Use at least ${passwordMinLength} characters.`;
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords must match.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      password,
      errors,
    };
  }

  return {
    isValid: true,
    password,
  };
}

export function buildAuthRedirectOrigin({
  forwardedHost,
  forwardedProto,
  host,
  siteUrl,
}: {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  siteUrl?: string | null;
}) {
  const requestHost = forwardedHost ?? host ?? null;
  const protocol = forwardedProto ?? "http";
  const requestOrigin = requestHost ? `${protocol}://${requestHost}` : null;
  const isLocalRequest =
    requestHost?.startsWith("localhost") ||
    requestHost?.startsWith("127.0.0.1") ||
    requestHost?.startsWith("192.168.");

  if (requestOrigin && isLocalRequest) {
    return requestOrigin;
  }

  if (siteUrl) {
    return siteUrl;
  }

  return requestOrigin ?? "http://localhost:3000";
}
