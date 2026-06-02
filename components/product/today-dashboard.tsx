"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  NotebookIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getActiveHabits,
  getDailyReflection,
  getEntryForHabit,
  getProofStats,
  getRecentDates,
  getRecentReflectionEntries,
  getTodayKey,
  type DailyEntryStatus,
  type PulseState,
  readPulseState,
  setDailyReflection,
  setHabitStatus,
  writePulseState,
} from "@/lib/pulse/storage";
import { cn } from "@/lib/utils";

export function TodayDashboard() {
  const [state, setState] = useState<PulseState | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const today = useMemo(() => getTodayKey(), []);
  const recentDates = useMemo(() => getRecentDates(7), []);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      const nextState = readPulseState();
      setState(nextState);
      setReflectionDraft(getDailyReflection(nextState, today));
    });

    return () => {
      isMounted = false;
    };
  }, [today]);

  if (!state) {
    return <TodaySkeleton />;
  }

  if (!state.identity) {
    return <EmptyToday />;
  }

  const currentState = state;
  const identity = state.identity;
  const habits = getActiveHabits(currentState);
  const stats = getProofStats(currentState);
  const reflections = getRecentReflectionEntries(currentState);

  function persist(nextState: PulseState) {
    writePulseState(nextState);
    setState(nextState);
  }

  function markHabit(habitId: string, status: DailyEntryStatus) {
    const nextState = setHabitStatus(
      currentState,
      habitId,
      status,
      reflectionDraft,
    );
    persist(nextState);
    setReflectionDraft(getDailyReflection(nextState, today));
  }

  function updateReflection(value: string) {
    setReflectionDraft(value);

    if (!currentState.entries.some((entry) => entry.date === today)) {
      return;
    }

    persist(setDailyReflection(currentState, value, today));
  }

  return (
    <main className="min-h-[calc(100svh-3.5rem)] bg-background px-4 py-5 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-4">
          <Card className="rounded-lg">
            <CardHeader className="gap-2 md:flex md:flex-row md:items-start md:justify-between">
              <div>
                <Badge variant="outline" className="mb-3">
                  {today}
                </Badge>
                <CardTitle className="text-xl md:text-2xl">
                  Good morning. You&apos;re a {identity.name}.
                </CardTitle>
                <CardDescription>
                  {stats.daysOfProof} days of proof · {habits.length} votes
                  available today
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/onboarding">Edit setup</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Identity strength"
                value={`${stats.identityStrength}`}
                suffix="/100"
              />
              <MetricCard
                label="Votes this week"
                value={`${stats.votesThisWeek}`}
                suffix="done"
              />
              <MetricCard
                label="Days of proof"
                value={`${stats.daysOfProof}`}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Today&apos;s votes</CardTitle>
              <CardDescription>
                Mark what happened. A skipped vote still keeps the story honest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {habits.map((habit) => {
                const entry = getEntryForHabit(currentState, habit.id, today);

                return (
                  <div
                    key={habit.id}
                    className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={entry?.status} />
                        <div className="truncate text-sm font-medium">
                          {habit.name}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        votes for · {identity.name}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex">
                      <Button
                        type="button"
                        variant={
                          entry?.status === "done" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => markHabit(habit.id, "done")}
                      >
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={15}
                          strokeWidth={1.7}
                        />
                        Done
                      </Button>
                      <Button
                        type="button"
                        variant={
                          entry?.status === "skipped" ? "secondary" : "ghost"
                        }
                        size="sm"
                        onClick={() => markHabit(habit.id, "skipped")}
                      >
                        <HugeiconsIcon
                          icon={CancelCircleIcon}
                          size={15}
                          strokeWidth={1.7}
                        />
                        Skip
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Today&apos;s reflection</CardTitle>
              <CardDescription>
                One honest line. It will be used for future pattern detection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={reflectionDraft}
                onChange={(event) => updateReflection(event.target.value)}
                placeholder="What did today's vote prove?"
                className="min-h-24 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {currentState.entries.some((entry) => entry.date === today)
                  ? "Saved locally."
                  : "Mark one habit done or skipped to attach this reflection."}
              </p>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Last 7 days</CardTitle>
              <CardDescription>
                Proof by habit, not fragile streaks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {habits.map((habit) => (
                <div key={habit.id} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium">{habit.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {recentDates.length}d
                    </span>
                  </div>
                  <div className="w-fit rounded-md border bg-muted/20 p-2">
                    <div className="grid grid-cols-7 gap-1.5">
                      {recentDates.map((date) => {
                        const entry = getEntryForHabit(
                          currentState,
                          habit.id,
                          date,
                        );

                        return (
                          <div
                            key={date}
                            title={`${date}: ${entry?.status ?? "open"}`}
                            aria-label={`${habit.name} on ${date}: ${
                              entry?.status ?? "open"
                            }`}
                            className={cn(
                              "size-3.5 rounded-[3px] border transition-colors",
                              getContributionCellClass(entry?.status),
                            )}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1.5 grid grid-cols-7 gap-1.5 font-mono text-[9px] leading-none text-muted-foreground">
                      {recentDates.map((date) => (
                        <span key={date} className="w-3.5 text-center">
                          {formatDayInitial(date)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-muted-foreground">
                <span>Open</span>
                <span className="size-2.5 rounded-[2px] border border-border bg-background" />
                <span className="size-2.5 rounded-[2px] border border-muted-foreground/20 bg-muted-foreground/20" />
                <span className="size-2.5 rounded-[2px] border border-foreground bg-foreground" />
                <span>Done</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Recent reflections</CardTitle>
              <CardDescription>
                Notes you have attached to proof.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reflections.length > 0 ? (
                <div className="space-y-3">
                  {reflections.map((reflection) => (
                    <div
                      key={reflection.date}
                      className="rounded-lg border p-3"
                    >
                      <div className="mb-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <HugeiconsIcon
                          icon={NotebookIcon}
                          size={13}
                          strokeWidth={1.7}
                        />
                        {reflection.date}
                      </div>
                      <p className="text-xs/relaxed">{reflection.reflection}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-xs/relaxed text-muted-foreground">
                  Reflections appear here after you attach a note to a daily
                  vote.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
        {suffix ? (
          <span className="ml-1 align-baseline text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status?: DailyEntryStatus }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full bg-muted ring-4 ring-muted/35",
        status === "done" && "bg-foreground ring-foreground/10",
        status === "skipped" && "bg-muted-foreground ring-muted",
      )}
    />
  );
}

function getContributionCellClass(status?: DailyEntryStatus) {
  if (status === "done") {
    return "border-foreground bg-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]";
  }

  if (status === "skipped") {
    return "border-muted-foreground/20 bg-muted-foreground/20";
  }

  return "border-border bg-background";
}

function formatDayInitial(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "narrow",
  });
}

function EmptyToday() {
  return (
    <main className="grid min-h-[calc(100svh-3.5rem)] place-items-center bg-background px-4 py-10">
      <Empty className="max-w-md border">
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Target01Icon} size={18} strokeWidth={1.7} />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No identity yet</EmptyTitle>
          <EmptyDescription>
            Create one identity and a few daily votes before using Today.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/onboarding">Start onboarding</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}

function TodaySkeleton() {
  return (
    <main className="min-h-[calc(100svh-3.5rem)] bg-background px-4 py-5 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </section>
        <aside className="space-y-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </aside>
      </div>
    </main>
  );
}
