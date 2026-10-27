import type { ReactNode } from "react";

import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { FeatureChip } from "@/components/ui/feature-chip";
import { ActionRow, RowList } from "@/components/ui/row";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";
import { cn } from "@/lib/utils";

const quests: { title: string; outcome: "win" | "pass" | null; note?: string }[] = [
  { title: "Write 500 words", outcome: "win", note: "Finished the opening scene." },
  { title: "Morning walk", outcome: "pass" },
  { title: "Read 10 pages", outcome: null },
];

function sampleDays(): ProofHistoryDay[] {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const days: ProofHistoryDay[] = [];
  for (let i = 0; i < 56; i += 1) {
    const r = rnd();
    const winCount = r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.8 ? 2 : 3;
    const passCount = r > 0.2 && r < 0.4 ? 1 : 0;
    days.push({
      localDate: `2026-${String(9 + Math.floor((i + 1) / 31)).padStart(2, "0")}-${String(((i + 1) % 30) + 1).padStart(2, "0")}`,
      winCount,
      passCount,
      totalCount: winCount + passCount,
    });
  }
  return days;
}

const days = sampleDays();
const daysWithDone = days.filter((day) => day.winCount > 0).length;
const doneToday = quests.filter((quest) => quest.outcome === "win").length;

function Panel({
  eyebrow,
  title,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("grid content-start gap-4 rounded-card border border-card-rim bg-bg p-6 shadow-card", className)}>
      <div className="grid gap-1">
        <p className="type-section">{eyebrow}</p>
        <p className="type-heading">{title}</p>
      </div>
      {children}
    </section>
  );
}

export function ProductView() {
  return (
    <div inert className="grid gap-2 rounded-tray bg-fill p-2 md:grid-cols-[minmax(0,1fr)_auto]">
      <Panel eyebrow="Today" title="I am a writer.">
        <RowList>
          {quests.map((quest) => (
            <ActionRow
              key={quest.title}
              leading={<FeatureChip feature="habits" />}
              title={quest.title}
              caption={quest.note ?? (quest.outcome ? "Checked in today" : "Not done yet today")}
              actions={quest.outcome ? <ProofOutcome outcome={quest.outcome} /> : null}
            />
          ))}
        </RowList>
        <p className="type-caption text-fg-2">
          {doneToday} of {quests.length} done today
        </p>
      </Panel>
      <Panel eyebrow="Last 8 weeks" title={`${daysWithDone} days with a habit done`}>
        <ProofHistoryGrid days={days} cellClassName="size-6" legend="compact" />
      </Panel>
    </div>
  );
}
