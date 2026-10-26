import type { ProofHistoryDay } from "@/lib/pulse/dashboard";
import { cn } from "@/lib/utils";

/**
 * Weeks as columns, days as rows. Done days deepen the green, skipped-only
 * days are the rule grey, empty days the fill. One summary for assistive
 * tech; the cells themselves are not focusable.
 */
export function ProofHistoryGrid({
  days,
  cellClassName,
}: {
  days: ProofHistoryDay[];
  cellClassName?: string;
}) {
  const last = days[days.length - 1]?.localDate;
  const weeks = Math.ceil(days.length / 7);
  const checkedIn = days.filter((d) => d.totalCount > 0).length;
  const withDone = days.filter((d) => d.winCount > 0).length;

  return (
    <div className="grid gap-2">
      <div
        role="img"
        aria-label={`Last ${weeks} weeks: checked in on ${checkedIn} of ${days.length} days, ${withDone} with at least one habit done.`}
        className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-x-auto pb-1"
      >
        {days.map((day) => (
          <span
            key={day.localDate}
            className={cn(
              "size-4 rounded-cell",
              day.winCount >= 3 && "bg-ok",
              day.winCount === 2 && "bg-ok opacity-(--soft)",
              day.winCount === 1 && "bg-ok opacity-(--muted)",
              day.winCount === 0 && day.passCount > 0 && "bg-rule",
              day.totalCount === 0 && "bg-fill-2",
              day.localDate === last && "outline-1 -outline-offset-1 outline-ink",
              cellClassName,
            )}
          />
        ))}
      </div>
      <p className="type-small text-fg-2">Darker squares mean more habits done that day.</p>
    </div>
  );
}
