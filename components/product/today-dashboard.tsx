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
  getActiveQuests,
  getCheckInForQuest,
  getDailyJournalNote,
  getProofStats,
  getRecentDates,
  getRecentJournalNotes,
  getTodayKey,
  type CheckInStatus,
  type PulseState,
  readPulseState,
  setDailyJournalNote,
  setQuestStatus,
  writePulseState,
} from "@/lib/pulse/storage";
import { cn } from "@/lib/utils";

export function TodayDashboard() {
  const [state, setState] = useState<PulseState | null>(null);
  const [journalDraft, setJournalDraft] = useState("");
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
      setJournalDraft(getDailyJournalNote(nextState, today));
    });

    return () => {
      isMounted = false;
    };
  }, [today]);

  if (!state) {
    return <TodaySkeleton />;
  }

  if (!state.character) {
    return <EmptyToday />;
  }

  const currentState = state;
  const character = state.character;
  const quests = getActiveQuests(currentState);
  const stats = getProofStats(currentState);
  const journalNotes = getRecentJournalNotes(currentState);

  function persist(nextState: PulseState) {
    writePulseState(nextState);
    setState(nextState);
  }

  function markQuest(questId: string, status: CheckInStatus) {
    const nextState = setQuestStatus(
      currentState,
      questId,
      status,
      journalDraft,
    );
    persist(nextState);
    setJournalDraft(getDailyJournalNote(nextState, today));
  }

  function updateJournal(value: string) {
    setJournalDraft(value);

    if (!currentState.checkIns.some((checkIn) => checkIn.date === today)) {
      return;
    }

    persist(setDailyJournalNote(currentState, value, today));
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
                  Good morning. You&apos;re a {character.name}.
                </CardTitle>
                <CardDescription>
                  {stats.proofDays} proof days · {quests.length} quests
                  waiting today
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/onboarding">Edit setup</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Momentum"
                value={`${stats.momentum}`}
                suffix="/100"
              />
              <MetricCard
                label="Wins this week"
                value={`${stats.winsThisWeek}`}
                suffix="wins"
              />
              <MetricCard
                label="Proof days"
                value={`${stats.proofDays}`}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Today&apos;s quests</CardTitle>
              <CardDescription>
                Mark what happened. A pass still keeps the story honest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quests.map((quest) => {
                const checkIn = getCheckInForQuest(
                  currentState,
                  quest.id,
                  today,
                );

                return (
                  <div
                    key={quest.id}
                    className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={checkIn?.status} />
                        <div className="truncate text-sm font-medium">
                          {quest.name}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        proves · {character.name}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex">
                      <Button
                        type="button"
                        variant={
                          checkIn?.status === "win" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => markQuest(quest.id, "win")}
                      >
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={15}
                          strokeWidth={1.7}
                        />
                        Win
                      </Button>
                      <Button
                        type="button"
                        variant={
                          checkIn?.status === "pass" ? "secondary" : "ghost"
                        }
                        size="sm"
                        onClick={() => markQuest(quest.id, "pass")}
                      >
                        <HugeiconsIcon
                          icon={CancelCircleIcon}
                          size={15}
                          strokeWidth={1.7}
                        />
                        Pass
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Today&apos;s journal</CardTitle>
              <CardDescription>
                One honest line. It will be used for future pattern detection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={journalDraft}
                onChange={(event) => updateJournal(event.target.value)}
                placeholder="What did today's quests prove?"
                className="min-h-24 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {currentState.checkIns.some((checkIn) => checkIn.date === today)
                  ? "Saved locally."
                  : "Mark one quest as a win or pass to attach this journal note."}
              </p>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Last 7 days</CardTitle>
              <CardDescription>
                Proof by quest, not fragile streaks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quests.map((quest) => (
                <div key={quest.id} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium">{quest.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {recentDates.length}d
                    </span>
                  </div>
                  <div className="w-fit rounded-md border bg-muted/20 p-2">
                    <div className="grid grid-cols-7 gap-1.5">
                      {recentDates.map((date) => {
                        const checkIn = getCheckInForQuest(
                          currentState,
                          quest.id,
                          date,
                        );

                        return (
                          <div
                            key={date}
                            title={`${date}: ${formatStatusLabel(checkIn?.status)}`}
                            aria-label={`${quest.name} on ${date}: ${
                              formatStatusLabel(checkIn?.status)
                            }`}
                            className={cn(
                              "size-3.5 rounded-[3px] border transition-colors",
                              getContributionCellClass(checkIn?.status),
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
                <span className="size-2.5 rounded-[2px] border border-[var(--primary)] bg-[var(--primary)]" />
                <span>Win</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Recent journal</CardTitle>
              <CardDescription>
                Notes you have attached to proof.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journalNotes.length > 0 ? (
                <div className="space-y-3">
                  {journalNotes.map((journalNote) => (
                    <div
                      key={journalNote.date}
                      className="rounded-lg border p-3"
                    >
                      <div className="mb-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <HugeiconsIcon
                          icon={NotebookIcon}
                          size={13}
                          strokeWidth={1.7}
                        />
                        {journalNote.date}
                      </div>
                      <p className="text-xs/relaxed">
                        {journalNote.journalNote}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-xs/relaxed text-muted-foreground">
                  Journal notes appear here after you attach one to a daily
                  quest.
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

function StatusDot({ status }: { status?: CheckInStatus }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full bg-muted ring-4 ring-muted/35",
        status === "win" &&
          "bg-[var(--primary)] ring-[color-mix(in_oklch,var(--primary),transparent_82%)]",
        status === "pass" && "bg-muted-foreground ring-muted",
      )}
    />
  );
}

function getContributionCellClass(status?: CheckInStatus) {
  if (status === "win") {
    return "border-[var(--primary)] bg-[var(--primary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]";
  }

  if (status === "pass") {
    return "border-muted-foreground/20 bg-muted-foreground/20";
  }

  return "border-border bg-background";
}

function formatDayInitial(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "narrow",
  });
}

function formatStatusLabel(status?: CheckInStatus) {
  if (status === "win") {
    return "win";
  }

  if (status === "pass") {
    return "pass";
  }

  return "open";
}

function EmptyToday() {
  return (
    <main className="grid min-h-[calc(100svh-3.5rem)] place-items-center bg-background px-4 py-10">
      <Empty className="max-w-md border">
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Target01Icon} size={18} strokeWidth={1.7} />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No character yet</EmptyTitle>
          <EmptyDescription>
            Create one character and a few daily quests before using Today.
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
