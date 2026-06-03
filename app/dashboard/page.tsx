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

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardData } from "@/lib/pulse/dashboard";

export const metadata: Metadata = {
  title: "Dashboard · Pulse",
  description: "Your Pulse dashboard.",
};

type Stat = {
  label: string;
  value: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
};

function getStats(characterName: string, questCount: number): Stat[] {
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
      value: "Ready",
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
  const dashboard = await getDashboardData();

  if (!dashboard.isSetupComplete) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Authenticated setup
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Build proof for the person you are becoming.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Start by saving one Character and a few Quests. Pulse will use this
            as the foundation for Check-ins, Proof, Journal, and Story.
          </p>
        </section>
        <DashboardSetupForm />
      </main>
    );
  }

  const stats = getStats(dashboard.character.name, dashboard.quests.length);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
          Authenticated workspace
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          You are building {dashboard.character.name}.
        </h1>
        <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
          Your first Quests are saved. The next product milestone turns these
          into daily Check-ins, Proof, Journal entries, and Momentum.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-lg">
            <CardHeader>
              <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={stat.icon}
                  size={17}
                  strokeWidth={1.8}
                />
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
            Choose one Quest worth proving today. Check-ins arrive next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {dashboard.quests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3"
              >
                <span className="min-w-0 truncate">{quest.title}</span>
                <Badge variant="outline" className="shrink-0">
                  Quest {quest.position}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={EnergyIcon} size={17} strokeWidth={1.8} />
          </div>
          <CardTitle>Proof starts here</CardTitle>
          <CardDescription>
            Your setup is persistent now. Wins, Passes, and Momentum can build
            on this saved foundation.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
