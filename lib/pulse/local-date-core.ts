export function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function isLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && formatLocalDate(parseLocalDate(value)) === value;
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getLocalDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

export function formatLocalDateForLocale(
  localDate: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  },
) {
  return new Intl.DateTimeFormat(locale, options).format(parseLocalDate(localDate));
}

export function offsetDate(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export function offsetLocalDate(value: string, days: number) {
  return formatLocalDate(offsetDate(parseLocalDate(value), days));
}

export function getWeekdayIndex(localDate: string) {
  return (parseLocalDate(localDate).getDay() + 6) % 7;
}

export function getWeekStart(localDate: string) {
  return offsetLocalDate(localDate, -getWeekdayIndex(localDate));
}

export function enumerateLocalDates(from: string, to: string) {
  const dates: string[] = [];

  for (let cursor = from; cursor <= to; cursor = offsetLocalDate(cursor, 1)) {
    dates.push(cursor);
  }

  return dates;
}
