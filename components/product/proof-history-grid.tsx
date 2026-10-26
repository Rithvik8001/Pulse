"use client";

import { Tip } from "@/components/ui/tooltip";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";
import { cn } from "@/lib/utils";

function formatDay(localDate: string) {
  const [y, m, d] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC", // design-ok: a code value, not copy
  });
}

function describe(day: ProofHistoryDay) {
  if (day.totalCount === 0) return `${formatDay(day.localDate)}: no check-ins`;
  const parts = [];
  if (day.winCount) parts.push(`${day.winCount} ${day.winCount === 1 ? "win" : "wins"}`);
  if (day.passCount) parts.push(`${day.passCount} ${day.passCount === 1 ? "pass" : "passes"}`);
  return `${formatDay(day.localDate)}: ${parts.join(", ")}`;
}

/**
 * Weeks as columns, days as rows. Wins deepen the green, passes are the rule
 * grey, empty days the fill. The last day carries an ink ring.
 */
export function ProofHistoryGrid({
  days,
  cellClassName,
}: {
  days: ProofHistoryDay[];
  cellClassName?: string;
}) {
  const last = days[days.length - 1]?.localDate;
  return (
    <div
      role="img"
      aria-label={`Check-ins by day over the last ${Math.ceil(days.length / 7)} weeks`}
      className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-x-auto pb-1"
    >
      {days.map((day) => (
        <Tip key={day.localDate} label={describe(day)} side="top">
          <button
            type="button"
            aria-label={describe(day)}
            className={cn(
              "size-4 rounded-cell outline-none transition-[outline-color] duration-(--dur-1) focus-visible:outline-brand-fg",
              day.winCount >= 3 && "bg-ok",
              day.winCount === 2 && "bg-ok opacity-(--soft)",
              day.winCount === 1 && "bg-ok opacity-(--muted)",
              day.winCount === 0 && day.passCount > 0 && "bg-rule",
              day.totalCount === 0 && "bg-fill-2",
              day.localDate === last && "outline-1 -outline-offset-1 outline-ink",
              cellClassName,
            )}
          />
        </Tip>
      ))}
    </div>
  );
}
