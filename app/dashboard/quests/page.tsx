import type { Metadata } from "next";

import { QuestManager } from "@/components/product/quest-manager";
import { SetupGate } from "@/components/product/setup-gate";
import { Breadcrumb, HowItWorks, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getQuestManagerDataForUser } from "@/lib/pulse/quests";

export const metadata: Metadata = {
  title: "Quests · Pulse",
  description: "The repeatable actions that build your proof.",
};

export default async function QuestsPage() {
  const userId = await requireUserId();
  const data = await getQuestManagerDataForUser(userId);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Quests</PageTitle>
        <PageLead>
          Up to {data.activeQuestLimit} active quests. Their order here is their
          order on Today.
        </PageLead>
      </PageHeader>

      <QuestManager
        activeQuestLimit={data.activeQuestLimit}
        activeQuests={data.activeQuests}
        archivedQuests={data.archivedQuests}
      />

      <HowItWorks
        steps={[
          { title: "Active quests appear on Today", body: "Check in on each one as a win or a pass." },
          {
            title: "Archiving keeps the proof",
            body: "An archived quest leaves Today but its history stays. Restore it any time.",
          },
          {
            title: "Quests with no proof can be deleted",
            body: "Once a quest has a check-in, it can only be archived.",
          },
        ]}
      />
    </Page>
  );
}
