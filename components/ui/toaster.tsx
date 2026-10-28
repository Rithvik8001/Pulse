"use client";

import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      duration={5000}
      visibleToasts={3}
      containerAriaLabel="Notifications"
      icons={{
        success: <CheckCircle size={18} aria-hidden />,
        error: <WarningCircle size={18} aria-hidden />,
        warning: <Warning size={18} aria-hidden />,
        info: <Info size={18} aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full max-w-tray items-center gap-3 rounded-control border border-card-rim bg-bg px-4 py-3 text-ink shadow-tray outline-none",
          content: "grid min-w-0 flex-1 gap-0.5",
          title: "type-label",
          description: "type-small text-fg-2",
          icon: "flex shrink-0 items-center",
          success: "[&_[data-icon]]:text-ok",
          error: "[&_[data-icon]]:text-bad",
          warning: "[&_[data-icon]]:text-warn",
          actionButton:
            "shrink-0 cursor-pointer rounded-inner px-1 type-label text-brand-fg underline underline-offset-4 outline-none focus-visible:outline-ink",
          cancelButton:
            "shrink-0 cursor-pointer rounded-inner px-1 type-label text-fg-2 outline-none",
        },
      }}
    />
  );
}
