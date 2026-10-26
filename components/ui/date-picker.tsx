"use client";

import * as React from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { useFieldContext } from "@/components/ui/field";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  locale = "en-US",
  placeholder = "Pick a date",
  format = { weekday: "short", month: "short", day: "numeric" },
  className,
  disabled,
  ...calendar
}: Omit<CalendarProps, "className" | "autoFocus"> & {
  placeholder?: string;
  format?: Intl.DateTimeFormatOptions;
  className?: string;
  disabled?: boolean;
}) {
  const ctx = useFieldContext();
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={ctx?.id}
        aria-describedby={ctx?.describedBy}
        aria-invalid={ctx?.invalid || undefined}
        data-slot="date-picker"
        disabled={disabled}
        className={cn(
          "field flex items-center justify-between gap-3 text-left tabular-nums disabled:opacity-(--muted)",
          !value && "text-fg-3",
          className,
        )}
      >
        <span className="truncate">
          {value ? formatLocalDateForLocale(value, locale, format) : placeholder}
        </span>
        <CalendarBlank size={16} aria-hidden className="shrink-0 text-fg-2" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-(--z-tray) rounded-menu border border-line bg-bg p-3 shadow-tray outline-none data-[state=open]:animate-rise data-[state=closed]:animate-fade-out"
        >
          <Calendar
            {...calendar}
            autoFocus
            locale={locale}
            value={value}
            onChange={(d) => {
              onChange?.(d);
              setOpen(false);
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
