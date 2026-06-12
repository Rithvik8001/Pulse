import "server-only";

import { and, asc, eq, gte, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { checkIns, quests } from "@/lib/db/schema";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";
import {
  computeMomentum,
  type MomentumData,
} from "@/lib/pulse/momentum-core";
import { offsetDate } from "@/lib/pulse/local-date-core";

export type { MomentumData, MomentumTier, QuestStreak } from "./momentum-core";

export async function getMomentumData(): Promise<MomentumData | null> {
  const userId = await requireUserId();
  const today = getLocalDate();
  const ninetyDaysAgo = getLocalDate(offsetDate(new Date(), -90));

  const [activeQuests, checkInRows] = await Promise.all([
    db
      .select({ id: quests.id, title: quests.title })
      .from(quests)
      .where(
        and(
          eq(quests.userId, userId),
          eq(quests.status, "active"),
          isNull(quests.archivedAt),
        ),
      )
      .orderBy(asc(quests.position)),
    db
      .select({
        questId: checkIns.questId,
        localDate: checkIns.localDate,
        outcome: checkIns.outcome,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          gte(checkIns.localDate, ninetyDaysAgo),
        ),
      )
      .orderBy(asc(checkIns.localDate)),
  ]);

  if (activeQuests.length === 0) return null;

  return computeMomentum(activeQuests, checkInRows, today);
}
