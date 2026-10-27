import { offsetLocalDate } from "@/lib/pulse/local-date-core";

export function computeCurrentStreak(
  doneDates: Set<string>,
  today: string,
): { current: number; isAtRisk: boolean } {
  const yesterday = offsetLocalDate(today, -1);
  const hasToday = doneDates.has(today);

  if (!hasToday && !doneDates.has(yesterday)) {
    return { current: 0, isAtRisk: false };
  }

  let current = 0;
  let cursor = hasToday ? today : yesterday;

  while (doneDates.has(cursor)) {
    current += 1;
    cursor = offsetLocalDate(cursor, -1);
  }

  return { current, isAtRisk: !hasToday };
}

export function computeLongestStreak(sortedAscDoneDates: string[]) {
  if (sortedAscDoneDates.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < sortedAscDoneDates.length; index += 1) {
    if (sortedAscDoneDates[index] === offsetLocalDate(sortedAscDoneDates[index - 1], 1)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}
