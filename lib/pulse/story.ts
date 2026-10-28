import "server-only";

import { aiModel, hasAiKey, missingAiKeyMessage } from "@/lib/pulse/ai-provider";

import { generateText, Output } from "ai";
import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  characters,
  checkIns,
  journalEntries,
  quests,
  weeklyStories,
} from "@/lib/db/schema";
import { logError } from "@/lib/observability/logger";
import {
  AiLimitReachedError,
  completeAiUsage,
  estimateAiTextTokens,
  failAiUsage,
  reserveAiUsage,
} from "@/lib/pulse/ai-limits";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";
import { offsetLocalDate, parseLocalDate } from "@/lib/pulse/local-date-core";
import { buildWeeklyStoryPrompt } from "@/lib/pulse/story-core";
import {
  getUserLocalDateContextForUser,
  type UserLocalDateContext,
} from "@/lib/pulse/user-settings";

export const weeklyStoryModel = "claude-haiku-5-5";

export type WeeklyStory = {
  id: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  summary: string;
  letterBody: string;
  patternBullets: string[];
  nextQuest: string;
  modelId: string;
  sourceCheckInCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type WeeklyStoryData =
  | {
      isSetupComplete: false;
      character: null;
      week: WeekRange;
      isPreviousWeek: false;
      currentWeekProof: [];
      currentWeekJournal: [];
      currentWeekStory: null;
      selectedStory: null;
      stories: [];
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      week: WeekRange;
      isPreviousWeek: boolean;
      currentWeekProof: WeeklyProof[];
      currentWeekJournal: WeeklyJournalReflection[];
      currentWeekStory: WeeklyStory | null;
      selectedStory: WeeklyStory | null;
      stories: WeeklyStory[];
    };

export type WeekRange = {
  start: string;
  end: string;
};

export type WeeklyProof = {
  id: string;
  localDate: string;
  outcome: "win" | "pass";
  note: string | null;
  questTitle: string;
};

export type WeeklyJournalReflection = {
  id: string;
  localDate: string;
  body: string;
};

const weeklyStorySchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(240),
  letterBody: z.string().min(1).max(2400),
  patternBullets: z.array(z.string().min(1).max(180)).min(2).max(4),
  nextQuest: z.string().min(1).max(180),
});

export class MissingWeeklyProofError extends Error {
  constructor() {
    super(
      "Check in or write a journal entry this week, then try again.",
    );
    this.name = "MissingWeeklyProofError";
  }
}

export class MissingAiGatewayKeyError extends Error {
  constructor() {
    super(missingAiKeyMessage);
    this.name = "MissingAiGatewayKeyError";
  }
}

export async function getWeeklyStoryData(
  selectedStoryId?: string,
): Promise<WeeklyStoryData> {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);

  return getWeeklyStoryDataForUser(userId, dateContext, selectedStoryId);
}

export async function getWeeklyStoryDataForUser(
  userId: string,
  dateContext: UserLocalDateContext,
  selectedStoryId?: string,
): Promise<WeeklyStoryData> {
  const thisWeek = getWeekRange(parseLocalDate(dateContext.today));
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
      week: thisWeek,
      isPreviousWeek: false,
      currentWeekProof: [],
      currentWeekJournal: [],
      currentWeekStory: null,
      selectedStory: null,
      stories: [],
    };
  }

  const [storyRows, recapWeek] = await Promise.all([
    db
      .select()
      .from(weeklyStories)
      .where(eq(weeklyStories.userId, userId))
      .orderBy(desc(weeklyStories.weekStart), desc(weeklyStories.updatedAt))
      .limit(10),
    resolveRecapWeek(userId, thisWeek),
  ]);
  const {
    week,
    isPreviousWeek,
    proof: currentWeekProof,
    journal: currentWeekJournal,
  } = recapWeek;

  const stories = storyRows.map(toWeeklyStory);
  const currentWeekStory =
    stories.find((story) => story.weekStart === week.start) ?? null;
  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ??
    currentWeekStory ??
    stories[0] ??
    null;

  return {
    isSetupComplete: true,
    character,
    week,
    isPreviousWeek,
    currentWeekProof,
    currentWeekJournal,
    currentWeekStory,
    selectedStory,
    stories,
  };
}

