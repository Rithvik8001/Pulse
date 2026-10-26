import type { Metadata } from "next";

import { ProofArchive } from "@/components/product/proof-archive";
import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { SetupGate } from "@/components/product/setup-gate";
import { StatStrip } from "@/components/product/stat-strip";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { Section } from "@/components/ui/section";
import { requireUserId } from "@/lib/pulse/dashboard";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getProofArchiveDataForUser } from "@/lib/pulse/proof";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Proof · Pulse",
  description: "Every check-in you have saved.",
};

export default async function ProofPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getProofArchiveDataForUser(userId, dateContext);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const winRate =
    data.stats.total > 0 ? Math.round((data.stats.winCount / data.stats.total) * 100) : null;
  const format = (date: string) =>
    formatLocalDateForLocale(date, dateContext.locale, { month: "short", day: "numeric" });

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Proof</PageTitle>
        <PageLead>
          Every check-in from {format(data.range.start)} to {format(data.range.end)}.
        </PageLead>
      </PageHeader>

      <StatStrip
        stats={[
          { label: "Check-ins", value: String(data.stats.total) },
          { label: "Wins", value: String(data.stats.winCount) },
          { label: "Passes", value: String(data.stats.passCount) },
          { label: "Win rate", value: winRate !== null ? `${winRate}%` : "None yet" },
        ]}
      />

      <Section title="Last 90 days">
        <ProofHistoryGrid days={data.days} cellClassName="sm:size-5" />
      </Section>

      <ProofArchive entries={data.entries} questOptions={data.questOptions} locale={dateContext.locale} />
    </Page>
  );
}
