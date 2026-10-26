"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Toasts confirm actions; they never carry errors. Deletions use an Undo
 * toast, never a confirm dialog. A pill at the bottom centre that rises once.
 */

type ToastItem = {
  id: number;
  title: React.ReactNode;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
}

function show(
  title: React.ReactNode,
  options: { action?: ToastItem["action"]; duration?: number } = {},
) {
  const id = nextId++;
  items = [...items, { id, title, ...options }];
  emit();
  return id;
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  show,
  success: (title: React.ReactNode, options?: { action?: ToastItem["action"] }) =>
    show(title, options),
  /**
   * Transitional: errors belong inline in a Notice, not in a toast.
   * Removed once the last caller moves its error inline.
   */
  error: (title: React.ReactNode) => show(title, { duration: 8000 }),
  dismiss,
};

export function ToastViewport() {
  const [toasts, setToasts] = React.useState<ToastItem[]>(items);
  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return (
    <ToastPrimitive.Provider swipeDirection="down" duration={6000} label="Notification">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          duration={t.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={cn(
            "flex h-control items-center gap-4 rounded-pill bg-ink pr-4 pl-5 type-label text-on-ink shadow-tray outline-none data-[state=open]:animate-toast-rise data-[state=closed]:animate-fade-out data-[swipe=end]:animate-fade-out data-[swipe=move]:translate-y-(--radix-toast-swipe-move-y)",
          )}
        >
          <ToastPrimitive.Title className="min-w-0 truncate">{t.title}</ToastPrimitive.Title>
          {t.action ? (
            <ToastPrimitive.Action
              altText={t.action.label}
              onClick={t.action.onClick}
              className="shrink-0 rounded-inner px-1 underline underline-offset-4 outline-none focus-visible:outline-on-ink"
            >
              {t.action.label}
            </ToastPrimitive.Action>
          ) : null}
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-6 left-1/2 z-(--z-toast) flex w-[calc(100vw-2rem)] max-w-tray -translate-x-1/2 flex-col items-center gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
