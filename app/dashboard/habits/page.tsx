import type { Metadata } from "next";

import { QuestManager } from "@/components/product/quest-manager";
import { SetupGate } from "@/components/product/setup-gate";
import { SuggestionList } from "@/components/product/suggestion-card";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getMomentumDataForUser } from "@/lib/pulse/momentum";
import { getQuestManagerDataForUser } from "@/lib/pulse/quests";
import { computeSuggestions, getSuggestionsDataForUser } from "@/lib/pulse/suggestions";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Habits - Pulse",
  description: "Add, order and archive your habits.",
};

export default async function HabitsPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const [data, momentum, rawSuggestions] = await Promise.all([
    getQuestManagerDataForUser(userId),
    getMomentumDataForUser(userId, dateContext),
    getSuggestionsDataForUser(userId, dateContext),
  ]);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const streakByQuestId = Object.fromEntries(
    (momentum?.questStreaks ?? []).map((quest) => [quest.questId, quest.currentStreak]),
  );
  const suggestions = computeSuggestions(rawSuggestions).slice(0, 3);
  const isAtLimit = data.activeQuests.length >= data.activeQuestLimit;

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Habits</PageTitle>
        <PageLead>
          Up to {data.activeQuestLimit} active habits. They show on Today in this order.
        </PageLead>
      </PageHeader>

      <QuestManager
        activeQuestLimit={data.activeQuestLimit}
        activeQuests={data.activeQuests}
        archivedQuests={data.archivedQuests}
        streakByQuestId={streakByQuestId}
        suggestions={<SuggestionList suggestions={suggestions} isAtQuestLimit={isAtLimit} />}
      />
    </Page>
  );
}
