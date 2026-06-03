import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
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

export type DashboardData =
  | {
      isSetupComplete: false;
      character: null;
      quests: [];
      recentProof: [];
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      quests: DashboardQuest[];
      recentProof: RecentProof[];
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
  const today = getLocalDate();
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
    };
  }

  const [userQuests, todayCheckIns, recentProofRows] = await Promise.all([
    db
    .select({
      id: quests.id,
      title: quests.title,
      position: quests.position,
    })
    .from(quests)
    .where(eq(quests.userId, userId))
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
  ]);

  const checkInByQuestId = new Map(
    todayCheckIns.map((checkIn) => [checkIn.questId, toDashboardCheckIn(checkIn)]),
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
  };
}

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
