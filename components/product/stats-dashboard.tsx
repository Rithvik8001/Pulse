"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  buildStatsSummary,
  type QuestStat,
  type QuestWeeklyStat,
  type StatsSummary,
  type WeeklyTrendPoint,
} from "@/lib/pulse/stats-core";

type StatsDashboardProps = {
  weeklyTrend: WeeklyTrendPoint[];
  questWeeklyStats: QuestWeeklyStat[];
  questStats: QuestStat[];
};

type RangeOption = "12w" | "8w" | "4w";

type WeeklyChartPoint = WeeklyTrendPoint & {
  displayWinRate: number;
};

type QuestChartPoint = QuestStat & {
  displayWinRate: number;
};

const rangeWeeks: Record<RangeOption, number> = {
  "12w": 12,
  "8w": 8,
  "4w": 4,
};

const trendChartConfig = {
  winRate: {
    label: "Win rate",
    color: "var(--chart-1)",
  },
  wins: {
    label: "Wins",
    color: "var(--chart-2)",
  },
  passes: {
    label: "Passes",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const questChartConfig = {
  winRate: {
    label: "Win rate",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function StatsDashboard({
  weeklyTrend,
  questWeeklyStats,
  questStats,
}: StatsDashboardProps) {
  const [range, setRange] = useState<RangeOption>("12w");
  const [questFilter, setQuestFilter] = useState("all");
  const selectedWeeks = rangeWeeks[range];
  const selectedWeekStarts = useMemo(
    () => new Set(weeklyTrend.slice(-selectedWeeks).map((week) => week.weekStart)),
    [selectedWeeks, weeklyTrend],
  );
  const selectedTrend = useMemo(
    () =>
      weeklyTrend.slice(-selectedWeeks).map((week) => ({
        ...week,
        displayWinRate: week.winRate ?? 0,
      })),
    [selectedWeeks, weeklyTrend],
  );
  const selectedQuestStats = useMemo(
    () =>
      questStats
        .map((quest) => {
          const weeklyRows = questWeeklyStats.filter(
            (row) =>
              row.questId === quest.questId &&
              selectedWeekStarts.has(row.weekStart),
          );
          const winCount = weeklyRows.reduce(
            (total, row) => total + row.winCount,
            0,
          );
          const passCount = weeklyRows.reduce(
            (total, row) => total + row.passCount,
            0,
          );
          const totalCount = winCount + passCount;

          return {
            ...quest,
            winCount,
            passCount,
            totalCount,
            winRate:
              totalCount > 0 ? Math.round((winCount / totalCount) * 100) : null,
          };
        })
        .filter(
          (quest) => quest.totalCount > 0 || quest.questStatus === "active",
        ),
    [questStats, questWeeklyStats, selectedWeekStarts],
  );
  const visibleQuestStats = useMemo(
    () =>
      selectedQuestStats.filter(
        (quest) => questFilter === "all" || quest.questId === questFilter,
      ),
    [questFilter, selectedQuestStats],
  );
  const summary = useMemo(
    () =>
      buildStatsSummary(
        visibleQuestStats,
        selectedQuestStats.filter((quest) => quest.questStatus === "active")
          .length,
      ),
    [selectedQuestStats, visibleQuestStats],
  );
  const questChartData = visibleQuestStats
    .filter((quest) => quest.totalCount > 0)
    .map((quest) => ({
      ...quest,
      displayWinRate: quest.winRate ?? 0,
    }))
    .sort((first, second) => second.displayWinRate - first.displayWinRate);
  const hasTrendData = selectedTrend.some((week) => week.totalCount > 0);
  const hasQuestData = questChartData.length > 0;

  return (
    <div className="grid gap-6">
      <StatsControls
        questFilter={questFilter}
        questStats={questStats}
        range={range}
        setQuestFilter={setQuestFilter}
        setRange={setRange}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Proof"
          value={summary.totalProof.toString()}
          detail={`${summary.winCount} Wins · ${summary.passCount} Passes`}
        />
        <SummaryCard
          label="Win rate"
          value={formatRate(summary.overallWinRate)}
          detail={`Across the selected ${selectedWeeks} weeks`}
        />
        <SummaryCard
          label="Strongest Quest"
          value={summary.strongestQuest?.questTitle ?? "More Proof needed"}
          detail={
            summary.strongestQuest
              ? `${formatRate(summary.strongestQuest.winRate)} · ${
                  summary.strongestQuest.totalCount
                } Check-ins`
              : "Needs at least 3 Check-ins"
          }
        />
        <SummaryCard
          label="Needs attention"
          value={summary.needsAttentionQuest?.questTitle ?? "No signal yet"}
          detail={
            summary.needsAttentionQuest
              ? summary.needsAttentionQuest.reason
              : "Pulse will wait for enough Proof."
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly win rate</CardTitle>
            <CardDescription>
              The share of saved Proof marked as Wins each week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <ChartContainer
                config={trendChartConfig}
                className="h-[280px] w-full"
              >
                <AreaChart
                  accessibilityLayer
                  data={selectedTrend}
                  margin={{ left: 0, right: 12, top: 12 }}
                >
                  <defs>
                    <linearGradient id="winRateFill" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-winRate)"
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-winRate)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    width={34}
                  />
                  <ChartTooltip content={<WeeklyTrendTooltip />} />
                  <Area
                    dataKey="displayWinRate"
                    fill="url(#winRateFill)"
                    name="winRate"
                    stroke="var(--color-winRate)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <StatsEmptyState
                title="No weekly trend yet"
                description="Save a Win or Pass to start seeing your weekly pattern."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action signals</CardTitle>
            <CardDescription>
              Strong places to protect and softer spots to reshape.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InsightCard
              label="Strongest"
              quest={summary.strongestQuest}
              fallback="No Quest has enough recent Proof to rank yet."
            />
            <InsightCard
              label="Needs attention"
              quest={summary.needsAttentionQuest}
              fallback="No attention signal yet. Keep collecting Proof."
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Per-Quest performance</CardTitle>
          <CardDescription>
            Win rate by Quest for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasQuestData ? (
            <ChartContainer
              config={questChartConfig}
              className="h-[320px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={questChartData}
                layout="vertical"
                margin={{ left: 8, right: 28 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="questTitle"
                  tickLine={false}
                  tickMargin={8}
                  type="category"
                  width={118}
                />
                <ChartTooltip content={<QuestPerformanceTooltip />} />
                <Bar
                  dataKey="displayWinRate"
                  fill="var(--color-winRate)"
                  name="winRate"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <StatsEmptyState
              title="No Quest data in this view"
              description="Try a wider range or clear the Quest filter."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsControls({
  questFilter,
  questStats,
  range,
  setQuestFilter,
  setRange,
}: {
  questFilter: string;
  questStats: QuestStat[];
  range: RangeOption;
  setQuestFilter: (range: string) => void;
  setRange: (range: RangeOption) => void;
}) {
  const questOptions = questStats.filter((quest) => quest.totalCount > 0);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={range}
        onValueChange={(value) => setRange(value as RangeOption)}
      >
        <TabsList>
          <TabsTrigger value="12w">12 weeks</TabsTrigger>
          <TabsTrigger value="8w">8 weeks</TabsTrigger>
          <TabsTrigger value="4w">4 weeks</TabsTrigger>
        </TabsList>
      </Tabs>
      <select
        aria-label="Filter Stats by Quest"
        className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={questFilter}
        onChange={(event) => setQuestFilter(event.target.value)}
      >
        <option value="all">All Quests</option>
        {questOptions.map((quest) => (
          <option key={quest.questId} value={quest.questId}>
            {quest.questTitle}
            {quest.questStatus === "archived" ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </section>
  );
}

function SummaryCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="truncate text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  fallback,
  label,
  quest,
}: {
  fallback: string;
  label: string;
  quest: StatsSummary["strongestQuest"];
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <HugeiconsIcon
            icon={label === "Strongest" ? CheckmarkCircle01Icon : Alert02Icon}
            size={14}
            strokeWidth={1.7}
          />
          {label}
        </div>
        {quest?.questStatus === "archived" ? (
          <Badge variant="outline">Archived</Badge>
        ) : null}
      </div>
      {quest ? (
        <>
          <div className="mt-2 truncate text-sm font-medium">
            {quest.questTitle}
          </div>
          <p className="mt-1 text-xs/relaxed text-muted-foreground">
            {formatRate(quest.winRate)} across {quest.totalCount} Check-ins.
            {quest.currentStreak > 0
              ? ` Current streak: ${quest.currentStreak}.`
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs/relaxed text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

function StatsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Empty className="min-h-[220px] rounded-2xl border border-dashed bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Target01Icon} size={18} strokeWidth={1.8} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function WeeklyTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: WeeklyChartPoint }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <div className="font-medium">
        {formatShortDate(point.weekStart)}-{formatShortDate(point.weekEnd)}
      </div>
      <TooltipRow label="Win rate" value={formatRate(point.winRate)} />
      <TooltipRow label="Wins" value={point.winCount.toString()} />
      <TooltipRow label="Passes" value={point.passCount.toString()} />
      <TooltipRow label="Proof" value={point.totalCount.toString()} />
    </div>
  );
}

function QuestPerformanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: QuestChartPoint }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <div className="font-medium">{point.questTitle}</div>
      <TooltipRow label="Win rate" value={formatRate(point.winRate)} />
      <TooltipRow label="Wins" value={point.winCount.toString()} />
      <TooltipRow label="Passes" value={point.passCount.toString()} />
      <TooltipRow label="Check-ins" value={point.totalCount.toString()} />
    </div>
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

function formatRate(rate: number | null) {
  return rate === null ? "No data" : `${rate}%`;
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
