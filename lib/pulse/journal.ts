import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { characters, checkIns, journalEntries, quests } from "@/lib/db/schema";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";
import {
  getJournalHistoryStart,
  normalizeJournalBody,
  normalizeJournalDate,
  validateJournalBody,
} from "@/lib/pulse/journal-core";

export {
  getJournalHistoryStart,
  journalBodyMaxLength,
  journalHistoryDays,
  normalizeJournalBody,
  normalizeJournalDate,
  validateJournalBody,
} from "@/lib/pulse/journal-core";

export type JournalProof = {
  id: string;
  questTitle: string;
  outcome: "win" | "pass";
  note: string | null;
};

export type JournalEntrySummary = {
  id: string;
  localDate: string;
  body: string;
  updatedAt: Date;
};

export type JournalMutationResult = {
  status: "success" | "error";
  message: string;
};

export type JournalData =
  | {
      isSetupComplete: false;
      character: null;
      selectedDate: string;
      selectedEntry: null;
      selectedProof: [];
      history: [];
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      selectedDate: string;
      selectedEntry: JournalEntrySummary | null;
      selectedProof: JournalProof[];
      history: JournalEntrySummary[];
    };

export async function getJournalData(
  selectedDate?: string,
): Promise<JournalData> {
  const userId = await requireUserId();
  const today = getLocalDate();
  const date = normalizeJournalDate(selectedDate, today);
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
      selectedDate: date,
      selectedEntry: null,
      selectedProof: [],
      history: [],
    };
  }

  const historyStart = getJournalHistoryStart(new Date());
  const [entryRows, proofRows, historyRows] = await Promise.all([
    db
      .select({
        id: journalEntries.id,
        localDate: journalEntries.localDate,
        body: journalEntries.body,
        updatedAt: journalEntries.updatedAt,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          eq(journalEntries.localDate, date),
        ),
      )
      .limit(1),
    db
      .select({
        id: checkIns.id,
        outcome: checkIns.outcome,
        note: checkIns.note,
        questTitle: quests.title,
      })
      .from(checkIns)
      .innerJoin(quests, eq(checkIns.questId, quests.id))
      .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, date)))
      .orderBy(quests.position),
    db
      .select({
        id: journalEntries.id,
        localDate: journalEntries.localDate,
        body: journalEntries.body,
        updatedAt: journalEntries.updatedAt,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gte(journalEntries.localDate, historyStart),
        ),
      )
      .orderBy(desc(journalEntries.localDate), desc(journalEntries.updatedAt)),
  ]);

  return {
    isSetupComplete: true,
    character,
    selectedDate: date,
    selectedEntry: entryRows[0] ?? null,
    selectedProof: proofRows.map((row) => ({
      id: row.id,
      questTitle: row.questTitle,
      outcome: row.outcome === "pass" ? "pass" : "win",
      note: row.note,
    })),
    history: historyRows,
  };
}

export async function upsertJournalEntry(
  localDate: string,
  body: string,
): Promise<JournalMutationResult> {
  const userId = await requireUserId();
  const selectedDate = normalizeJournalDate(localDate, getLocalDate());
  const cleanBody = normalizeJournalBody(body);
  const validationError = validateJournalBody(cleanBody);

  if (validationError) {
    return {
      status: "error",
      message: validationError,
    };
  }

  const [character] = await db
    .select({
      id: characters.id,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return {
      status: "error",
      message: "Create your Character before writing Journal entries.",
    };
  }

  const now = new Date();
  await db
    .insert(journalEntries)
    .values({
      userId,
      characterId: character.id,
      localDate: selectedDate,
      body: cleanBody,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [journalEntries.userId, journalEntries.localDate],
      set: {
        body: cleanBody,
        updatedAt: now,
      },
    });

  return {
    status: "success",
    message: "Journal saved.",
  };
}

export async function deleteJournalEntry(
  entryId: string,
): Promise<JournalMutationResult> {
  const userId = await requireUserId();
  const cleanEntryId = entryId.trim();

  if (!cleanEntryId) {
    return {
      status: "error",
      message: "We could not find that Journal entry.",
    };
  }

  const [deleted] = await db
    .delete(journalEntries)
    .where(
      and(
        eq(journalEntries.id, cleanEntryId),
        eq(journalEntries.userId, userId),
      ),
    )
    .returning({ id: journalEntries.id });

  if (!deleted) {
    return {
      status: "error",
      message: "We could not find that Journal entry.",
    };
  }

  return {
    status: "success",
    message: "Journal deleted.",
  };
}
