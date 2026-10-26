"use client";

import * as React from "react";
import { AlertDialog as AlertPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

/**
 * A confirm tray for permanent deletes only. Undoable actions use a toast.
 * Submits a form with hidden fields through the given server action, so
 * callers keep the same field names they use today.
 */
export function ConfirmTray({
  trigger,
  title,
  body,
  confirmLabel,
  pendingLabel,
  formAction,
  hidden,
  onConfirm,
  open,
  onOpenChange,
  children,
}: {
  trigger?: React.ReactElement;
  title: React.ReactNode;
  body: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  /** Server action to submit. */
  formAction?: (formData: FormData) => void | Promise<void>;
  /** Hidden inputs submitted with the form. */
  hidden?: Record<string, string>;
  /** Client handler used instead of a form action. */
  onConfirm?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const content = (
    <>
      <AlertPrimitive.Title className="type-heading pt-1.5">{title}</AlertPrimitive.Title>
      <AlertPrimitive.Description className="type-body text-fg-2">
        {body}
      </AlertPrimitive.Description>
      {children}
    </>
  );

  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger> : null}
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="fixed inset-0 z-(--z-tray) scrim data-[state=open]:fade-in data-[state=closed]:animate-fade-out" />
        <AlertPrimitive.Content
          data-slot="confirm-tray"
          className={cn(
            "fixed top-1/2 left-1/2 z-(--z-tray) w-[calc(100vw-2rem)] max-w-tray -translate-x-1/2 -translate-y-1/2 rounded-tray bg-tray p-1.5 shadow-tray outline-none data-[state=open]:animate-rise data-[state=closed]:animate-sink",
          )}
        >
          <div className="grid gap-4 rounded-card border border-card-rim bg-bg p-5.5 shadow-card">
            {formAction ? (
              <form action={formAction} className="grid gap-4">
                {content}
                {Object.entries(hidden ?? {}).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <div className="grid gap-2 pt-1">
                  <SubmitButton
                    variant="plain-destructive"
                    fullWidth
                    pendingLabel={pendingLabel}
                  >
                    {confirmLabel}
                  </SubmitButton>
                  <AlertPrimitive.Cancel asChild>
                    <Button variant="text" fullWidth>
                      Cancel
                    </Button>
                  </AlertPrimitive.Cancel>
                </div>
              </form>
            ) : (
              <>
                {content}
                <div className="grid gap-2 pt-1">
                  <AlertPrimitive.Action asChild>
                    <Button variant="plain-destructive" fullWidth onClick={onConfirm}>
                      {confirmLabel}
                    </Button>
                  </AlertPrimitive.Action>
                  <AlertPrimitive.Cancel asChild>
                    <Button variant="text" fullWidth>
                      Cancel
                    </Button>
                  </AlertPrimitive.Cancel>
                </div>
              </>
            )}
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
