import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Every primary action lives in the flow, right-aligned at the end of its
 * section: summary text left in caption/fg-2, the button right.
 */
export function SummaryBar({
  caption,
  children,
  className,
}: {
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="summary-bar"
      className={cn(
        "flex flex-wrap items-center justify-end gap-x-4 gap-y-3 pt-2",
        className,
      )}
    >
      {caption ? (
        <p className="min-w-0 flex-1 type-caption text-fg-2">{caption}</p>
      ) : null}
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
