import { cn } from "@/lib/utils";

/** A 4px fill-2 track with a brand fill. Progress is brand. */
export function ProgressTrack({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1 w-full overflow-hidden rounded-pill bg-fill-2", className)}
    >
      <div
        className="h-full rounded-pill bg-brand transition-[width] duration-(--dur-3) ease-(--ease)"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
