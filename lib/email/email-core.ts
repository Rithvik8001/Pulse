import { getWeekStart, offsetLocalDate } from "@/lib/pulse/local-date-core";

export const welcomeEmailType = "welcome";
export const weeklyDigestEmailType = "weekly_digest";

export type WeeklyDigestEligibilityInput = {
  productEmailsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  unsubscribedAt: Date | null;
  activityCount: number;
  deliveryExists: boolean;
};

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function welcomeDedupeKey(userId: string) {
  return `${welcomeEmailType}:${userId}`;
}

export function weeklyDigestDedupeKey(userId: string, weekStart: string) {
  return `${weeklyDigestEmailType}:${userId}:${weekStart}`;
}

export function buildUnsubscribeUrl(siteUrl: string, token: string) {
  const url = new URL("/api/email/unsubscribe", siteUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

export function getPreviousWeekRange(today: string) {
  const start = offsetLocalDate(getWeekStart(today), -7);

  return {
    start,
    end: offsetLocalDate(start, 6),
  };
}

export function isWeeklyDigestEligible(input: WeeklyDigestEligibilityInput) {
  return (
    input.productEmailsEnabled &&
    input.weeklyDigestEnabled &&
    input.unsubscribedAt === null &&
    input.activityCount > 0 &&
    !input.deliveryExists
  );
}
