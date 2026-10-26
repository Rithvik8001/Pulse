"use client";

import { useActionState, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpenText, Flag, Lightning, Notebook, SealCheck } from "@phosphor-icons/react";

import {
  generateIdentitySnapshotAction,
  type IdentitySnapshotFormState,
} from "@/app/dashboard/identity/actions";
import { ChartFrame, ChartTooltip, chartBarCursor } from "@/components/ui/chart";
import { FeatureChip } from "@/components/ui/feature-chip";
import type { Tint } from "@/components/ui/features";
import type { IconComponent } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { Statement } from "@/components/ui/page";
import { ActionRow, DetailRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";
import type {
  IdentitySnapshot,
  IdentityTimelineData,
  IdentityTimelineViewKey,
} from "@/lib/pulse/identity";
import type {
  IdentityComputedData,
  IdentityEvidenceKind,
  IdentityEvidenceNode,
} from "@/lib/pulse/identity-core";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";

type EvidenceFilter = "all" | IdentityEvidenceKind;

const kinds: Record<IdentityEvidenceKind, { label: string; tint: Tint; icon: IconComponent }> = {
  proof: { label: "Proof", tint: "green", icon: SealCheck },
  journal: { label: "Journal", tint: "amber", icon: Notebook },
  story: { label: "Story", tint: "pink", icon: BookOpenText },
  milestone: { label: "Milestone", tint: "violet", icon: Flag },
  signal: { label: "Signal", tint: "blue", icon: Lightning },
};

type VolumePoint = IdentityComputedData["weeklyGroups"][number] & { label: string };

export function IdentityTimeline({
  data,
  locale,
}: {
  data: Extract<IdentityTimelineData, { isSetupComplete: true }>;
  locale: string;
}) {
  const [range, setRange] = useState<IdentityTimelineViewKey>("90d");
  const [filter, setFilter] = useState<EvidenceFilter>("all");
  const view = data.views[range];
  const visibleNodes = useMemo(
    () => view.nodes.filter((node) => filter === "all" || node.kind === filter),
    [filter, view.nodes],
  );
  const snapshot = data.latestSnapshot ?? view.fallbackSnapshot;

  const shortDate = (date: string) =>
    formatLocalDateForLocale(date, locale, { day: "numeric", month: "short" });

  const groupedNodes = useMemo(() => {
    const byDate = new Map<string, IdentityEvidenceNode[]>();
    for (const node of visibleNodes) {
      const list = byDate.get(node.localDate) ?? [];
      list.push(node);
      byDate.set(node.localDate, list);
    }
    return [...byDate.entries()];
  }, [visibleNodes]);

  const volume: VolumePoint[] = view.weeklyGroups.map((week) => ({
    ...week,
    label: shortDate(week.weekStart),
  }));

  return (
    <div className="grid gap-10">
      <Section title="Snapshot">
        <div className="grid gap-4">
          <h3 className="type-heading text-balance">{snapshot.headline}</h3>
          <p className="max-w-measure type-body text-fg-2 text-pretty">{snapshot.summary}</p>
          <Statement>{snapshot.identityStatement}</Statement>
          <RowList>
            <DetailRow label="Next move" caption={snapshot.nextIdentityMove} />
            {snapshot.evidenceBullets.map((bullet) => (
              <DetailRow key={bullet} label="Evidence" caption={bullet} />
            ))}
            {snapshot.themeBullets.map((bullet) => (
              <DetailRow key={bullet} label="Theme" caption={bullet} />
            ))}
          </RowList>
        </div>
        <SnapshotForm
          canGenerate={data.hasAiGatewayKey && view.nodes.length > 0}
          hasSnapshot={Boolean(data.latestSnapshot)}
          snapshot={data.latestSnapshot}
          locale={locale}
        />
      </Section>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="grid gap-2">
          <span className="type-label text-fg-2">Range</span>
          <Segmented
            label="Range"
            value={range}
            onValueChange={(v) => setRange(v as IdentityTimelineViewKey)}
            options={[
              { value: "90d", label: "90 days" },
              { value: "12w", label: "12 weeks" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <Select
          label="Evidence"
          value={filter}
          onValueChange={(v) => setFilter(v as EvidenceFilter)}
          options={[
            { value: "all", label: "All evidence" },
            ...(Object.keys(kinds) as IdentityEvidenceKind[]).map((kind) => ({
              value: kind,
              label: kinds[kind].label,
            })),
          ]}
        />
      </div>

      <Section title="Evidence by week">
        {volume.length > 0 ? (
          <ChartFrame
            label="Evidence by week"
            height="sm"
            table={{
              head: ["Week", "Proof", "Journal", "Story"],
              rows: volume.map((w) => [w.label, w.proofCount, w.journalCount, w.storyCount]),
            }}
          >
            <BarChart data={volume} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                cursor={chartBarCursor}
                content={
                  <ChartTooltip<VolumePoint>
                    format={(p) => ({
                      title: `Week of ${p.label}`,
                      rows: [
                        { label: "Proof", value: String(p.proofCount) },
                        { label: "Journal", value: String(p.journalCount) },
                        { label: "Story", value: String(p.storyCount) },
                      ],
                    })}
                  />
                }
              />
              <Bar dataKey="proofCount" stackId="a" fill="var(--t-green)" isAnimationActive={false} />
              <Bar dataKey="journalCount" stackId="a" fill="var(--t-amber)" isAnimationActive={false} />
              <Bar dataKey="storyCount" stackId="a" fill="var(--t-pink)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartFrame>
        ) : (
          <Notice>Evidence appears here after your first saved item in this range.</Notice>
        )}
      </Section>

      <Section title="Timeline">
        {groupedNodes.length > 0 ? (
          <div className="grid gap-6">
            {groupedNodes.map(([date, nodes]) => (
              <section key={date} aria-label={shortDate(date)} className="grid gap-2">
                <h3 className="type-section">{shortDate(date)}</h3>
                <RowList>
                  {nodes.map((node) => (
                    <ActionRow
                      key={node.id}
                      leading={<FeatureChip tint={kinds[node.kind].tint} icon={kinds[node.kind].icon} />}
                      title={node.title}
                      caption={node.detail}
                      actions={<span className="type-small text-fg-3">{kinds[node.kind].label}</span>}
                    />
                  ))}
                </RowList>
              </section>
            ))}
          </div>
        ) : (
          <Notice>
            {view.nodes.length > 0
              ? "Nothing matches this filter."
              : "Save proof, journal entries or stories to build the timeline."}
          </Notice>
        )}
      </Section>

      <Section title="Signals">
        {view.signals.length > 0 ? (
          <RowList>
            {view.signals.slice(0, 6).map((signal) => (
              <DetailRow
                key={signal.questId}
                label={
                  signal.questStatus === "archived"
                    ? `${signal.questTitle} (archived)`
                    : signal.questTitle
                }
                caption={signal.reason}
                control={
                  <span className="type-body text-fg-2 tabular-nums">
                    {signal.proofCount} proof
                  </span>
                }
              />
            ))}
          </RowList>
        ) : (
          <Notice>Save proof on a quest to see which ones carry your identity.</Notice>
        )}
      </Section>

      <Section title="Recurring themes">
        {view.themes.length > 0 ? (
          <RowList>
            {view.themes.map((theme) => (
              <DetailRow
                key={theme.label}
                label={theme.label}
                control={
                  <span className="type-body text-fg-2 tabular-nums">
                    {theme.count} {theme.count === 1 ? "story" : "stories"}
                  </span>
                }
              />
            ))}
          </RowList>
        ) : (
          <Notice>Themes come from your weekly stories. Write one to start.</Notice>
        )}
      </Section>

      <Section title="Milestones">
        {view.milestones.length > 0 ? (
          <RowList>
            {view.milestones.slice(0, 8).map((milestone) => (
              <ActionRow
                key={milestone.id}
                leading={<FeatureChip tint="violet" icon={Flag} />}
                title={milestone.title}
                caption={milestone.detail}
                actions={<span className="type-small text-fg-3">{shortDate(milestone.localDate)}</span>}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Milestones appear as your proof history grows.</Notice>
        )}
      </Section>
    </div>
  );
}

function SnapshotForm({
  canGenerate,
  hasSnapshot,
  snapshot,
  locale,
}: {
  canGenerate: boolean;
  hasSnapshot: boolean;
  snapshot: IdentitySnapshot | null;
  locale: string;
}) {
  const initialState: IdentitySnapshotFormState = { status: "idle" };
  const [state, action] = useActionState(generateIdentitySnapshotAction, initialState);

  const caption = !canGenerate
    ? "Snapshots need AI access and at least one saved item."
    : snapshot
      ? `Updated ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(snapshot.updatedAt)}`
      : "Not written yet. The statement above is built from your evidence.";

  return (
    <form action={action} className="grid gap-3">
      {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
      <SummaryBar caption={caption}>
        <SubmitButton variant="primary" disabled={!canGenerate} pendingLabel="Reading evidence">
          {hasSnapshot ? "Refresh snapshot" : "Write snapshot"}
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
