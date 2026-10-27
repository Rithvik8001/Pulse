import { isLocalDate } from "@/lib/pulse/local-date-core";

export const journalBodyMaxLength = 2000;
export const journalHistoryDays = 30;

export function normalizeJournalDate(
  value: string | null | undefined,
  fallback: string,
) {
  const text = typeof value === "string" ? value.trim() : "";

  return isLocalDate(text) && text <= fallback ? text : fallback;
}

export function validateJournalDate(localDate: string, today: string) {
  if (!isLocalDate(localDate) || localDate > today) {
    return "Pick today or an earlier day, then save again.";
  }

  return null;
}

export function normalizeJournalBody(value: string) {
  return value
    .trim()
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function validateJournalBody(body: string) {
  if (!body) {
    return "Write something before saving.";
  }

  if (body.length > journalBodyMaxLength) {
    return `Keep entries to ${journalBodyMaxLength.toLocaleString()} characters or fewer.`;
  }

  return null;
}

export function getJournalHistoryStart(
  baseDate: Date,
  days = journalHistoryDays,
) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - (days - 1));

  return formatLocalDate(start);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
