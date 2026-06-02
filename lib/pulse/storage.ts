"use client";

const STORAGE_KEY = "pulse:mvp-state";
const VERSION = 1;

export type DailyEntryStatus = "done" | "skipped";

export type Identity = {
  id: string;
  name: string;
  createdAt: string;
};

export type Habit = {
  id: string;
  identityId: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
};

export type DailyEntry = {
  id: string;
  habitId: string;
  date: string;
  status: DailyEntryStatus;
  reflection?: string;
  createdAt: string;
  updatedAt: string;
};

export type PulseState = {
  version: number;
  identity: Identity | null;
  habits: Habit[];
  entries: DailyEntry[];
};

export type ProofStats = {
  daysOfProof: number;
  votesThisWeek: number;
  identityStrength: number;
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
    identity: null,
    habits: [],
    entries: [],
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
    const parsed = JSON.parse(raw) as Partial<PulseState>;

    return {
      version: VERSION,
      identity: parsed.identity ?? null,
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
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
  identityName: string,
  habitNames: string[],
): PulseState {
  const now = new Date().toISOString();
  const identity: Identity = {
    id: createId("identity"),
    name: normalizeIdentityName(identityName),
    createdAt: now,
  };

  return {
    version: VERSION,
    identity,
    habits: habitNames
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((name) => ({
        id: createId("habit"),
        identityId: identity.id,
        name,
        createdAt: now,
      })),
    entries: [],
  };
}

export function setHabitStatus(
  state: PulseState,
  habitId: string,
  status: DailyEntryStatus,
  reflection = "",
  date = getTodayKey(),
): PulseState {
  const now = new Date().toISOString();
  const nextEntries = [...state.entries];
  const existingIndex = nextEntries.findIndex(
    (entry) => entry.habitId === habitId && entry.date === date,
  );
  const existingReflection =
    getDailyReflection(state, date) || reflection.trim() || undefined;

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = {
      ...nextEntries[existingIndex],
      status,
      reflection: existingReflection,
      updatedAt: now,
    };
  } else {
    nextEntries.push({
      id: createId("entry"),
      habitId,
      date,
      status,
      reflection: existingReflection,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    ...state,
    entries: syncDailyReflection(nextEntries, date, reflection),
  };
}

export function setDailyReflection(
  state: PulseState,
  reflection: string,
  date = getTodayKey(),
): PulseState {
  return {
    ...state,
    entries: syncDailyReflection(state.entries, date, reflection),
  };
}

export function getDailyReflection(state: PulseState, date = getTodayKey()) {
  return (
    state.entries.find(
      (entry) => entry.date === date && typeof entry.reflection === "string",
    )?.reflection ?? ""
  );
}

export function getActiveHabits(state: PulseState) {
  return state.habits.filter((habit) => !habit.archivedAt);
}

export function getEntryForHabit(
  state: PulseState,
  habitId: string,
  date = getTodayKey(),
) {
  return state.entries.find(
    (entry) => entry.habitId === habitId && entry.date === date,
  );
}

export function getProofStats(
  state: PulseState,
  date = new Date(),
): ProofStats {
  const activeHabitIds = new Set(
    getActiveHabits(state).map((habit) => habit.id),
  );
  const doneEntries = state.entries.filter(
    (entry) => activeHabitIds.has(entry.habitId) && entry.status === "done",
  );
  const proofDates = new Set(doneEntries.map((entry) => entry.date));
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);

  const votesThisWeek = doneEntries.filter((entry) => {
    return entry.date >= weekStart && entry.date <= weekEnd;
  }).length;

  return {
    daysOfProof: proofDates.size,
    votesThisWeek,
    identityStrength: getIdentityStrength(state, date),
  };
}

export function getRecentDates(count = 7, from = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() - (count - 1 - index));
    return getTodayKey(date);
  });
}

export function getRecentReflectionEntries(state: PulseState, limit = 4) {
  const byDate = new Map<string, string>();

  for (const entry of state.entries) {
    if (entry.reflection?.trim()) {
      byDate.set(entry.date, entry.reflection.trim());
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([date, reflection]) => ({ date, reflection }));
}

function syncDailyReflection(
  entries: DailyEntry[],
  date: string,
  reflection: string,
) {
  const trimmed = reflection.trim();

  return entries.map((entry) => {
    if (entry.date !== date) {
      return entry;
    }

    return {
      ...entry,
      reflection: trimmed || undefined,
      updatedAt: new Date().toISOString(),
    };
  });
}

function getIdentityStrength(state: PulseState, date: Date) {
  const habits = getActiveHabits(state);

  if (habits.length === 0) {
    return 0;
  }

  const dates = getRecentDates(14, date);
  const possibleVotes = dates.length * habits.length;
  const doneVotes = state.entries.filter((entry) => {
    return (
      dates.includes(entry.date) &&
      entry.status === "done" &&
      habits.some((habit) => habit.id === entry.habitId)
    );
  }).length;

  if (possibleVotes === 0) {
    return 0;
  }

  return Math.min(100, Math.round((doneVotes / possibleVotes) * 100));
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

function normalizeIdentityName(name: string) {
  return name
    .trim()
    .replace(/^i\s+am\s+(an?\s+)?/i, "")
    .trim();
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
