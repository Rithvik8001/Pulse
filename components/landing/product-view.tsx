import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Statement } from "@/components/ui/page";
import { ActionRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";

const quests: { title: string; outcome: "win" | "pass" | null; note?: string }[] = [
  { title: "Write 500 words", outcome: "win", note: "Finished the opening scene." },
  { title: "Morning walk", outcome: "pass" },
  { title: "Read 10 pages", outcome: null },
];

/** Deterministic sample history so the page renders the same everywhere. */
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

/** A still of the real product rows and grid, with sample data. */
export function ProductView() {
  return (
    <div inert className="grid gap-8 rounded-card bg-fill p-5 sm:p-6">
      <Statement>I am a writer.</Statement>
      <Section title="Today">
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
      </Section>
      <Section title="Last 8 weeks">
        <ProofHistoryGrid days={days} />
      </Section>
    </div>
  );
}
