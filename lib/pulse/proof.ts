import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { characters, checkIns, quests } from "@/lib/db/schema";
import { requireUserId } from "@/lib/pulse/dashboard";
import { offsetLocalDate } from "@/lib/pulse/local-date-core";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";

export type ProofOutcome = "win" | "pass";
export type ProofQuestStatus = "active" | "archived";

export type ProofEntry = {
  id: string;
  questId: string;
  questTitle: string;
  questStatus: ProofQuestStatus;
  localDate: string;
  outcome: ProofOutcome;
  note: string | null;
  updatedAt: Date;
};

export type ProofHistoryDay = {
  localDate: string;
  winCount: number;
  passCount: number;
  totalCount: number;
};

export type ProofQuestOption = {
  id: string;
  title: string;
  status: ProofQuestStatus;
  proofCount: number;
};

export type ProofStats = {
  total: number;
  winCount: number;
  passCount: number;
  mostProvenQuest: ProofQuestOption | null;
};

export type ProofMutationResult = {
  status: "success" | "error";
  message: string;
};

export type ProofArchiveData =
  | {
      isSetupComplete: false;
      character: null;
      range: ProofRange;
      entries: [];
      days: ProofHistoryDay[];
      questOptions: [];
      stats: ProofStats;
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      range: ProofRange;
      entries: ProofEntry[];
      days: ProofHistoryDay[];
      questOptions: ProofQuestOption[];
      stats: ProofStats;
    };

type ProofRange = {
  start: string;
  end: string;
  days: number;
};

const proofWindowDays = 90;
const noteMaxLength = 240;

export async function getProofArchiveData(): Promise<ProofArchiveData> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getProofArchiveDataForUser(userId, dateContext);
}

export async function getProofArchiveDataForUser(
  userId: string,
  dateContext: UserLocalDateContext,
): Promise<ProofArchiveData> {
  const range = {
    start: offsetLocalDate(dateContext.today, -(proofWindowDays - 1)),
    end: dateContext.today,
    days: proofWindowDays,
  };
  const emptyDays = buildProofHistory([], dateContext.today);
  const emptyStats = buildProofStats([]);
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
      range,
      entries: [],
      days: emptyDays,
      questOptions: [],
      stats: emptyStats,
    };
  }

  const rows = await db
    .select({
      id: checkIns.id,
      questId: checkIns.questId,
      localDate: checkIns.localDate,
      outcome: checkIns.outcome,
      note: checkIns.note,
      updatedAt: checkIns.updatedAt,
      questTitle: quests.title,
      questStatus: quests.status,
    })
    .from(checkIns)
    .innerJoin(quests, eq(checkIns.questId, quests.id))
    .where(and(eq(checkIns.userId, userId), gte(checkIns.localDate, range.start)))
    .orderBy(desc(checkIns.localDate), desc(checkIns.updatedAt));

  const entries = rows.map(toProofEntry);

  return {
    isSetupComplete: true,
    character,
    range,
    entries,
    days: buildProofHistory(entries, dateContext.today),
    questOptions: buildQuestOptions(entries),
    stats: buildProofStats(entries),
  };
}

export async function updateProofEntry(
  checkInId: string,
  outcome: string,
  note: string,
): Promise<ProofMutationResult> {
  const userId = await requireUserId();
  const cleanCheckInId = normalizeText(checkInId);
  const cleanOutcome = normalizeOutcome(outcome);
  const cleanNote = normalizeOptionalText(note);

  if (!cleanCheckInId || !cleanOutcome) {
    return {
      status: "error",
      message: "Choose Win or Pass before saving Proof.",
    };
  }

  if (cleanNote && cleanNote.length > noteMaxLength) {
    return {
      status: "error",
      message: `Keep Proof notes under ${noteMaxLength} characters.`,
    };
  }

  const [updated] = await db
    .update(checkIns)
    .set({
      outcome: cleanOutcome,
      note: cleanNote,
      updatedAt: new Date(),
    })
    .where(and(eq(checkIns.id, cleanCheckInId), eq(checkIns.userId, userId)))
    .returning({
      id: checkIns.id,
    });

  if (!updated) {
    return {
      status: "error",
      message: "We could not find that Proof for your account.",
    };
  }

  return {
    status: "success",
    message: "Proof updated.",
  };
}

export async function deleteProofEntry(
  checkInId: string,
): Promise<ProofMutationResult> {
  const userId = await requireUserId();
  const cleanCheckInId = normalizeText(checkInId);

  if (!cleanCheckInId) {
    return {
      status: "error",
      message: "We could not find that Proof for your account.",
    };
  }

  const [deleted] = await db
    .delete(checkIns)
    .where(and(eq(checkIns.id, cleanCheckInId), eq(checkIns.userId, userId)))
    .returning({
      id: checkIns.id,
    });

  if (!deleted) {
    return {
      status: "error",
      message: "We could not find that Proof for your account.",
    };
  }

  return {
    status: "success",
    message: "Proof deleted.",
  };
}

function toProofEntry(row: {
  id: string;
  questId: string;
  questTitle: string;
  questStatus: string;
  localDate: string;
  outcome: string;
  note: string | null;
  updatedAt: Date;
}): ProofEntry {
  return {
    id: row.id,
    questId: row.questId,
    questTitle: row.questTitle,
    questStatus: row.questStatus === "archived" ? "archived" : "active",
    localDate: row.localDate,
    outcome: row.outcome === "pass" ? "pass" : "win",
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

function buildProofHistory(entries: ProofEntry[], today: string) {
  const byDate = new Map<string, ProofHistoryDay>();

  for (let index = proofWindowDays - 1; index >= 0; index -= 1) {
    const localDate = offsetLocalDate(today, -index);
    byDate.set(localDate, {
      localDate,
      winCount: 0,
      passCount: 0,
      totalCount: 0,
    });
  }

  for (const entry of entries) {
    const day = byDate.get(entry.localDate);

    if (!day) {
      continue;
    }

    if (entry.outcome === "pass") {
      day.passCount += 1;
    } else {
      day.winCount += 1;
    }

    day.totalCount += 1;
  }

  return Array.from(byDate.values());
}

function buildQuestOptions(entries: ProofEntry[]) {
  const byQuest = new Map<string, ProofQuestOption>();

  for (const entry of entries) {
    const existing = byQuest.get(entry.questId);

    if (existing) {
      existing.proofCount += 1;
    } else {
      byQuest.set(entry.questId, {
        id: entry.questId,
        title: entry.questTitle,
        status: entry.questStatus,
        proofCount: 1,
      });
    }
  }

  return Array.from(byQuest.values()).sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "active" ? -1 : 1;
    }

    return first.title.localeCompare(second.title);
  });
}

function buildProofStats(entries: ProofEntry[]): ProofStats {
  const questOptions = buildQuestOptions(entries);
  const winCount = entries.filter((entry) => entry.outcome === "win").length;
  const passCount = entries.length - winCount;
  const mostProvenQuest =
    questOptions.sort((first, second) => second.proofCount - first.proofCount)[0] ??
    null;

  return {
    total: entries.length,
    winCount,
    passCount,
    mostProvenQuest,
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string) {
  const text = normalizeText(value);

  return text.length > 0 ? text : null;
}

function normalizeOutcome(value: string): ProofOutcome | null {
  const text = normalizeText(value).toLowerCase();

  if (text === "win" || text === "pass") {
    return text;
  }

  return null;
}
