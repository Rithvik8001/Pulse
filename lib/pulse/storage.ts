"use client";

const STORAGE_KEY = "pulse:mvp-state";
const VERSION = 2;

export type CheckInStatus = "win" | "pass";

export type Character = {
  id: string;
  name: string;
  createdAt: string;
};

export type Quest = {
  id: string;
  characterId: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
};

export type CheckIn = {
  id: string;
  questId: string;
  date: string;
  status: CheckInStatus;
  journalNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type PulseState = {
  version: number;
  character: Character | null;
  quests: Quest[];
  checkIns: CheckIn[];
};

export type ProofStats = {
  proofDays: number;
  winsThisWeek: number;
  momentum: number;
};

type LegacyDailyEntryStatus = "done" | "skipped";

type LegacyPulseState = {
  version?: number;
  identity?: Character | null;
  habits?: Array<{
    id: string;
    identityId: string;
    name: string;
    createdAt: string;
    archivedAt?: string;
  }>;
  entries?: Array<{
    id: string;
    habitId: string;
    date: string;
    status: LegacyDailyEntryStatus;
    reflection?: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getEmptyState(): PulseState {
  return {
    version: VERSION,
    character: null,
    quests: [],
    checkIns: [],
  };
}

export function readPulseState(): PulseState {
  if (typeof window === "undefined") {
    return getEmptyState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return getEmptyState();
  }

  try {
    return normalizePulseState(JSON.parse(raw));
  } catch {
    return getEmptyState();
  }
}

export function writePulseState(state: PulseState) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...state, version: VERSION }),
  );
}

export function clearPulseState() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createInitialPulseState(
  characterName: string,
  questNames: string[],
): PulseState {
  const now = new Date().toISOString();
  const character: Character = {
    id: createId("character"),
    name: normalizeCharacterName(characterName),
    createdAt: now,
  };

  return {
    version: VERSION,
    character,
    quests: questNames
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((name) => ({
        id: createId("quest"),
        characterId: character.id,
        name,
        createdAt: now,
      })),
    checkIns: [],
  };
}

export function setQuestStatus(
  state: PulseState,
  questId: string,
  status: CheckInStatus,
  journalNote = "",
  date = getTodayKey(),
): PulseState {
  const now = new Date().toISOString();
  const nextCheckIns = [...state.checkIns];
  const existingIndex = nextCheckIns.findIndex(
    (checkIn) => checkIn.questId === questId && checkIn.date === date,
  );
  const existingJournalNote =
    getDailyJournalNote(state, date) || journalNote.trim() || undefined;

  if (existingIndex >= 0) {
    nextCheckIns[existingIndex] = {
      ...nextCheckIns[existingIndex],
      status,
      journalNote: existingJournalNote,
      updatedAt: now,
    };
  } else {
    nextCheckIns.push({
      id: createId("check_in"),
      questId,
      date,
      status,
      journalNote: existingJournalNote,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    ...state,
    checkIns: syncDailyJournalNote(nextCheckIns, date, journalNote),
  };
}

export function setDailyJournalNote(
  state: PulseState,
  journalNote: string,
  date = getTodayKey(),
): PulseState {
  return {
    ...state,
    checkIns: syncDailyJournalNote(state.checkIns, date, journalNote),
  };
}

export function getDailyJournalNote(state: PulseState, date = getTodayKey()) {
  return (
    state.checkIns.find(
      (checkIn) =>
        checkIn.date === date && typeof checkIn.journalNote === "string",
    )?.journalNote ?? ""
  );
}

export function getActiveQuests(state: PulseState) {
  return state.quests.filter((quest) => !quest.archivedAt);
}

export function getCheckInForQuest(
  state: PulseState,
  questId: string,
  date = getTodayKey(),
) {
  return state.checkIns.find(
    (checkIn) => checkIn.questId === questId && checkIn.date === date,
  );
}

export function getProofStats(
  state: PulseState,
  date = new Date(),
): ProofStats {
  const activeQuestIds = new Set(getActiveQuests(state).map((quest) => quest.id));
  const winCheckIns = state.checkIns.filter(
    (checkIn) => activeQuestIds.has(checkIn.questId) && checkIn.status === "win",
  );
  const proofDates = new Set(winCheckIns.map((checkIn) => checkIn.date));
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);

  const winsThisWeek = winCheckIns.filter((checkIn) => {
    return checkIn.date >= weekStart && checkIn.date <= weekEnd;
  }).length;

  return {
    proofDays: proofDates.size,
    winsThisWeek,
    momentum: getMomentum(state, date),
  };
}

export function getRecentDates(count = 7, from = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() - (count - 1 - index));
    return getTodayKey(date);
  });
}

