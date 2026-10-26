"use client";

import * as React from "react";
import { Slot } from "radix-ui";

import { Icon, type IconComponent } from "@/components/ui/icon";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type IconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> & {
  /** The accessible name. Also shown as the tooltip. */
  label: string;
  icon: IconComponent;
  size?: "md" | "sm";
  variant?: "ghost" | "secondary";
  shortcut?: string[];
  asChild?: boolean;
  /** Set when the button sits inside a component that already names it. */
  noTooltip?: boolean;
};

export function IconButton({
  label,
  icon,
  size = "md",
  variant = "ghost",
  shortcut,
  asChild,
  noTooltip,
  className,
  type,
  children,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const glyph = <Icon icon={icon} size="md" />;
  const content =
    asChild && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement, undefined, glyph)
      : glyph;
  const button = (
    <Comp
      data-slot="icon-button"
      aria-label={label}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-inner outline-none press disabled:pointer-events-none disabled:opacity-(--muted)",
        size === "md" ? "size-icon-button" : "size-control-sm",
        variant === "ghost" && "text-fg-2 hover:bg-fill hover:text-ink",
        variant === "secondary" && "keycap-2",
        className,
      )}
      {...props}
    >
      {content}
    </Comp>
  );
  if (noTooltip) return button;
  return (
    <Tip label={label} shortcut={shortcut}>
      {button}
    </Tip>
  );
}
