"use client";

import * as React from "react";
import { RadioGroup as RadioPrimitive } from "radix-ui";

import { Icon, type IconComponent } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: React.ReactNode;

  icon?: IconComponent;
  iconOnly?: boolean;
  disabled?: boolean;
};

export type SegmentedProps = {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SegmentedOption[];
  size?: "md" | "sm";

  stackOnPhone?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Segmented({
  label,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  size = "md",
  stackOnPhone,
  disabled,
  className,
}: SegmentedProps) {
  const [internal, setInternal] = React.useState(
    defaultValue ?? options[0]?.value,
  );
  const current = value ?? internal;
  const found = options.findIndex((o) => o.value === current);

  const index = Math.max(0, found);

  return (
    <RadioPrimitive.Root
      aria-label={label}
      name={name}
      value={current}
      onValueChange={(v) => {
        setInternal(v);
        onValueChange?.(v);
      }}
      disabled={disabled}
      orientation="horizontal"
      data-slot="segmented"
      style={
        {
          "--count": options.length,
          "--cols": `repeat(${options.length}, minmax(0, 1fr))`,
          "--index": index,
        } as React.CSSProperties
      }
      className={cn(
        "relative isolate grid w-full track rounded-control p-1",
        stackOnPhone ? "max-sm:grid-cols-1 sm:grid-cols-(--cols)" : "grid-cols-(--cols)",
        disabled && "opacity-(--muted)",
        className,
      )}
    >
            <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc((100%-0.5rem)/var(--count))] knob rounded-inner transition-transform duration-(--dur-2) ease-(--ease)",
          found < 0 && "hidden",
          stackOnPhone && "max-sm:hidden",
        )}
        style={{ transform: "translateX(calc(var(--index) * 100%))" }}
      />
      {options.map((option) => (
        <RadioPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.iconOnly ? String(option.label) : undefined}
          className={cn(
            "relative z-0 inline-flex items-center justify-center gap-2 rounded-inner px-3 type-label text-fg-2 outline-none press transition-colors duration-(--dur-2) hover:text-ink data-[state=checked]:text-ink",
            size === "md" ? "h-control-sm" : "h-control-xs",
            stackOnPhone && "max-sm:data-[state=checked]:knob",
          )}
        >
          {option.icon ? <Icon icon={option.icon} size="sm" /> : null}
          {option.iconOnly ? null : <span className="truncate">{option.label}</span>}
        </RadioPrimitive.Item>
      ))}
    </RadioPrimitive.Root>
  );
}
