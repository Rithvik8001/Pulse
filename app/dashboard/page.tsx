import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon,
  AiBrain01Icon,
  ArrowRight02Icon,
  ChartLineData01Icon,
  ChevronDownIcon,
  EnergyIcon,
  NotebookIcon,
  PencilEdit01Icon,
  PlusSignIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { CheckInList } from "@/components/product/check-in-list";
import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { MomentumCard } from "@/components/product/momentum-card";
import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { PulseAssistantLauncher } from "@/components/product/pulse-assistant-launcher";
import { SectionLabel } from "@/components/product/section-label";
import { StatGridCard, type StatTile } from "@/components/product/stat-grid-card";
import { SuggestionList } from "@/components/product/suggestion-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDashboardDataForUser, requireUserId } from "@/lib/pulse/dashboard";
import { getIdentityTimelineDataForUser } from "@/lib/pulse/identity";
import { getMomentumDataForUser } from "@/lib/pulse/momentum";
import {
  computeSuggestions,
  getSuggestionsDataForUser,
} from "@/lib/pulse/suggestions";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Dashboard · Pulse",
  description: "Your Pulse dashboard.",
};

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
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Authenticated setup
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Build proof for the person you are becoming.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Start by saving one Character and a few Quests. Pulse will use this
            as the foundation for Check-ins, Proof, Journal, and Story.
          </p>
        </section>
        <DashboardSetupForm />
        <PulseAssistantLauncher showHabits={false} />
      </div>
    );
  }

  const completedToday = dashboard.quests.filter(
    (quest) => quest.todayCheckIn,
  ).length;

  const activeStreaks = momentum?.questStreaks ?? [];
  const bestStreak = activeStreaks.reduce(
    (max, quest) => Math.max(max, quest.currentStreak),
    0,
  );
  const sampledStreaks = activeStreaks.filter(
    (quest) => quest.checkInCount30d > 0,
  );
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

  const snapshotTiles: StatTile[] = [
    {
      label: "Quests",
      value: `${dashboard.quests.length}`,
      hint: "Active Quests you are tracking.",
      dotClassName: "bg-primary",
    },
    {
      label: "Check-ins",
      value: `${completedToday}/${dashboard.quests.length}`,
      hint: "Quests checked in today.",
      dotClassName: "bg-sky-500",
    },
    {
      label: "Momentum",
      value: momentum ? `${momentum.score}` : "—",
      hint: "Consistency score out of 100.",
      dotClassName: "bg-emerald-500",
    },
    {
      label: "Best streak",
      value: bestStreak > 0 ? `${bestStreak}d` : "—",
      hint: "Longest active streak in days.",
      dotClassName: "bg-orange-500",
    },
    {
      label: "Win rate",
      value: avgWinRate !== null ? `${avgWinRate}%` : "—",
      hint: "Average 30-day win rate.",
      dotClassName: "bg-violet-500",
    },
    {
      label: "At risk",
      value: momentum ? `${momentum.atRiskCount}` : "0",
      hint: "Streaks that lapse without a check-in today.",
      dotClassName: "bg-amber-500",
    },
    {
      label: "This week",
      value: `${weekProofCount}`,
      hint: "Check-ins logged in the last 7 days.",
      dotClassName: "bg-rose-500",
    },
    {
      label: "Tier",
      value: momentum ? momentum.tier : "New",
      hint: "Your current momentum tier.",
      dotClassName: "bg-fuchsia-500",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Welcome back, {dashboard.character.name}.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Check in on today&apos;s Quests and turn each Win or Pass into
            visible Proof.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 shrink-0 rounded-xl bg-foreground px-4 font-mono text-xs font-medium tracking-[0.08em] text-background uppercase hover:bg-foreground/85">
              <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={2} />
              New
              <HugeiconsIcon icon={ChevronDownIcon} size={13} strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/quests">
                <HugeiconsIcon icon={Target01Icon} size={14} strokeWidth={1.8} />
                New Quest
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/journal">
                <HugeiconsIcon icon={NotebookIcon} size={14} strokeWidth={1.8} />
                New Journal Entry
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/story">
                <HugeiconsIcon
                  icon={PencilEdit01Icon}
                  size={14}
                  strokeWidth={1.8}
                />
                Generate Weekly Story
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {suggestions.length > 0 ? (
        <SuggestionList
          suggestions={suggestions}
          isAtQuestLimit={isAtQuestLimit}
        />
      ) : null}

      <section className="grid gap-3">
        <SectionLabel icon={Target01Icon}>Today</SectionLabel>
        <CheckInList quests={dashboard.quests} />
      </section>

      <section className="grid gap-3">
        <SectionLabel icon={ChartLineData01Icon}>Snapshot</SectionLabel>
        <StatGridCard
          caption="Keep track of your Character's overall progress."
          rangeLabel="Last 30 days"
          tiles={snapshotTiles}
          footerHref="/dashboard/stats"
          footerLabel="View full stats"
        />
      </section>

      {identity.isSetupComplete &&
      (identity.latestSnapshot || identity.views["90d"].nodes.length > 0) ? (
        <section className="grid gap-3">
          <SectionLabel icon={AiBrain01Icon}>Identity</SectionLabel>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={19}
                  strokeWidth={1.7}
                />
              </div>
              <div className="min-w-0">
                <div className="font-heading text-base font-medium">
                  Identity evidence
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {identity.latestSnapshot
                    ? identity.latestSnapshot.identityStatement
                    : identity.views["90d"].fallbackSnapshot.identityStatement}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/identity"
              className="inline-flex shrink-0 items-center gap-1.5 self-start font-mono text-[11px] font-medium tracking-[0.08em] text-primary uppercase transition-opacity hover:opacity-70 sm:self-center"
            >
              Open Identity
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={13}
                strokeWidth={1.9}
              />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <SectionLabel icon={EnergyIcon}>Recent Proof</SectionLabel>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Your latest Wins and Passes across saved Quests.
            </p>
          </div>
          <div className="grid gap-3 p-5">
            <ProofHistoryGrid days={dashboard.proofHistory} />
            {dashboard.recentProof.length > 0 ? (
              <div className="grid gap-2 text-sm">
                {dashboard.recentProof.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-xl border bg-muted/25 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {proof.questTitle}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {proof.localDate}
                        </div>
                      </div>
                      <Badge
                        variant={
                          proof.outcome === "win" ? "default" : "secondary"
                        }
                        className="shrink-0"
                      >
                        {proof.outcome === "win" ? "Win" : "Pass"}
                      </Badge>
                    </div>
                    {proof.note ? (
                      <p className="mt-2 line-clamp-2 text-xs/relaxed text-muted-foreground">
                        {proof.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Check in on a Quest to start building Proof.
              </div>
            )}
          </div>
          <div className="flex justify-center border-t px-5 py-4">
            <Link
              href="/dashboard/proof"
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-[11px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-muted"
            >
              View Proof archive
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={13}
                strokeWidth={1.9}
              />
            </Link>
          </div>
        </div>
      </section>

      {momentum ? (
        <section className="grid gap-3">
          <SectionLabel icon={Activity01Icon}>Momentum</SectionLabel>
          <MomentumCard momentum={momentum} />
        </section>
      ) : null}

      <PulseAssistantLauncher />
    </div>
  );
}
