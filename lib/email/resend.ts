import "server-only";

import { Resend } from "resend";

export class MissingEmailConfigError extends Error {
  constructor(message = "Resend email delivery is not configured.") {
    super(message);
    this.name = "MissingEmailConfigError";
  }
}

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new MissingEmailConfigError("RESEND_API_KEY is required.");
  }

  resendClient ??= new Resend(apiKey);

  return resendClient;
}

export function getProductEmailFrom() {
  const from = process.env.EMAIL_FROM_PRODUCT;

  if (!from) {
    throw new MissingEmailConfigError("EMAIL_FROM_PRODUCT is required.");
  }

  return from;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
