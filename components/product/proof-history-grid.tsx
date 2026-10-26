"use client";

import { Tip } from "@/components/ui/tooltip";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { cn } from "@/lib/utils";

function describe(day: ProofHistoryDay, locale: string) {
  const date = formatLocalDateForLocale(day.localDate, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (day.totalCount === 0) return `${date}: no check-ins`;
  const parts = [];
  if (day.winCount > 0) parts.push(`${day.winCount} done`);
  if (day.passCount > 0) parts.push(`${day.passCount} skipped`);
  return `${date}: ${parts.join(", ")}`;
}

export function ProofHistoryGrid({
  days,
  cellClassName,
  locale = "en-US",
}: {
  days: ProofHistoryDay[];
  cellClassName?: string;
  locale?: string;
}) {
  const last = days[days.length - 1]?.localDate;
  const weeks = Math.ceil(days.length / 7);
  const checkedIn = days.filter((d) => d.totalCount > 0).length;
  const withDone = days.filter((d) => d.winCount > 0).length;

  return (
    <div className="grid gap-3">
      <div
        role="img"
        aria-label={`Last ${weeks} weeks: checked in on ${checkedIn} of ${days.length} days, ${withDone} with at least one habit done.`}
        className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-x-auto pb-1"
      >
        {days.map((day) => (
          <Tip key={day.localDate} label={describe(day, locale)}>
            <span
              className={cn(
                "size-4 rounded-cell",
                day.winCount >= 3 && "bg-ok",
                day.winCount === 2 && "bg-ok opacity-(--soft)",
                day.winCount === 1 && "bg-ok opacity-(--muted)",
                day.winCount === 0 && day.passCount > 0 && "bg-fg-3",
                day.totalCount === 0 && "bg-fill-2",
                day.localDate === last && "outline-1 -outline-offset-1 outline-ink",
                cellClassName,
              )}
            />
          </Tip>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 type-small text-fg-2">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-cell bg-ok" />
          At least one habit done. Darker means more.
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-cell bg-fg-3" />
          Checked in, all skipped
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-cell bg-fill-2" />
          No check-ins
        </li>
      </ul>
    </div>
  );
}
