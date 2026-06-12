export function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function offsetDate(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export function offsetLocalDate(value: string, days: number) {
  return formatLocalDate(offsetDate(parseLocalDate(value), days));
}