export async function generateAndSaveWeeklyStory() {
  if (!hasAiKey()) {
    throw new MissingAiGatewayKeyError();
  }

  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const thisWeek = getWeekRange(parseLocalDate(dateContext.today));
  const [character] = await db
    .select({
      id: characters.id,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (!character) {
    return null;
  }

  const [userQuests, { week, proof, journal }] = await Promise.all([
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
    resolveRecapWeek(userId, thisWeek),
  ]);

  if (proof.length === 0 && journal.length === 0) {
    throw new MissingWeeklyProofError();
  }

  const system =
    "You write weekly recaps inside Pulse, a habit app. Write warmly and specifically, in plain words. Never shame skipped days or focus on days in a row. Treat check-ins as evidence of who the person is becoming. Be honest and encouraging.";
  const prompt = buildWeeklyStoryPrompt({
    characterName: character.name,
    journal,
    proof,
    quests: userQuests.map((quest) => quest.title),
    week,
  });
  const reservation = await reserveAiUsage({
    userId,
    feature: "weekly-story",
    estimatedInputTokens: estimateAiTextTokens(`${system}\n${prompt}`),
    metadata: {
      action: "generateWeeklyStory",
      proofCount: proof.length,
      journalCount: journal.length,
    },
  });

  if (!reservation.allowed) {
    throw new AiLimitReachedError(
      reservation.message,
      reservation.retryAfterSeconds,
    );
  }

  let output: z.infer<typeof weeklyStorySchema>;

  try {
    const result = await generateText({
      model: aiModel(weeklyStoryModel),
      output: Output.object({
        schema: weeklyStorySchema,
      }),
      system,
      prompt,
      providerOptions: reservation.providerOptions,
      maxOutputTokens: reservation.maxOutputTokens,
    });
    output = result.output;
    await completeAiUsage({
      eventId: reservation.eventId,
      usage: result.totalUsage,
      finishReason: result.finishReason,
    });
  } catch (error) {
    logError({
      event: "weekly_story_generation_failed",
      message: "Weekly Story generation failed.",
      feature: "weekly-story",
      userId,
      error,
      metadata: {
        proofCount: proof.length,
        journalCount: journal.length,
      },
    });
    await failAiUsage({ eventId: reservation.eventId, error });
    throw error;
  }

  const now = new Date();
  const [story] = await db
    .insert(weeklyStories)
    .values({
      userId,
      characterId: character.id,
      weekStart: week.start,
      weekEnd: week.end,
      title: output.title,
      summary: output.summary,
      letterBody: output.letterBody,
      patternBullets: output.patternBullets,
      nextQuest: output.nextQuest,
      modelId: weeklyStoryModel,
      sourceCheckInCount: proof.length,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [weeklyStories.userId, weeklyStories.weekStart],
      set: {
        weekEnd: week.end,
        title: output.title,
        summary: output.summary,
        letterBody: output.letterBody,
        patternBullets: output.patternBullets,
        nextQuest: output.nextQuest,
        modelId: weeklyStoryModel,
        sourceCheckInCount: proof.length,
        updatedAt: now,
      },
    })
    .returning();

  return toWeeklyStory(story);
}

export function getWeekRange(date = new Date()): WeekRange {
  const startDate = new Date(date);
  const day = startDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    start: getLocalDate(startDate),
    end: getLocalDate(endDate),
  };
}

async function resolveRecapWeek(userId: string, thisWeek: WeekRange) {
  const [proof, journal] = await Promise.all([
    getProofForWeek(userId, thisWeek),
    getJournalForWeek(userId, thisWeek),
  ]);

  if (proof.length > 0 || journal.length > 0) {
    return { week: thisWeek, isPreviousWeek: false, proof, journal };
  }

  const previousStart = offsetLocalDate(thisWeek.start, -7);
  const previousWeek = { start: previousStart, end: offsetLocalDate(previousStart, 6) };
  const [previousProof, previousJournal, [previousStory]] = await Promise.all([
    getProofForWeek(userId, previousWeek),
    getJournalForWeek(userId, previousWeek),
    db
      .select({ id: weeklyStories.id })
      .from(weeklyStories)
      .where(
        and(
          eq(weeklyStories.userId, userId),
          eq(weeklyStories.weekStart, previousWeek.start),
        ),
      )
      .limit(1),
  ]);

  if (!previousStory && (previousProof.length > 0 || previousJournal.length > 0)) {
    return {
      week: previousWeek,
      isPreviousWeek: true,
      proof: previousProof,
      journal: previousJournal,
    };
  }

  return { week: thisWeek, isPreviousWeek: false, proof, journal };
}

async function getProofForWeek(
  userId: string,
  week: WeekRange,
): Promise<WeeklyProof[]> {
  const rows = await db
    .select({
      id: checkIns.id,
      localDate: checkIns.localDate,
      outcome: checkIns.outcome,
      note: checkIns.note,
      questTitle: quests.title,
    })
    .from(checkIns)
    .innerJoin(quests, eq(checkIns.questId, quests.id))
    .where(
      and(
        eq(checkIns.userId, userId),
        gte(checkIns.localDate, week.start),
        lte(checkIns.localDate, week.end),
      ),
    )
    .orderBy(asc(checkIns.localDate), asc(quests.position));

  return rows.map((row) => ({
    ...row,
    outcome: row.outcome === "pass" ? "pass" : "win",
  }));
}

async function getJournalForWeek(
  userId: string,
  week: WeekRange,
): Promise<WeeklyJournalReflection[]> {
  return db
    .select({
      id: journalEntries.id,
      localDate: journalEntries.localDate,
      body: journalEntries.body,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.localDate, week.start),
        lte(journalEntries.localDate, week.end),
      ),
    )
    .orderBy(asc(journalEntries.localDate));
}

function toWeeklyStory(story: typeof weeklyStories.$inferSelect): WeeklyStory {
  return {
    id: story.id,
    weekStart: story.weekStart,
    weekEnd: story.weekEnd,
    title: story.title,
    summary: story.summary,
    letterBody: story.letterBody,
    patternBullets: story.patternBullets,
    nextQuest: story.nextQuest,
    modelId: story.modelId,
    sourceCheckInCount: story.sourceCheckInCount,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
}
