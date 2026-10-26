"use client";

import * as React from "react";
import { RadioGroup as RadioPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export const RadioGroup = RadioPrimitive.Root;

export function Radio({
  label,
  caption,
  id,
  className,
  ...props
}: React.ComponentProps<typeof RadioPrimitive.Item> & {
  label: React.ReactNode;
  caption?: React.ReactNode;
}) {
  const autoId = React.useId();
  const radioId = id ?? autoId;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <RadioPrimitive.Item
        id={radioId}
        data-slot="radio"
        className="mt-0.5 inline-flex size-check shrink-0 items-center justify-center rounded-pill border border-rule bg-field-bg outline-none press transition-colors duration-(--dur-1) data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:opacity-(--muted)"
        {...props}
      >
        <RadioPrimitive.Indicator className="block size-2 rounded-pill bg-on-brand" />
      </RadioPrimitive.Item>
      <label htmlFor={radioId} className="grid gap-0.5">
        <span className="type-body font-medium">{label}</span>
        {caption ? <span className="type-caption text-fg-2">{caption}</span> : null}
      </label>
    </div>
  );
}
