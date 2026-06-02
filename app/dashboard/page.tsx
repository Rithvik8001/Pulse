import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  NotebookIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard · Pulse",
  description: "Your Pulse dashboard.",
};

const stats = [
  {
    label: "Character",
    value: "Builder",
    icon: Target01Icon,
  },
  {
    label: "Quests",
    value: "3 planned",
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

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
          Authenticated workspace
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Build proof for the person you are becoming.
        </h1>
        <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
          This is the protected Pulse dashboard shell. Persistent Character,
          Quests, Check-ins, Wins, Proof, Journal, and Story data comes in the
          next product milestone.
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
            The real dashboard starts here once Pulse data moves out of the
            public demo and into Supabase-backed storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              Choose one Quest worth proving today.
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              Add a Check-in when you have evidence.
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              Turn the day into Momentum, not a fragile streak.
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
