"use client";

import * as React from "react";
import { Minus, Plus } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/** A track with raised 44px minus and plus knobs and a tabular value between. */
export function Stepper({
  label,
  value,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  onChange,
  name,
  format = (v) => String(v),
  className,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  name?: string;
  format?: (value: number) => string;
  className?: string;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-grid grid-cols-[auto_1fr_auto] items-center gap-1 track rounded-control p-1", className)}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={dec}
        disabled={value <= min}
        className="inline-flex size-control-sm items-center justify-center rounded-inner knob text-ink outline-none press disabled:opacity-(--muted)"
      >
        <Minus size={16} weight="bold" aria-hidden />
      </button>
      <output className="min-w-12 px-2 text-center type-body font-medium tabular-nums" aria-live="polite">
        {format(value)}
      </output>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={inc}
        disabled={value >= max}
        className="inline-flex size-control-sm items-center justify-center rounded-inner knob text-ink outline-none press disabled:opacity-(--muted)"
      >
        <Plus size={16} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
