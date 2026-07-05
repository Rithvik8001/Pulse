import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export type StatTile = {
  label: string;
  value: string;
  hint?: string;
  dotClassName: string;
};

type StatGridCardProps = {
  caption?: string;
  rangeLabel?: string;
  tiles: StatTile[];
  footerHref?: string;
  footerLabel?: string;
};

export function StatGridCard({
  caption,
  rangeLabel,
  tiles,
  footerHref,
  footerLabel,
}: StatGridCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {caption || rangeLabel ? (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <p className="text-sm text-muted-foreground">{caption}</p>
          {rangeLabel ? (
            <span className="shrink-0 font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {rangeLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2 shrink-0 rounded-full", tile.dotClassName)}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                {tile.label}
              </span>
              {tile.hint ? (
                <span title={tile.hint}>
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={13}
                    strokeWidth={1.7}
                    className="shrink-0 text-muted-foreground/60"
                  />
                </span>
              ) : null}
            </div>
            <div className="mt-2 truncate text-xl font-semibold tracking-tight">
              {tile.value}
            </div>
          </div>
        ))}
      </div>
      {footerHref && footerLabel ? (
        <div className="flex justify-center border-t px-5 py-4">
          <Link
            href={footerHref}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-[11px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-muted"
          >
            {footerLabel}
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              size={13}
              strokeWidth={1.9}
            />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
