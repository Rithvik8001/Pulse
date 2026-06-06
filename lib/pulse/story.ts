import "server-only";

import { generateText, Output } from "ai";
import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { characters, checkIns, quests, weeklyStories } from "@/lib/db/schema";
import { getLocalDate, requireUserId } from "@/lib/pulse/dashboard";

export const weeklyStoryModel = "openai/gpt-5.4-nano";

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
      currentWeekProof: [];
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
      currentWeekProof: WeeklyProof[];
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

const weeklyStorySchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(240),
  letterBody: z.string().min(1).max(2400),
  patternBullets: z.array(z.string().min(1).max(180)).min(2).max(4),
  nextQuest: z.string().min(1).max(180),
});

export class MissingWeeklyProofError extends Error {
  constructor() {
    super("Add at least one Check-in this week before generating a Story.");
    this.name = "MissingWeeklyProofError";
  }
}

export class MissingAiGatewayKeyError extends Error {
  constructor() {
    super("Add AI_GATEWAY_API_KEY to your environment before generating.");
    this.name = "MissingAiGatewayKeyError";
  }
}

export async function getWeeklyStoryData(
  selectedStoryId?: string,
): Promise<WeeklyStoryData> {
  const userId = await requireUserId();
  const week = getWeekRange();
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
      week,
      currentWeekProof: [],
      currentWeekStory: null,
      selectedStory: null,
      stories: [],
    };
  }

  const [storyRows, currentWeekProof] = await Promise.all([
    db
      .select()
      .from(weeklyStories)
      .where(eq(weeklyStories.userId, userId))
      .orderBy(desc(weeklyStories.weekStart), desc(weeklyStories.updatedAt))
      .limit(10),
    getProofForWeek(userId, week),
  ]);

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
    currentWeekProof,
    currentWeekStory,
    selectedStory,
    stories,
  };
}

export async function generateAndSaveWeeklyStory() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new MissingAiGatewayKeyError();
  }

  const userId = await requireUserId();
  const week = getWeekRange();
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

  const [userQuests, proof] = await Promise.all([
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
    getProofForWeek(userId, week),
  ]);

  if (proof.length === 0) {
    throw new MissingWeeklyProofError();
  }

  const { output } = await generateText({
    model: weeklyStoryModel,
    output: Output.object({
      schema: weeklyStorySchema,
    }),
    system:
      "You are Pulse, an identity-first reflection coach. Write warmly and specifically. Never shame missed days, never worship streaks, and always frame proof as evidence for who the user is becoming.",
    prompt: buildWeeklyStoryPrompt({
      characterName: character.name,
      proof,
      quests: userQuests.map((quest) => quest.title),
      week,
    }),
  });

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

function buildWeeklyStoryPrompt({
  characterName,
  proof,
  quests,
  week,
}: {
  characterName: string;
  proof: WeeklyProof[];
  quests: string[];
  week: WeekRange;
}) {
  const proofLines = proof
    .map((entry) => {
      const note = entry.note ? ` Note: ${entry.note}` : "";
      return `- ${entry.localDate}: ${entry.questTitle} = ${entry.outcome.toUpperCase()}.${note}`;
    })
    .join("\n");

  return `Write a Weekly Story for a Pulse user.

Character: ${characterName}
Week: ${week.start} through ${week.end}
Active quests: ${quests.join(", ")}

Proof from this week:
${proofLines}

Return a concise, emotionally intelligent reflection with:
- a title that sounds like a weekly letter, not a metric report
- a one-sentence summary
- a letter body in second person, 2-4 short paragraphs
- 2-4 pattern bullets grounded in the provided proof
- one next-week quest recommendation that is small and concrete`;
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
