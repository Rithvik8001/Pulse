import { Statement } from "@/components/ui/page";
import { DetailRow, RowList } from "@/components/ui/row";
import type { MomentumData } from "@/lib/pulse/momentum-core";

const tierSentence: Record<MomentumData["tier"], string> = {
  "Warming Up": "You are warming up.",
  Building: "You are building momentum.",
  "On Fire": "You are on a roll.",
  "In the Zone": "You are in the zone.",
};

function streakLabel(days: number) {
  if (days === 0) return "No streak yet";
  return `${days} day${days === 1 ? "" : "s"} in a row`;
}

/** Momentum as one statement and a few rows. */
export function MomentumCard({ momentum }: { momentum: MomentumData }) {
  return (
    <div className="grid gap-3">
      <Statement>
        <span className="tabular-nums">{momentum.score} of 100.</span>{" "}
        {tierSentence[momentum.tier]}
      </Statement>
      <RowList>
        <DetailRow
          label="Longest streak"
          control={<span className="type-body text-fg-2 tabular-nums">{streakLabel(momentum.longestStreakEver)}</span>}
        />
        {momentum.questStreaks.map((quest) => (
          <DetailRow
            key={quest.questId}
            label={quest.questTitle}
            caption={
              quest.checkInCount30d > 0
                ? `${Math.round(quest.winRate30d * 100)}% wins in the last 30 days`
                : "No check-ins in the last 30 days"
            }
            control={
              <span className="flex items-center gap-3">
                {quest.isAtRisk ? <span className="type-small text-warn">At risk</span> : null}
                <span className="type-body text-fg-2 tabular-nums">{streakLabel(quest.currentStreak)}</span>
              </span>
            }
          />
        ))}
      </RowList>
    </div>
  );
}
