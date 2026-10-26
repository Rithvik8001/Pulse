"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame, ChartTooltip, chartCursor } from "@/components/ui/chart";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Notice } from "@/components/ui/notice";
import { ProgressTrack } from "@/components/ui/progress";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import type { QuestStat, WeeklyTrendPoint } from "@/lib/pulse/stats-core";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";

type WeeklyChartPoint = WeeklyTrendPoint & { displayWinRate: number };

function formatRate(rate: number | null) {
  return rate === null ? "None yet" : `${rate}%`;
}

export function StatsDashboard({
  weeklyTrend,
  questStats,
  streakByQuestId,
  locale,
}: {
  weeklyTrend: WeeklyTrendPoint[];
  questStats: QuestStat[];
  streakByQuestId: Record<string, number>;
  locale: string;
}) {
  const trend: WeeklyChartPoint[] = weeklyTrend.map((week) => ({
    ...week,
    displayWinRate: week.winRate ?? 0,
  }));
  const hasTrendData = trend.some((week) => week.totalCount > 0);
  const rows = questStats
    .filter((quest) => quest.totalCount > 0)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
  const shortDate = (date: string) =>
    formatLocalDateForLocale(date, locale, { month: "short", day: "numeric" });

  return (
    <>
      <Section title="Weekly done rate">
        {hasTrendData ? (
          <ChartFrame
            label="Weekly done rate over 12 weeks"
            table={{
              head: ["Week", "Done rate", "Done", "Skipped"],
              rows: trend.map((w) => [w.label, formatRate(w.winRate), w.winCount, w.passCount]),
            }}
          >
            <LineChart data={trend} margin={{ left: 4, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
              <YAxis
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                tickMargin={8}
                width="auto"
              />
              <Tooltip
                cursor={chartCursor}
                content={
                  <ChartTooltip<WeeklyChartPoint>
                    format={(p) => ({
                      title: `${shortDate(p.weekStart)} to ${shortDate(p.weekEnd)}`,
                      rows: [
                        { label: "Done rate", value: formatRate(p.winRate) },
                        { label: "Done", value: String(p.winCount) },
                        { label: "Skipped", value: String(p.passCount) },
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
          <Notice>No check-ins in the last 12 weeks yet.</Notice>
        )}
      </Section>

      <Section title="By habit">
        {rows.length > 0 ? (
          <RowList>
            {rows.map((quest) => {
              const streak = streakByQuestId[quest.questId] ?? 0;
              return (
                <Row key={quest.questId} className="items-start">
                  <FeatureChip feature="habits" />
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
                          {quest.winCount} done, {quest.passCount} skipped
                          {streak >= 2 ? ` · ${streak} days in a row` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 type-body font-medium tabular-nums">
                        {formatRate(quest.winRate)}
                      </span>
                    </div>
                    <ProgressTrack value={quest.winRate ?? 0} label={`${quest.questTitle} done rate`} />
                  </div>
                </Row>
              );
            })}
          </RowList>
        ) : (
          <Notice>No habit has check-ins in the last 12 weeks yet.</Notice>
        )}
      </Section>
    </>
  );
}
