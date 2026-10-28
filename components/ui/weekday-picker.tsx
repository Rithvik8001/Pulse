"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type WeekdayOption = {
  value: string;
  short: string;
  label: string;
};

export function WeekdayPicker({
  label,
  name,
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  label: string;
  name?: string;
  options: WeekdayOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <>
      <ToggleGroupPrimitive.Root
        type="multiple"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        data-slot="weekday-picker"
        className={cn("grid grid-cols-7 gap-1 track rounded-control p-1", disabled && "opacity-(--muted)", className)}
      >
        {options.map((option) => (
          <ToggleGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className="inline-flex h-control-sm items-center justify-center rounded-inner type-label text-fg-2 outline-none press transition-colors duration-(--dur-2) hover:text-ink data-[state=on]:knob data-[state=on]:text-ink"
          >
            {option.short}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      {name ? value.map((day) => <input key={day} type="hidden" name={name} value={day} />) : null}
    </>
  );
}
