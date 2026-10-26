"use client";

import * as React from "react";
import Link from "next/link";
import { DropdownMenu as MenuPrimitive } from "radix-ui";

import { Icon, type IconComponent } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export const menuContentClassName =
  "z-(--z-tray) min-w-(--container-menu) overflow-hidden rounded-menu border border-line bg-bg p-1.5 shadow-tray data-[state=open]:animate-rise data-[state=closed]:animate-fade-out";

export const menuItemClassName =
  "relative flex h-10 cursor-pointer items-center gap-2 rounded-item px-3 type-body font-medium text-ink outline-none select-none data-disabled:opacity-(--muted) data-highlighted:bg-fill-2 data-highlighted:inset-rule [&_svg]:shrink-0 [&_svg]:text-fg-2 data-highlighted:[&_svg]:text-ink";

export function Menu({
  trigger,
  children,
  align = "end",
  side,
  open,
  onOpenChange,
}: {
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <MenuPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          className={menuContentClassName}
        >
          {children}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

type ItemExtras = {
  icon?: IconComponent;
  destructive?: boolean;
  shortcut?: string[];
};

export function MenuItem({
  icon,
  destructive,
  shortcut,
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & ItemExtras) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        menuItemClassName,
        destructive && "text-bad data-highlighted:bg-bad-bg [&_svg]:text-bad",
        className,
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size="sm" /> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <Kbd keys={shortcut} /> : null}
    </MenuPrimitive.Item>
  );
}

export function MenuLink({
  href,
  icon,
  shortcut,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive.Item>, "asChild"> &
  ItemExtras & { href: string }) {
  return (
    <MenuPrimitive.Item asChild className={cn(menuItemClassName, className)} {...props}>
      <Link href={href}>
        {icon ? <Icon icon={icon} size="sm" /> : null}
        <span className="flex-1 truncate">{children}</span>
        {shortcut ? <Kbd keys={shortcut} /> : null}
      </Link>
    </MenuPrimitive.Item>
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return (
    <MenuPrimitive.Separator
      className={cn("my-1.5 h-px bg-line", className)}
    />
  );
}

export function MenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn("px-3 py-1.5 type-section", className)}
      {...props}
    />
  );
}
