import * as React from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature, Tint } from "@/components/ui/features";
import type { IconComponent } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Lists are rows separated by the scribble hairline. Group with space and
 * dividers, never boxes.
 */
export function RowList({
  as = "ul",
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "ref"> & { as?: "ul" | "ol" | "div" }) {
  return React.createElement(
    as,
    {
      "data-slot": "row-list",
      className: cn("grid [&>*+*]:hairline", as !== "div" && "list-none p-0", className),
      ...props,
    },
    children,
  );
}

export function Row({
  as = "li",
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "ref"> & { as?: "li" | "div" }) {
  return React.createElement(as, {
    "data-slot": "row",
    className: cn("flex min-h-control items-center gap-4 py-3.5", className),
    ...props,
  });
}

/** Label plus optional caption on the left, a control on the right. */
export function DetailRow({
  label,
  caption,
  control,
  as,
  className,
}: {
  label: React.ReactNode;
  caption?: React.ReactNode;
  control?: React.ReactNode;
  as?: "li" | "div";
  className?: string;
}) {
  return (
    <Row as={as} className={cn("justify-between", className)}>
      <div className="grid min-w-0 gap-0.5">
        <div className="type-body font-medium">{label}</div>
        {caption ? <div className="type-caption text-fg-2">{caption}</div> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center gap-2">{control}</div> : null}
    </Row>
  );
}

/** Leading chip, title plus caption, actions on the right. */
export function ActionRow({
  leading,
  title,
  caption,
  actions,
  as,
  className,
  children,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  as?: "li" | "div";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Row as={as} className={cn("flex-wrap", className)}>
      {leading}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="truncate type-body font-medium">{title}</div>
        {caption ? <div className="type-caption text-fg-2">{caption}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      {children}
    </Row>
  );
}

/** A navigation row: tinted chip, title plus caption, chevron right. */
export function NavRow({
  href,
  feature,
  tint,
  icon,
  title,
  caption,
  current,
  as,
  className,
  onClick,
}: {
  href: string;
  feature?: Feature;
  tint?: Tint;
  icon?: IconComponent;
  title: React.ReactNode;
  caption?: React.ReactNode;
  current?: boolean;
  as?: "li" | "div";
  className?: string;
  onClick?: () => void;
}) {
  const Comp = as ?? "li";
  return (
    <Comp data-slot="nav-row" className="list-none">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        onClick={onClick}
        className={cn(
          "-mx-3 flex min-h-control items-center gap-4 rounded-row px-3 py-3 outline-none transition-colors duration-(--dur-1) hover:bg-fill aria-[current=page]:bg-fill-2 aria-[current=page]:inset-rule",
          className,
        )}
      >
        <FeatureChip feature={feature} tint={tint} icon={icon} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate type-body font-medium">{title}</span>
          {caption ? <span className="type-caption text-fg-2">{caption}</span> : null}
        </span>
        <CaretRight size={16} aria-hidden className="shrink-0 text-fg-3" />
      </Link>
    </Comp>
  );
}
