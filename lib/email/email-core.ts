import { offsetLocalDate } from "@/lib/pulse/local-date-core";

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
  const date = new Date(`${today}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset - 7);

  const start = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

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
