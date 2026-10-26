"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

/**
 * Dialog "tray": a scrim with a 6px blur, a 28px tray holding a 22px card.
 * One job per tray. The card rises 8px and fades over 300ms.
 */

export const Tray = DialogPrimitive.Root;
export const TrayTrigger = DialogPrimitive.Trigger;
export const TrayClose = DialogPrimitive.Close;

export function TrayContent({
  width = "default",
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  width?: "default" | "wide";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-tray) scrim data-[state=open]:fade-in data-[state=closed]:animate-fade-out" />
      <DialogPrimitive.Content
        data-slot="tray"
        className={cn(
          "fixed top-1/2 left-1/2 z-(--z-tray) flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-tray bg-tray p-1.5 shadow-tray outline-none data-[state=open]:animate-rise data-[state=closed]:animate-sink",
          width === "wide" ? "max-w-tray-wide" : "max-w-tray",
          className,
        )}
        {...props}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-card border border-card-rim bg-bg p-5.5 shadow-card sm:p-5.5">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function TrayHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  /** Hidden from view but announced. */
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 pt-1.5">
        <DialogPrimitive.Title className="type-heading">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </div>
      <DialogPrimitive.Close asChild>
        <IconButton label="Close" icon={X} noTooltip className="-mt-1 -mr-1" />
      </DialogPrimitive.Close>
    </div>
  );
}

export function TrayBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-4", className)} {...props} />;
}

/** A full-width primary with optional text buttons stacked under it. */
export function TrayActions({
  primary,
  secondary,
  className,
}: {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 pt-1", className)}>
      {primary}
      {secondary}
    </div>
  );
}

/**
 * Multi-step content. Steps fade and slide 8px, and the card animates its
 * height between them.
 */
export function TraySteps({
  step,
  children,
  className,
}: {
  step: number;
  children: React.ReactNode[];
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>();
  const [track, setTrack] = React.useState({ step, direction: "forward" });
  if (track.step !== step) {
    setTrack({ step, direction: step > track.step ? "forward" : "back" });
  }
  const direction = track.direction;

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [step]);

  return (
    <div
      className={cn("overflow-hidden transition-[height] duration-(--dur-3) ease-(--ease)", className)}
      style={{ height }}
    >
      <div
        key={step}
        ref={ref}
        data-direction={direction}
        className="animate-fade-in data-[direction=forward]:animate-rise"
      >
        {children[step]}
      </div>
    </div>
  );
}

/** The done view: a centred thumbnail with a green check, a past-tense heading. */
export function TrayDone({
  thumbnail,
  heading,
  meta,
  children,
}: {
  thumbnail?: React.ReactNode;
  heading: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 py-2 text-center">
      {thumbnail ? (
        <div className="relative">
          {thumbnail}
          <span className="absolute -right-1.5 -bottom-1.5 inline-flex size-6 items-center justify-center rounded-pill bg-ok text-on-brand ring-2 ring-bg">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <path
                d="M3 8.5 6.5 12 13 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      ) : null}
      <div className="type-heading">{heading}</div>
      {meta ? <div className="type-caption text-fg-2">{meta}</div> : null}
      {children}
    </div>
  );
}
