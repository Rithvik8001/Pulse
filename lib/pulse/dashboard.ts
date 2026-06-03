import "server-only";

import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { characters, quests } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type DashboardQuest = {
  id: string;
  title: string;
  position: number;
};

export type DashboardData =
  | {
      isSetupComplete: false;
      character: null;
      quests: [];
    }
  | {
      isSetupComplete: true;
      character: {
        id: string;
        name: string;
      };
      quests: DashboardQuest[];
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
    };
  }

  const userQuests = await db
    .select({
      id: quests.id,
      title: quests.title,
      position: quests.position,
    })
    .from(quests)
    .where(eq(quests.userId, userId))
    .orderBy(asc(quests.position));

  return {
    isSetupComplete: true,
    character,
    quests: userQuests,
  };
}
