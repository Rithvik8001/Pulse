import type { Metadata } from "next";

import { SetupGate } from "@/components/product/setup-gate";
import { StatsDashboard } from "@/components/product/stats-dashboard";
import { Notice } from "@/components/ui/notice";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getStatsDataForUser } from "@/lib/pulse/stats";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Stats · Pulse",
  description: "How your quests have gone, week by week.",
};

export default async function StatsPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getStatsDataForUser(userId, dateContext);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Stats</PageTitle>
        <PageLead>How your quests have gone over the last {data.range.weeks} weeks.</PageLead>
      </PageHeader>

      {data.summary.totalProof > 0 ? (
        <StatsDashboard
          questStats={data.questStats}
          questWeeklyStats={data.questWeeklyStats}
          weeklyTrend={data.weeklyTrend}
          locale={dateContext.locale}
        />
      ) : (
        <Notice action={{ label: "Go to today", href: "/dashboard" }}>
          Check in for a week to see your stats.
        </Notice>
      )}
    </Page>
  );
}
