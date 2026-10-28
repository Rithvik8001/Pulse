"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 400,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  delayDuration = 400,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-(--z-toast) inline-flex w-fit max-w-(--container-lead) items-center gap-2 rounded-item bg-ink px-3 py-1.5 type-small font-medium text-on-ink data-[state=delayed-open]:fade-in data-[state=closed]:animate-fade-out",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

function Tip({
  label,
  shortcut,
  leading,
  side,
  children,
}: {
  label: string;
  shortcut?: string[];
  leading?: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"];
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        {leading}
        {label}
        {shortcut ? <Kbd keys={shortcut} className="-mr-1" /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
