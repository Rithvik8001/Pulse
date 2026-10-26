"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { StatStrip } from "@/components/product/stat-strip";
import { ChartFrame, ChartTooltip, chartCursor } from "@/components/ui/chart";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Notice } from "@/components/ui/notice";
import { ProgressTrack } from "@/components/ui/progress";
import { DetailRow, Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import {
  buildStatsSummary,
  type QuestStat,
  type QuestWeeklyStat,
  type StatsSummary,
  type WeeklyTrendPoint,
} from "@/lib/pulse/stats-core";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";

type RangeOption = "12" | "8" | "4";

type WeeklyChartPoint = WeeklyTrendPoint & { displayWinRate: number };

function formatRate(rate: number | null) {
  return rate === null ? "None yet" : `${rate}%`;
}

export function StatsDashboard({
  weeklyTrend,
  questWeeklyStats,
  questStats,
  locale,
}: {
  weeklyTrend: WeeklyTrendPoint[];
  questWeeklyStats: QuestWeeklyStat[];
  questStats: QuestStat[];
  locale: string;
}) {
  const [range, setRange] = useState<RangeOption>("12");
  const [questFilter, setQuestFilter] = useState("all");
  const selectedWeeks = Number(range);

  const selectedWeekStarts = useMemo(
    () => new Set(weeklyTrend.slice(-selectedWeeks).map((week) => week.weekStart)),
    [selectedWeeks, weeklyTrend],
  );
  const selectedTrend = useMemo<WeeklyChartPoint[]>(
    () =>
      weeklyTrend
        .slice(-selectedWeeks)
        .map((week) => ({ ...week, displayWinRate: week.winRate ?? 0 })),
    [selectedWeeks, weeklyTrend],
  );
  const selectedQuestStats = useMemo(
    () =>
      questStats
        .map((quest) => {
          const weeklyRows = questWeeklyStats.filter(
            (row) => row.questId === quest.questId && selectedWeekStarts.has(row.weekStart),
          );
          const winCount = weeklyRows.reduce((total, row) => total + row.winCount, 0);
          const passCount = weeklyRows.reduce((total, row) => total + row.passCount, 0);
          const totalCount = winCount + passCount;
          return {
            ...quest,
            winCount,
            passCount,
            totalCount,
            winRate: totalCount > 0 ? Math.round((winCount / totalCount) * 100) : null,
          };
        })
        .filter((quest) => quest.totalCount > 0 || quest.questStatus === "active"),
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
        selectedQuestStats.filter((quest) => quest.questStatus === "active").length,
      ),
    [selectedQuestStats, visibleQuestStats],
  );
  const questRows = visibleQuestStats
    .filter((quest) => quest.totalCount > 0)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
  const hasTrendData = selectedTrend.some((week) => week.totalCount > 0);
  const questOptions = questStats.filter((quest) => quest.totalCount > 0);

  const shortDate = (date: string) =>
    formatLocalDateForLocale(date, locale, { month: "short", day: "numeric" });

  return (
    <div className="grid gap-10">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="grid gap-2">
          <span className="type-label text-fg-2">Range</span>
          <Segmented
            label="Range"
            value={range}
            onValueChange={(v) => setRange(v as RangeOption)}
            options={[
              { value: "4", label: "4 weeks" },
              { value: "8", label: "8 weeks" },
              { value: "12", label: "12 weeks" },
            ]}
          />
        </div>
        <Select
          label="Quest"
          value={questFilter}
          onValueChange={setQuestFilter}
          options={[
            { value: "all", label: "All quests" },
            ...questOptions.map((quest) => ({
              value: quest.questId,
              label:
                quest.questStatus === "archived"
                  ? `${quest.questTitle} (archived)`
                  : quest.questTitle,
            })),
          ]}
        />
      </div>

      <StatStrip
        columns={2}
        stats={[
          { label: `Check-ins in ${selectedWeeks} weeks`, value: String(summary.totalProof) },
          { label: "Win rate", value: formatRate(summary.overallWinRate) },
        ]}
      />

      <Section title="Weekly win rate">
        {hasTrendData ? (
          <ChartFrame
            label={`Weekly win rate over ${selectedWeeks} weeks`}
            table={{
              head: ["Week", "Win rate", "Wins", "Passes"],
              rows: selectedTrend.map((w) => [w.label, formatRate(w.winRate), w.winCount, w.passCount]),
            }}
          >
            <LineChart data={selectedTrend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
              <YAxis
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={chartCursor}
                content={
                  <ChartTooltip<WeeklyChartPoint>
                    format={(p) => ({
                      title: `${shortDate(p.weekStart)} to ${shortDate(p.weekEnd)}`,
                      rows: [
                        { label: "Win rate", value: formatRate(p.winRate) },
                        { label: "Wins", value: String(p.winCount) },
                        { label: "Passes", value: String(p.passCount) },
                      ],
                    })}
                  />
                }
              />
              <Line
                dataKey="displayWinRate"
                type="monotone"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "var(--knob)", stroke: "var(--brand)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartFrame>
        ) : (
          <Notice>No check-ins in this range yet.</Notice>
        )}
      </Section>

      <Section title="By quest">
        {questRows.length > 0 ? (
          <RowList>
            {questRows.map((quest) => (
              <Row key={quest.questId} className="items-start">
                <FeatureChip feature="quests" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="grid min-w-0 gap-0.5">
                      <div className="truncate type-body font-medium">
                        {quest.questTitle}
                        {quest.questStatus === "archived" ? (
                          <span className="type-caption text-fg-3"> (archived)</span>
                        ) : null}
                      </div>
                      <div className="type-caption text-fg-2">
                        {quest.winCount} {quest.winCount === 1 ? "win" : "wins"}, {quest.passCount}{" "}
                        {quest.passCount === 1 ? "pass" : "passes"}
                      </div>
                    </div>
                    <span className="shrink-0 type-body font-medium tabular-nums">
                      {formatRate(quest.winRate)}
                    </span>
                  </div>
                  <ProgressTrack value={quest.winRate ?? 0} label={`${quest.questTitle} win rate`} />
                </div>
              </Row>
            ))}
          </RowList>
        ) : (
          <Notice>No quest has check-ins in this range. Try a wider range.</Notice>
        )}
      </Section>

      <Section title="Insights">
        <RowList>
          <InsightRow label="Strongest quest" quest={summary.strongestQuest} fallback="No quest has enough recent proof to rank yet." />
          <InsightRow label="Needs attention" quest={summary.needsAttentionQuest} fallback="Nothing needs attention right now." />
        </RowList>
      </Section>
    </div>
  );
}

function InsightRow({
  label,
  quest,
  fallback,
}: {
  label: string;
  quest: StatsSummary["strongestQuest"];
  fallback: string;
}) {
  return (
    <DetailRow
      label={label}
      caption={
        !quest
          ? fallback
          : quest.totalCount === 0
            ? quest.reason
            : `${formatRate(quest.winRate)} across ${quest.totalCount} check-ins${
                quest.currentStreak > 0 ? `, ${quest.currentStreak} in a row` : ""
              }. ${quest.reason}`
      }
      control={
        quest ? <span className="type-body text-fg-2">{quest.questTitle}</span> : undefined
      }
    />
  );
}
