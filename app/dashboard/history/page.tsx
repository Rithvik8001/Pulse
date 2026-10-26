import type { Metadata } from "next";

import { ProofArchive } from "@/components/product/proof-archive";
import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { SetupGate } from "@/components/product/setup-gate";
import { StatStrip } from "@/components/product/stat-strip";
import { StatsDashboard } from "@/components/product/stats-dashboard";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { Section } from "@/components/ui/section";
import { requireUserId } from "@/lib/pulse/dashboard";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getMomentumDataForUser } from "@/lib/pulse/momentum";
import { getProofArchiveDataForUser } from "@/lib/pulse/proof";
import { getStatsDataForUser } from "@/lib/pulse/stats";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "History - Pulse",
  description: "Every check-in, and how your habits are going.",
};

export default async function HistoryPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const [proof, stats, momentum] = await Promise.all([
    getProofArchiveDataForUser(userId, dateContext),
    getStatsDataForUser(userId, dateContext),
    getMomentumDataForUser(userId, dateContext),
  ]);

  if (!proof.isSetupComplete || !stats.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const locale = dateContext.locale;
  const format = (date: string) =>
    formatLocalDateForLocale(date, locale, { month: "short", day: "numeric" });
  const doneRate = stats.summary.overallWinRate;
  const streakByQuestId = Object.fromEntries(
    (momentum?.questStreaks ?? []).map((quest) => [quest.questId, quest.currentStreak]),
  );

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>History</PageTitle>
        <PageLead>
          Every check-in from {format(proof.range.start)} to {format(proof.range.end)}.
        </PageLead>
      </PageHeader>

      <div className="grid gap-4 rounded-card bg-fill p-5 sm:p-6">
        <StatStrip
          columns={3}
          stats={[
            { label: "Consistency", value: momentum ? `${momentum.score} of 100` : "None yet" },
            { label: "Done rate, 12 weeks", value: doneRate !== null ? `${doneRate}%` : "None yet" },
            { label: "Check-ins, 12 weeks", value: String(stats.summary.totalProof) },
          ]}
        />
        <p className="max-w-measure type-small text-fg-2">
          Consistency mixes how often you marked habits done in the last 30 days with how many
          days in a row you have checked in.
        </p>
      </div>

      <Section title="Last 8 weeks">
        <ProofHistoryGrid days={proof.days.slice(-56)} cellClassName="sm:size-5" locale={locale} />
      </Section>

      <StatsDashboard
        weeklyTrend={stats.weeklyTrend}
        questStats={stats.questStats}
        streakByQuestId={streakByQuestId}
        locale={locale}
      />

      <ProofArchive entries={proof.entries} questOptions={proof.questOptions} locale={locale} />
    </Page>
  );
}