export function getRecentJournalNotes(state: PulseState, limit = 4) {
  const byDate = new Map<string, string>();

  for (const checkIn of state.checkIns) {
    if (checkIn.journalNote?.trim()) {
      byDate.set(checkIn.date, checkIn.journalNote.trim());
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([date, journalNote]) => ({ date, journalNote }));
}

function normalizePulseState(value: unknown): PulseState {
  const parsed = value as Partial<PulseState> & LegacyPulseState;

  if ("character" in parsed || "quests" in parsed || "checkIns" in parsed) {
    return {
      version: VERSION,
      character: parsed.character ?? null,
      quests: Array.isArray(parsed.quests) ? parsed.quests : [],
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : [],
    };
  }

  return {
    version: VERSION,
    character: parsed.identity ?? null,
    quests: Array.isArray(parsed.habits)
      ? parsed.habits.map((habit) => ({
          id: renameLegacyId(habit.id, "habit", "quest"),
          characterId: renameLegacyId(habit.identityId, "identity", "character"),
          name: habit.name,
          createdAt: habit.createdAt,
          archivedAt: habit.archivedAt,
        }))
      : [],
    checkIns: Array.isArray(parsed.entries)
      ? parsed.entries.map((entry) => ({
          id: renameLegacyId(entry.id, "entry", "check_in"),
          questId: renameLegacyId(entry.habitId, "habit", "quest"),
          date: entry.date,
          status: entry.status === "done" ? "win" : "pass",
          journalNote: entry.reflection,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }))
      : [],
  };
}

function syncDailyJournalNote(
  checkIns: CheckIn[],
  date: string,
  journalNote: string,
) {
  const trimmed = journalNote.trim();

  return checkIns.map((checkIn) => {
    if (checkIn.date !== date) {
      return checkIn;
    }

    return {
      ...checkIn,
      journalNote: trimmed || undefined,
      updatedAt: new Date().toISOString(),
    };
  });
}

function getMomentum(state: PulseState, date: Date) {
  const quests = getActiveQuests(state);

  if (quests.length === 0) {
    return 0;
  }

  const dates = getRecentDates(14, date);
  const possibleWins = dates.length * quests.length;
  const actualWins = state.checkIns.filter((checkIn) => {
    return (
      dates.includes(checkIn.date) &&
      checkIn.status === "win" &&
      quests.some((quest) => quest.id === checkIn.questId)
    );
  }).length;

  if (possibleWins === 0) {
    return 0;
  }

  return Math.min(100, Math.round((actualWins / possibleWins) * 100));
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);

  return getTodayKey(weekStart);
}

function getWeekEnd(date: Date) {
  const weekEnd = new Date(date);
  const day = weekEnd.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  weekEnd.setDate(weekEnd.getDate() + diff);

  return getTodayKey(weekEnd);
}

function normalizeCharacterName(name: string) {
  return name
    .trim()
    .replace(/^i\s+am\s+(an?\s+)?/i, "")
    .trim();
}

function renameLegacyId(id: string, from: string, to: string) {
  return id.startsWith(`${from}_`) ? id.replace(`${from}_`, `${to}_`) : id;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
