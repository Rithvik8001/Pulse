import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  NotebookIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { WeeklyStoryForm } from "@/components/product/weekly-story-form";
import { Badge } from "@/components/ui/badge";
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
import {
  getWeeklyStoryData,
  type WeeklyJournalReflection,
  type WeeklyProof,
  type WeeklyStory,
} from "@/lib/pulse/story";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Story · Pulse",
  description: "Generate and revisit your Pulse Weekly Stories.",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function weekLabel(story: Pick<WeeklyStory, "weekStart" | "weekEnd">) {
  return `${formatDate(story.weekStart)}-${formatDate(story.weekEnd)}`;
}

function StoryLetter({ story }: { story: WeeklyStory | null }) {
  if (!story) {
    return (
      <Empty className="min-h-[360px] rounded-lg border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={NotebookIcon} size={18} strokeWidth={1.8} />
          </EmptyMedia>
          <EmptyTitle>No Weekly Story yet</EmptyTitle>
          <EmptyDescription>
            Generate a Story once this week has at least one Check-in or
            Journal entry.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const paragraphs = story.letterBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{weekLabel(story)}</Badge>
            <span className="text-xs text-muted-foreground">
              {story.sourceCheckInCount} source Check-in
              {story.sourceCheckInCount === 1 ? "" : "s"}
            </span>
          </div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {story.title}
          </h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDateTime(story.updatedAt)}
        </div>
      </div>

      <p className="mt-4 max-w-[72ch] text-sm/relaxed text-muted-foreground">
        {story.summary}
      </p>

      <div className="mt-5 space-y-3 text-sm/relaxed">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.78fr]">
        <div className="rounded-md border bg-muted/25 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={15}
              strokeWidth={1.7}
              className="text-primary"
            />
            Patterns Pulse noticed
          </div>
          <div className="grid gap-2 text-xs/relaxed text-muted-foreground">
            {story.patternBullets.map((pattern) => (
              <div key={pattern} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{pattern}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <HugeiconsIcon icon={Target01Icon} size={15} strokeWidth={1.7} />
            Next week&apos;s one Quest
          </div>
          <p className="text-xs/relaxed text-muted-foreground">
            {story.nextQuest}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProofSourceList({ proof }: { proof: WeeklyProof[] }) {
  if (proof.length === 0) {
    return (
      <Empty className="rounded-lg border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Calendar03Icon} size={18} strokeWidth={1.8} />
          </EmptyMedia>
          <EmptyTitle>No proof this week</EmptyTitle>
          <EmptyDescription>
            Check in on a Quest before asking Pulse to write this week&apos;s
            Story.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link className="font-medium text-primary" href="/dashboard">
            Go to today&apos;s Check-ins
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-2">
      {proof.map((entry) => (
        <div key={entry.id} className="rounded-md border bg-muted/25 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {entry.questTitle}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {entry.localDate}
              </div>
            </div>
            <Badge
              variant={entry.outcome === "win" ? "default" : "secondary"}
              className="shrink-0"
            >
              {entry.outcome === "win" ? "Win" : "Pass"}
            </Badge>
          </div>
          {entry.note ? (
            <p className="mt-2 line-clamp-2 text-xs/relaxed text-muted-foreground">
              {entry.note}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function JournalSourceList({ journal }: { journal: WeeklyJournalReflection[] }) {
  if (journal.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        Journal entries from this week will appear here.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {journal.map((entry) => (
        <div key={entry.id} className="rounded-md border bg-muted/25 p-3">
          <div className="text-xs text-muted-foreground">{entry.localDate}</div>
          <p className="mt-1 line-clamp-3 text-xs/relaxed text-muted-foreground">
            {entry.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function StoryHistoryItem({
  isSelected,
  story,
}: {
  isSelected: boolean;
  story: WeeklyStory;
}) {
  return (
    <Link
      href={`/dashboard/story?story=${story.id}`}
      className={cn(
        "group grid min-w-0 gap-1 rounded-md border bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40",
        isSelected && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full bg-muted-foreground/35",
            isSelected && "bg-primary",
          )}
        />
        <span className="min-w-0 flex-1 truncate font-medium">
          {story.title}
        </span>
      </div>
      <div className="pl-4 text-[11px] leading-5 text-muted-foreground">
        {weekLabel(story)} · {story.sourceCheckInCount} Check-in
        {story.sourceCheckInCount === 1 ? "" : "s"}
      </div>
      <p className="line-clamp-2 min-w-0 pl-4 text-xs/relaxed text-muted-foreground">
        {story.summary}
      </p>
    </Link>
  );
}

export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<{ story?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedStoryId = Array.isArray(params.story)
    ? params.story[0]
    : params.story;
  const data = await getWeeklyStoryData(selectedStoryId);

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Story setup
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before Pulse can write your Story.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Weekly Stories are built from your saved Character, Quests, and
            Check-ins.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  const hasProof = data.currentWeekProof.length > 0;
  const hasJournal = data.currentWeekJournal.length > 0;
  const hasStorySource = hasProof || hasJournal;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Weekly Story
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            What did {data.character.name} prove this week?
          </h1>
          <p className="max-w-[62ch] text-sm/relaxed text-muted-foreground">
            Pulse turns this week&apos;s Wins, Passes, proof notes, and Journal
            reflections into a letter about who you are becoming.
          </p>
        </div>
        <WeeklyStoryForm
          disabled={!hasStorySource}
          hasStory={Boolean(data.currentWeekStory)}
        />
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-4">
          <StoryLetter story={data.selectedStory} />
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Card className="rounded-lg">
            <CardHeader>
              <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={17}
                  strokeWidth={1.8}
                />
              </div>
              <CardTitle>This week&apos;s source</CardTitle>
              <CardDescription>
                {formatDate(data.week.start)}-{formatDate(data.week.end)} ·{" "}
                {data.currentWeekProof.length} Check-in
                {data.currentWeekProof.length === 1 ? "" : "s"} ·{" "}
                {data.currentWeekJournal.length} Journal entr
                {data.currentWeekJournal.length === 1 ? "y" : "ies"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ProofSourceList proof={data.currentWeekProof} />
              <div className="grid gap-2">
                <div className="text-sm font-medium">Journal reflections</div>
                <JournalSourceList journal={data.currentWeekJournal} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Story history</CardTitle>
              <CardDescription>
                Revisit the letters Pulse has already saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.stories.length > 0 ? (
                data.stories.map((story) => {
                  const isSelected = data.selectedStory?.id === story.id;

                  return (
                    <StoryHistoryItem
                      key={story.id}
                      isSelected={isSelected}
                      story={story}
                    />
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Your saved Weekly Stories will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
