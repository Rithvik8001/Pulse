import * as React from "react";

import { CountBadge } from "@/components/ui/count-badge";
import { cn } from "@/lib/utils";

/** A quiet section label with optional count and action. No box. */
export function Section({
  title,
  count,
  action,
  id,
  className,
  children,
}: {
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = React.useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-slot="section"
      className={cn("grid gap-3", className)}
    >
      <div className="flex min-h-7 items-center justify-between gap-4">
        <h2 id={headingId} className="flex items-center gap-2 type-section">
          {title}
          {typeof count === "number" ? <CountBadge value={count} /> : null}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
