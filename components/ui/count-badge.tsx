"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function CountBadge({
  value,
  label,
  className,
}: {
  value: number;

  label?: string;
  className?: string;
}) {
  const [key, setKey] = React.useState(0);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setKey((k) => k + 1);
    }
  }, [value]);
  if (value <= 0) return null;
  const text = value > 99 ? "99+" : String(value);
  return (
    <span
      key={key}
      data-slot="count-badge"
      aria-label={label ? `${text} ${label}` : undefined}
      className={cn(
        "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-pill bg-brand px-1.5 type-micro text-on-brand tabular-nums ring-2 ring-bg badge-pop",
        className,
      )}
    >
      {text}
    </span>
  );
}
