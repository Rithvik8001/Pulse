"use client";

import * as React from "react";
import { RadioGroup as RadioPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type ChoiceCardOption = {
  value: string;
  title: React.ReactNode;
  caption?: React.ReactNode;
  disabled?: boolean;
};

export function ChoiceCards({
  label,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  columns,
  className,
}: {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: ChoiceCardOption[];

  columns?: number;
  className?: string;
}) {
  return (
    <RadioPrimitive.Root
      aria-label={label}
      name={name}
      value={value}
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={onValueChange}
      data-slot="choice-cards"
      style={
        {
          "--cols": `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
        } as React.CSSProperties
      }
      className={cn(
        "grid w-full gap-1 track rounded-control p-1 md:grid-cols-(--cols)",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="grid min-h-control content-start gap-1 rounded-inner px-4 py-3 text-left outline-none press transition-colors duration-(--dur-2) data-[state=checked]:knob disabled:opacity-(--muted)"
        >
          <span className="type-body font-medium text-ink">{option.title}</span>
          {option.caption ? (
            <span className="type-caption text-fg-2">{option.caption}</span>
          ) : null}
        </RadioPrimitive.Item>
      ))}
    </RadioPrimitive.Root>
  );
}
