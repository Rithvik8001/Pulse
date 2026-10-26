import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string;
};

export function StatStrip({
  stats,
  columns,
  className,
}: {
  stats: Stat[];

  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = columns ?? (Math.min(4, Math.max(2, stats.length)) as 2 | 3 | 4);
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5",
        cols === 3 && "sm:grid-cols-3",
        cols === 4 && "sm:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="grid gap-0.5">
          <dd className="truncate type-heading tabular-nums">{stat.value}</dd>
          <dt className="type-caption text-fg-2">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
