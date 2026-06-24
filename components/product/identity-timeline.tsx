"use client";

import { useActionState, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  EnergyIcon,
  NotebookIcon,
  RefreshIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  generateIdentitySnapshotAction,
  type IdentitySnapshotFormState,
} from "@/app/dashboard/identity/actions";
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
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  IdentitySnapshot,
  IdentityTimelineData,
  IdentityTimelineViewKey,
} from "@/lib/pulse/identity";
import type {
  IdentityComputedData,
  IdentityEvidenceKind,
  IdentityEvidenceNode,
  IdentitySignal,
} from "@/lib/pulse/identity-core";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { cn } from "@/lib/utils";

type IdentityTimelineProps = {
  data: Extract<IdentityTimelineData, { isSetupComplete: true }>;
  locale: string;
};

type EvidenceFilter =
  | "all"
  | "proof"
  | "journal"
  | "story"
  | "milestone";

const evidenceLabels: Record<EvidenceFilter, string> = {
  all: "All evidence",
  proof: "Proof",
  journal: "Journal",
  story: "Story",
  milestone: "Milestones",
};

const chartConfig = {
  proof: {
    label: "Proof",
    color: "var(--chart-1)",
  },
  journal: {
    label: "Journal",
    color: "var(--chart-2)",
  },
  story: {
    label: "Story",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function IdentityTimeline({ data, locale }: IdentityTimelineProps) {
  const [range, setRange] = useState<IdentityTimelineViewKey>("90d");
  const [filter, setFilter] = useState<EvidenceFilter>("all");
  const view = data.views[range];
  const visibleNodes = useMemo(
    () =>
      view.nodes.filter((node) =>
        filter === "all"
          ? true
          : filter === "milestone"
            ? node.kind === "milestone"
            : node.kind === filter,
      ),
    [filter, view.nodes],
  );
  const snapshot = data.latestSnapshot ?? view.fallbackSnapshot;

  return (
    <div className="grid gap-6">
      <IdentitySummaryCard
        canGenerate={data.hasAiGatewayKey}
        hasSavedSnapshot={Boolean(data.latestSnapshot)}
        locale={locale}
        snapshot={snapshot}
        sourceSnapshot={data.latestSnapshot}
        view={view}
      />

      <IdentityControls
        filter={filter}
        range={range}
        setFilter={setFilter}
        setRange={setRange}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="grid min-w-0 gap-4">
          <IdentityEvidenceGraph
            filter={filter}
            locale={locale}
            nodes={visibleNodes}
            view={view}
          />
          <IdentityVolumeChart locale={locale} view={view} />
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <IdentitySignalList signals={view.signals} />
          <RecurringThemes view={view} />
          <IdentityMilestoneList locale={locale} view={view} />
        </div>
      </section>
    </div>
  );
}

function IdentitySummaryCard({
  canGenerate,
  hasSavedSnapshot,
  locale,
  snapshot,
  sourceSnapshot,
  view,
}: {
  canGenerate: boolean;
  hasSavedSnapshot: boolean;
  locale: string;
  snapshot: IdentitySnapshot | IdentityComputedData["fallbackSnapshot"];
  sourceSnapshot: IdentitySnapshot | null;
  view: IdentityComputedData;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={hasSavedSnapshot ? "default" : "outline"}>
              {hasSavedSnapshot ? "AI snapshot" : "Live evidence"}
            </Badge>
            <Badge variant="outline">
              {formatShortDate(view.range.start, locale)}-
              {formatShortDate(view.range.end, locale)}
            </Badge>
            {sourceSnapshot ? (
              <span className="text-xs text-muted-foreground">
                Updated {formatDateTime(sourceSnapshot.updatedAt, locale)}
              </span>
            ) : null}
          </div>
          <CardTitle className="max-w-3xl font-heading text-2xl tracking-tight md:text-3xl">
            {snapshot.headline}
          </CardTitle>
          <CardDescription className="mt-3 max-w-[78ch] text-sm/relaxed">
            {snapshot.summary}
          </CardDescription>
        </div>
        <IdentitySnapshotForm
          canGenerate={canGenerate && view.nodes.length > 0}
          hasSnapshot={hasSavedSnapshot}
        />
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-md border bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <HugeiconsIcon icon={AiBrain01Icon} size={16} strokeWidth={1.8} />
            You are becoming someone who...
          </div>
          <p className="text-sm/relaxed">{snapshot.identityStatement}</p>
        </div>
        <div className="grid gap-2 rounded-md border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={Target01Icon} size={16} strokeWidth={1.8} />
            Next identity move
          </div>
          <p className="text-sm/relaxed text-muted-foreground">
            {snapshot.nextIdentityMove}
          </p>
        </div>
        <EvidenceBullets title="Evidence" bullets={snapshot.evidenceBullets} />
        <EvidenceBullets title="Themes" bullets={snapshot.themeBullets} />
      </CardContent>
    </Card>
  );
}

function EvidenceBullets({ bullets, title }: { bullets: string[]; title: string }) {
  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-4">
      <div className="text-sm font-medium">{title}</div>
      {bullets.length > 0 ? (
        <div className="grid gap-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex gap-2 text-xs/relaxed text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          More evidence will appear here as Pulse learns the pattern.
        </p>
      )}
    </div>
  );
}

function IdentitySnapshotForm({
  canGenerate,
  hasSnapshot,
}: {
  canGenerate: boolean;
  hasSnapshot: boolean;
}) {
  const initialState: IdentitySnapshotFormState = { status: "idle" };
  const [state, action, pending] = useActionState(
    generateIdentitySnapshotAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-2 lg:justify-items-end">
      <Button type="submit" disabled={!canGenerate || pending}>
        <HugeiconsIcon
          icon={hasSnapshot ? RefreshIcon : AiBrain01Icon}
          size={15}
          strokeWidth={1.8}
        />
        {pending
          ? "Reading evidence"
          : hasSnapshot
            ? "Refresh snapshot"
            : "Generate snapshot"}
      </Button>
      {!canGenerate ? (
        <p className="max-w-60 text-xs text-muted-foreground lg:text-right">
          Identity snapshots need AI access and at least one saved evidence item.
        </p>
      ) : state.message ? (
        <p
          className={cn(
            "max-w-64 text-xs lg:text-right",
            state.status === "error" ? "text-destructive" : "text-primary",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function IdentityControls({
  filter,
  range,
  setFilter,
  setRange,
}: {
  filter: EvidenceFilter;
  range: IdentityTimelineViewKey;
  setFilter: (filter: EvidenceFilter) => void;
  setRange: (range: IdentityTimelineViewKey) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between">
      <Tabs
        value={range}
        onValueChange={(value) => setRange(value as IdentityTimelineViewKey)}
      >
        <TabsList>
          <TabsTrigger value="90d">90 days</TabsTrigger>
          <TabsTrigger value="12w">12 weeks</TabsTrigger>
          <TabsTrigger value="all">All available</TabsTrigger>
        </TabsList>
      </Tabs>
      <select
        aria-label="Filter identity evidence"
        className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={filter}
        onChange={(event) => setFilter(event.target.value as EvidenceFilter)}
      >
        {Object.entries(evidenceLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </section>
  );
}

function IdentityEvidenceGraph({
  filter,
  locale,
  nodes,
  view,
}: {
  filter: EvidenceFilter;
  locale: string;
  nodes: IdentityEvidenceNode[];
  view: IdentityComputedData;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Identity evidence graph</CardTitle>
        <CardDescription>
          Proof, reflections, stories, and milestones ordered by local date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {nodes.length > 0 ? (
          <div className="relative grid gap-3 pl-4 before:absolute before:bottom-2 before:left-[1.18rem] before:top-2 before:w-px before:bg-border">
            {nodes.map((node) => (
              <EvidenceNodeItem key={node.id} locale={locale} node={node} />
            ))}
          </div>
        ) : (
          <Empty className="min-h-[260px] rounded-lg border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon
                  icon={filter === "all" ? EnergyIcon : NotebookIcon}
                  size={18}
                  strokeWidth={1.8}
                />
              </EmptyMedia>
              <EmptyTitle>No evidence in this view</EmptyTitle>
              <EmptyDescription>
                {view.nodes.length > 0
                  ? "Try another evidence filter."
                  : "Save Proof, Journal entries, or Weekly Stories to build the graph."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function EvidenceNodeItem({
  locale,
  node,
}: {
  locale: string;
  node: IdentityEvidenceNode;
}) {
  return (
    <div className="relative grid gap-1 rounded-md border bg-card p-3 pl-5 shadow-xs">
      <span
        className={cn(
          "absolute -left-[0.46rem] top-4 size-3 rounded-full border-2 border-background",
          kindDotClass(node.kind),
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="outline">{kindLabel(node.kind)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatShortDate(node.localDate, locale)}
            </span>
          </div>
          <div className="mt-1 truncate text-sm font-medium">{node.title}</div>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {node.weight}/5
        </div>
      </div>
      <p className="line-clamp-3 text-xs/relaxed text-muted-foreground">
        {node.detail}
      </p>
    </div>
  );
}

function IdentityVolumeChart({
  locale,
  view,
}: {
  locale: string;
  view: IdentityComputedData;
}) {
  const data = view.weeklyGroups.map((week) => ({
    ...week,
    label: formatShortDate(week.weekStart, locale),
  }));

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Evidence volume</CardTitle>
        <CardDescription>
          Weekly Proof, Journal, and Story signals in the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                tickMargin={10}
              />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={30} />
              <ChartTooltip content={<VolumeTooltip />} />
              <Bar dataKey="proofCount" fill="var(--color-proof)" name="proof" radius={3} />
              <Bar dataKey="journalCount" fill="var(--color-journal)" name="journal" radius={3} />
              <Bar dataKey="storyCount" fill="var(--color-story)" name="story" radius={3} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Evidence volume appears after your first saved item in this range.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { label: string; proofCount: number; journalCount: number; storyCount: number } }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="grid min-w-36 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <div className="font-medium">{point.label}</div>
      <TooltipRow label="Proof" value={point.proofCount.toString()} />
      <TooltipRow label="Journal" value={point.journalCount.toString()} />
      <TooltipRow label="Story" value={point.storyCount.toString()} />
    </div>
  );
}

function IdentitySignalList({ signals }: { signals: IdentitySignal[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Identity signals</CardTitle>
        <CardDescription>
          Quests ranked by volume, consistency, recency, and reflection.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {signals.length > 0 ? (
          signals.slice(0, 6).map((signal, index) => (
            <div key={signal.questId} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="truncate text-sm font-medium">
                      {signal.questTitle}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs/relaxed text-muted-foreground">
                    {signal.reason}
                  </p>
                </div>
                {signal.questStatus === "archived" ? (
                  <Badge variant="outline">Archived</Badge>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Save Proof on a Quest to reveal identity signals.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecurringThemes({ view }: { view: IdentityComputedData }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Recurring themes</CardTitle>
        <CardDescription>
          Repeated patterns from saved Weekly Stories.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {view.themes.length > 0 ? (
          view.themes.map((theme) => (
            <div
              key={theme.label}
              className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3 text-sm"
            >
              <span className="min-w-0 text-muted-foreground">{theme.label}</span>
              <Badge variant="outline">{theme.count}</Badge>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Generate Weekly Stories to surface recurring themes here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IdentityMilestoneList({
  locale,
  view,
}: {
  locale: string;
  view: IdentityComputedData;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>
          Firsts, thresholds, comebacks, and strongest evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {view.milestones.length > 0 ? (
          view.milestones.slice(0, 8).map((milestone) => (
            <div key={milestone.id} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium">
                  {milestone.title}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(milestone.localDate, locale)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs/relaxed text-muted-foreground">
                {milestone.detail}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Milestones appear as your Proof history grows.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}

function kindLabel(kind: IdentityEvidenceKind) {
  const labels: Record<IdentityEvidenceKind, string> = {
    proof: "Proof",
    journal: "Journal",
    story: "Story",
    milestone: "Milestone",
    signal: "Signal",
  };

  return labels[kind];
}

function kindDotClass(kind: IdentityEvidenceKind) {
  return {
    proof: "bg-primary",
    journal: "bg-chart-2",
    story: "bg-chart-3",
    milestone: "bg-chart-4",
    signal: "bg-chart-5",
  }[kind];
}

function formatShortDate(date: string, locale: string) {
  return formatLocalDateForLocale(date, locale, {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
