import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Page({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="page" className={cn("grid gap-10", className)} {...props} />;
}

export function PageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-3", className)} {...props} />;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("type-label text-fg-2", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden className="text-fg-3">/</span> : null}
            <Link
              href={item.href}
              className="rounded-key underline-offset-4 outline-none hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("type-title text-balance", className)} {...props} />;
}

export function PageLead({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("max-w-lead type-body text-fg-2 text-pretty", className)} {...props} />
  );
}

export function Statement({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("max-w-measure type-statement text-pretty", className)} {...props} />;
}

export function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid max-w-measure gap-4 type-body [&_p]:text-pretty", className)}
      {...props}
    />
  );
}

export function HowItWorks({
  title = "How it works",
  steps,
  className,
}: {
  title?: string;
  steps: { title: React.ReactNode; body?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("grid gap-3", className)}>
      <h2 className="type-section">{title}</h2>
      <ol className="grid list-none p-0 [&>*+*]:hairline">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 py-3.5">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-fill-2 type-micro text-fg-2 tabular-nums"
            >
              {i + 1}
            </span>
            <span className="grid gap-0.5 pt-0.5">
              <span className="type-body font-medium">{step.title}</span>
              {step.body ? <span className="type-caption text-fg-2">{step.body}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RelatedLinks({
  title = "Related",
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={cn("grid gap-3", className)}>
      <h2 className="type-section">{title}</h2>
      <ul className="grid list-none p-0 [&>*+*]:hairline">{children}</ul>
    </section>
  );
}
