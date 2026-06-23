import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  EnergyIcon,
  NotebookIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { CheckInList } from "@/components/product/check-in-list";
import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { MomentumCard } from "@/components/product/momentum-card";
import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { PulseAssistantLauncher } from "@/components/product/pulse-assistant-launcher";
import { SuggestionList } from "@/components/product/suggestion-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardDataForUser, requireUserId } from "@/lib/pulse/dashboard";
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

type Stat = {
  label: string;
  value: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
};


function getStats(
  characterName: string,
  questCount: number,
  checkInCount: number,
): Stat[] {
  return [
    {
      label: "Character",
      value: characterName,
      icon: Target01Icon,
    },
    {
      label: "Quests",
      value: `${questCount} planned`,
      icon: Calendar03Icon,
    },
    {
      label: "Check-ins",
      value: `${checkInCount}/${questCount} today`,
      icon: CheckmarkCircle01Icon,
    },
    {
      label: "Momentum",
      value: "Fresh start",
      icon: NotebookIcon,
    },
  ];
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const [dashboard, { suggestions, isAtQuestLimit }, momentum] =
    await Promise.all([
      getDashboardDataForUser(userId, dateContext),
      getSuggestionsDataForUser(userId, dateContext).then((raw) => ({
        suggestions: computeSuggestions(raw),
        isAtQuestLimit: raw.activeQuestCount >= 12,
      })),
      getMomentumDataForUser(userId, dateContext),
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
  const stats = getStats(
    dashboard.character.name,
    dashboard.quests.length,
    completedToday,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-2">
        <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Welcome back, {dashboard.character.name}.
        </h1>
        <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
          Check in on today&apos;s Quests and turn each Win or Pass into visible
          Proof.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-lg">
            <CardHeader>
              <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={stat.icon} size={17} strokeWidth={1.8} />
              </div>
              <CardTitle>{stat.label}</CardTitle>
              <CardDescription>{stat.value}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>
            Mark each Quest as a Win or Pass and add a short proof note.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckInList quests={dashboard.quests} />
        </CardContent>
      </Card>

      {suggestions.length > 0 ? (
        <SuggestionList
          suggestions={suggestions}
          isAtQuestLimit={isAtQuestLimit}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={EnergyIcon} size={17} strokeWidth={1.8} />
            </div>
            <CardTitle>Recent Proof</CardTitle>
            <CardDescription>
              Your latest Wins and Passes across saved Quests.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ProofHistoryGrid days={dashboard.proofHistory} />
            {dashboard.recentProof.length > 0 ? (
              <div className="grid gap-2 text-sm">
                {dashboard.recentProof.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-md border bg-muted/25 p-3"
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
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Check in on a Quest to start building Proof.
              </div>
            )}
          </CardContent>
        </Card>

        {momentum ? (
          <MomentumCard momentum={momentum} />
        ) : (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Momentum</CardTitle>
              <CardDescription>
                Add Quests and check in to see your score.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>
      <PulseAssistantLauncher />
    </div>
  );
}
