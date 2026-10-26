"use client";

import * as React from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { Select as SelectPrimitive } from "radix-ui";

import { Field, useFieldContext, type FieldProps } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type SelectProps = Omit<FieldProps, "children"> & {
  /** Renders a hidden native select so the value submits with the form. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

/**
 * A select that looks like a field, with a chevron that turns when open.
 * The popup is a menu.
 */
export function Select({
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  disabled,
  triggerClassName,
  required,
  ...field
}: SelectProps) {
  return (
    <Field required={required} {...field}>
      <SelectControl
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={triggerClassName}
      />
    </Field>
  );
}

function SelectControl({
  options,
  placeholder,
  className,
  ...root
}: Pick<
  SelectProps,
  | "name"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "options"
  | "placeholder"
  | "disabled"
  | "required"
> & { className?: string }) {
  const ctx = useFieldContext();
  return (
    <SelectPrimitive.Root {...root}>
      <SelectPrimitive.Trigger
        id={ctx?.id}
        aria-describedby={ctx?.describedBy}
        aria-invalid={ctx?.invalid || undefined}
        data-slot="select-trigger"
        className={cn(
          "group/select field flex items-center justify-between gap-3 text-left data-[placeholder]:text-fg-3 disabled:opacity-(--muted) [&>span]:truncate",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <CaretDown
            size={16}
            aria-hidden
            className="shrink-0 text-fg-2 transition-transform duration-(--dur-2) ease-(--ease) group-data-[state=open]/select:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-(--z-tray) max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-menu border border-line bg-bg p-1.5 shadow-tray data-[state=open]:animate-rise data-[state=closed]:animate-fade-out"
        >
          <SelectPrimitive.Viewport className="grid gap-0.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex h-10 cursor-pointer items-center gap-2 rounded-item pr-10 pl-3 type-body font-medium outline-none select-none data-disabled:opacity-(--muted) data-highlighted:bg-fill-2 data-highlighted:inset-rule"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center">
                  <Check size={16} weight="bold" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
