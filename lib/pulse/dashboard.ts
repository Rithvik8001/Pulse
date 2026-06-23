import "server-only";

import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import {
  formatLocalDate,
  getLocalDateInTimeZone,
  offsetLocalDate,
} from "@/lib/pulse/local-date-core";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";
import { createClient } from "@/lib/supabase/server";

export type DashboardQuest = {
  id: string;
  title: string;
  position: number;
  todayCheckIn: DashboardCheckIn | null;
};

export type CheckInOutcome = "win" | "pass";

export type DashboardCheckIn = {
  id: string;
  questId: string;
  localDate: string;
  outcome: CheckInOutcome;
  note: string | null;
};

export type RecentProof = DashboardCheckIn & {
  questTitle: string;
};

export type ProofHistoryDay = {
  localDate: string;
  winCount: number;
  passCount: number;
  totalCount: number;
};

export type DashboardData =
  | {
      isSetupComplete: false;
      character: null;
      quests: [];
      recentProof: [];
      proofHistory: [];
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      quests: DashboardQuest[];
      recentProof: RecentProof[];
      proofHistory: ProofHistoryDay[];
    };

export async function requireUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/sign-in?next=/dashboard");
  }

  return data.claims.sub;
}

export async function getDashboardData(): Promise<DashboardData> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getDashboardDataForUser(userId, dateContext);
}

export async function getDashboardDataForUser(
  userId: string,
  dateContext: UserLocalDateContext,
): Promise<DashboardData> {
  const today = dateContext.today;
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return {
      isSetupComplete: false,
      character: null,
      quests: [],
      recentProof: [],
      proofHistory: [],
    };
  }

  const historyStartDate = offsetLocalDate(today, -55);
  const [userQuests, todayCheckIns, recentProofRows, proofHistoryRows] =
    await Promise.all([
      db
        .select({
          id: quests.id,
          title: quests.title,
          position: quests.position,
        })
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
          id: checkIns.id,
          questId: checkIns.questId,
          localDate: checkIns.localDate,
          outcome: checkIns.outcome,
          note: checkIns.note,
        })
        .from(checkIns)
        .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, today))),
      db
        .select({
          id: checkIns.id,
          questId: checkIns.questId,
          localDate: checkIns.localDate,
          outcome: checkIns.outcome,
          note: checkIns.note,
          questTitle: quests.title,
        })
        .from(checkIns)
        .innerJoin(quests, eq(checkIns.questId, quests.id))
        .where(eq(checkIns.userId, userId))
        .orderBy(desc(checkIns.localDate), desc(checkIns.updatedAt))
        .limit(6),
      db
        .select({
          localDate: checkIns.localDate,
          outcome: checkIns.outcome,
        })
        .from(checkIns)
        .where(
          and(
            eq(checkIns.userId, userId),
            gte(checkIns.localDate, historyStartDate),
          ),
        )
        .orderBy(asc(checkIns.localDate)),
    ]);

  const checkInByQuestId = new Map(
    todayCheckIns.map((checkIn) => [
      checkIn.questId,
      toDashboardCheckIn(checkIn),
    ]),
  );

  return {
    isSetupComplete: true,
    character,
    quests: userQuests.map((quest) => ({
      ...quest,
      todayCheckIn: checkInByQuestId.get(quest.id) ?? null,
    })),
    recentProof: recentProofRows.map((row) => ({
      ...toDashboardCheckIn(row),
      questTitle: row.questTitle,
    })),
    proofHistory: buildProofHistory(proofHistoryRows, today),
  };
}

export function getLocalDate(date = new Date()) {
  return formatLocalDate(date);
}

function toDashboardCheckIn(checkIn: {
  id: string;
  questId: string;
  localDate: string;
  outcome: string;
  note: string | null;
}): DashboardCheckIn {
  return {
    id: checkIn.id,
    questId: checkIn.questId,
    localDate: checkIn.localDate,
    outcome: checkIn.outcome === "pass" ? "pass" : "win",
    note: checkIn.note,
  };
}

export function getLocalDateForTimeZone(date: Date, timeZone: string) {
  return getLocalDateInTimeZone(date, timeZone);
}

function buildProofHistory(
  rows: {
    localDate: string;
    outcome: string;
  }[],
  today: string,
): ProofHistoryDay[] {
  const byDate = new Map<string, ProofHistoryDay>();

  for (let index = 55; index >= 0; index -= 1) {
    const localDate = offsetLocalDate(today, -index);
    byDate.set(localDate, {
      localDate,
      winCount: 0,
      passCount: 0,
      totalCount: 0,
    });
  }

  for (const row of rows) {
    const day = byDate.get(row.localDate);

    if (!day) {
      continue;
    }

    if (row.outcome === "pass") {
      day.passCount += 1;
    } else {
      day.winCount += 1;
    }

    day.totalCount += 1;
  }

  return Array.from(byDate.values());
}
