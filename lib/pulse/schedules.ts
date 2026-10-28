import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { questSchedules } from "@/lib/db/schema";
import { scheduleFromRow, type ScheduleEntry } from "@/lib/pulse/schedule-core";

export async function getScheduleHistoriesForUser(
  userId: string,
  questIds?: string[],
): Promise<Map<string, ScheduleEntry[]>> {
  if (questIds && questIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      questId: questSchedules.questId,
      kind: questSchedules.kind,
      weekdays: questSchedules.weekdays,
      timesPerWeek: questSchedules.timesPerWeek,
      effectiveFrom: questSchedules.effectiveFrom,
    })
    .from(questSchedules)
    .where(
      questIds
        ? and(eq(questSchedules.userId, userId), inArray(questSchedules.questId, questIds))
        : eq(questSchedules.userId, userId),
    )
    .orderBy(asc(questSchedules.questId), asc(questSchedules.effectiveFrom));

  const histories = new Map<string, ScheduleEntry[]>();

  for (const row of rows) {
    const history = histories.get(row.questId) ?? [];
    history.push({ effectiveFrom: row.effectiveFrom, schedule: scheduleFromRow(row) });
    histories.set(row.questId, history);
  }

  return histories;
}
