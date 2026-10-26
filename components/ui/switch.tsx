"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-switch-h w-switch-w shrink-0 items-center rounded-pill track p-0.75 outline-none transition-[background,box-shadow] duration-(--dur-2) ease-(--ease) data-[state=checked]:keycap disabled:opacity-(--muted)",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-switch-knob rounded-pill knob transition-transform duration-(--dur-2) ease-(--ease) data-[state=checked]:translate-x-4.5" />
    </SwitchPrimitive.Root>
  );
}
