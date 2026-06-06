export const journalBodyMaxLength = 2000;
export const journalHistoryDays = 30;

export function normalizeJournalDate(
  value: string | null | undefined,
  fallback: string,
) {
  const text = typeof value === "string" ? value.trim() : "";

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

export function normalizeJournalBody(value: string) {
  return value
    .trim()
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function validateJournalBody(body: string) {
  if (!body) {
    return "Write a reflection before saving.";
  }

  if (body.length > journalBodyMaxLength) {
    return `Keep Journal entries under ${journalBodyMaxLength} characters.`;
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
