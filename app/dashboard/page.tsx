import type { Metadata } from "next";
import Link from "next/link";

import { CheckInList } from "@/components/product/check-in-list";
import { MomentumCard } from "@/components/product/momentum-card";
import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { SetupGate } from "@/components/product/setup-gate";
import { StatStrip } from "@/components/product/stat-strip";
import { SuggestionList } from "@/components/product/suggestion-card";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Notice } from "@/components/ui/notice";
import { Page, PageHeader, PageLead, RelatedLinks, Statement } from "@/components/ui/page";
import { ActionRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SummaryBar } from "@/components/ui/summary-bar";
import { getDashboardDataForUser, requireUserId } from "@/lib/pulse/dashboard";
import { getIdentityTimelineDataForUser } from "@/lib/pulse/identity";
import { getMomentumDataForUser } from "@/lib/pulse/momentum";
import { computeSuggestions, getSuggestionsDataForUser } from "@/lib/pulse/suggestions";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Today · Pulse",
  description: "Check in on today's quests.",
};

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button variant="text" size="sm" asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const [dashboard, { suggestions, isAtQuestLimit }, momentum, identity] =
    await Promise.all([
      getDashboardDataForUser(userId, dateContext),
      getSuggestionsDataForUser(userId, dateContext).then((raw) => ({
        suggestions: computeSuggestions(raw),
        isAtQuestLimit: raw.activeQuestCount >= 12,
      })),
      getMomentumDataForUser(userId, dateContext),
      getIdentityTimelineDataForUser(userId, dateContext),
    ]);

  if (!dashboard.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const total = dashboard.quests.length;
  const completedToday = dashboard.quests.filter((quest) => quest.todayCheckIn).length;
  const activeStreaks = momentum?.questStreaks ?? [];
  const bestStreak = activeStreaks.reduce((max, quest) => Math.max(max, quest.currentStreak), 0);
  const sampledStreaks = activeStreaks.filter((quest) => quest.checkInCount30d > 0);
  const avgWinRate =
    sampledStreaks.length > 0
      ? Math.round(
          (sampledStreaks.reduce((sum, quest) => sum + quest.winRate30d, 0) /
            sampledStreaks.length) *
            100,
        )
      : null;
  const weekProofCount = dashboard.proofHistory
    .slice(-7)
    .reduce((sum, day) => sum + day.totalCount, 0);
  const atRisk = momentum?.atRiskCount ?? 0;

  const identityStatement = identity.isSetupComplete
    ? (identity.latestSnapshot?.identityStatement ??
      identity.views["90d"].fallbackSnapshot.identityStatement)
    : null;

  return (
    <Page>
      <PageHeader>
        <h1 className="type-display text-balance">
          Good to see you,{" "}
          <span className="underline-wipe">{dashboard.character.name}</span>.
        </h1>
        <PageLead>
          {completedToday} of {total} check-ins done today.
        </PageLead>
      </PageHeader>

      <Section title="Today">
        <CheckInList quests={dashboard.quests} />
        <SummaryBar caption={`${completedToday} of ${total} done`}>
          <TextLink href="/dashboard/quests">Edit quests</TextLink>
        </SummaryBar>
      </Section>

      {suggestions.length > 0 ? (
        <SuggestionList suggestions={suggestions} isAtQuestLimit={isAtQuestLimit} />
      ) : null}

      {atRisk > 0 ? (
        <Notice tone="warn" action={{ label: "View quests", href: "/dashboard/quests" }}>
          {atRisk === 1 ? "1 quest is" : `${atRisk} quests are`} at risk. Check in today
          to keep {atRisk === 1 ? "it" : "them"} going.
        </Notice>
      ) : null}

      <Section title="Snapshot" action={<TextLink href="/dashboard/stats">View stats</TextLink>}>
        <StatStrip
          stats={[
            {
              label: "Win rate, 30 days",
              value: avgWinRate !== null ? `${avgWinRate}%` : "None yet",
            },
            { label: "Check-ins this week", value: String(weekProofCount) },
            {
              label: "Best streak",
              value: bestStreak > 0 ? `${bestStreak} ${bestStreak === 1 ? "day" : "days"}` : "None yet",
            },
            { label: "Momentum", value: momentum ? `${momentum.score}` : "0" },
          ]}
        />
      </Section>

      {identityStatement ? (
        <Section
          title="Identity"
          action={<TextLink href="/dashboard/identity">View identity</TextLink>}
        >
          <Statement>{identityStatement}</Statement>
        </Section>
      ) : null}

      <Section
        title="Recent proof"
        action={<TextLink href="/dashboard/proof">View all proof</TextLink>}
      >
        <ProofHistoryGrid days={dashboard.proofHistory} />
        {dashboard.recentProof.length > 0 ? (
          <RowList>
            {dashboard.recentProof.slice(0, 3).map((proof) => (
              <ActionRow
                key={proof.id}
                leading={<FeatureChip feature="proof" />}
                title={proof.questTitle}
                caption={proof.note ? `${proof.localDate}: ${proof.note}` : proof.localDate}
                actions={<ProofOutcome outcome={proof.outcome} />}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Check in on a quest above to start building proof.</Notice>
        )}
      </Section>

      {momentum ? (
        <Section title="Momentum">
          <MomentumCard momentum={momentum} />
        </Section>
      ) : null}

      <RelatedLinks title="Reflect">
        <NavRow
          href="/dashboard/stats"
          feature="stats"
          title="Stats"
          caption="Win rate by week and by quest."
        />
        <NavRow
          href="/dashboard/identity"
          feature="identity"
          title="Identity"
          caption="Evidence of who you are becoming."
        />
        <NavRow href="/dashboard/story" feature="story" title="Story" caption="Your week, written up." />
      </RelatedLinks>
    </Page>
  );
}
