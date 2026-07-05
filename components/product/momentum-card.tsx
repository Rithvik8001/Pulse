"use client";

import type { MomentumData, MomentumTier } from "@/lib/pulse/momentum-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function tierBadgeVariant(
  tier: MomentumTier,
): "default" | "secondary" | "outline" {
  if (tier === "Warming Up") return "secondary";
  if (tier === "Building") return "outline";
  return "default";
}

export function MomentumCard({ momentum }: { momentum: MomentumData }) {
  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-end gap-3">
          <div className="text-3xl font-semibold tracking-tight">
            {momentum.score}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              /100
            </span>
          </div>
          <div className="mb-0.5">
            <Badge variant={tierBadgeVariant(momentum.tier)}>
              {momentum.tier}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Win rate counts for most of your score. Longer streaks give a bonus —
          maxing out at 7 days in a row.
        </p>

        {momentum.questStreaks.length > 0 && (
          <div className="grid gap-2">
            {momentum.questStreaks.map((quest) => (
              <div
                key={quest.questId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-muted-foreground">
                  {quest.questTitle}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {quest.isAtRisk && (
                    <span className="text-xs text-amber-500">at risk</span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {quest.checkInCount30d > 0
                      ? `${Math.round(quest.winRate30d * 100)}% wins`
                      : "no data"}
                  </span>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      quest.currentStreak > 0
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {quest.currentStreak > 0
                      ? `🔥 ${quest.currentStreak}`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {momentum.atRiskCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {momentum.atRiskCount === 1
              ? "1 quest at risk"
              : `${momentum.atRiskCount} quests at risk`}{" "}
            — check in today to keep the streak.
          </p>
        )}
    </div>
  );
}
