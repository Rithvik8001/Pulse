"use client";

import * as React from "react";
import { Check } from "@phosphor-icons/react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** 22px. Checked is brand with a white bold check. For picking items in a list. */
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "inline-flex size-check shrink-0 items-center justify-center rounded-key border border-rule bg-field-bg outline-none press transition-colors duration-(--dur-1) data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand disabled:opacity-(--muted)",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={14} weight="bold" aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** A checkbox with its visible label on the right. */
export function CheckboxField({
  label,
  caption,
  id,
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  label: React.ReactNode;
  caption?: React.ReactNode;
}) {
  const autoId = React.useId();
  const checkboxId = id ?? autoId;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox id={checkboxId} className="mt-0.5" {...props} />
      <label htmlFor={checkboxId} className="grid gap-0.5">
        <span className="type-body font-medium">{label}</span>
        {caption ? <span className="type-caption text-fg-2">{caption}</span> : null}
      </label>
    </div>
  );
}
