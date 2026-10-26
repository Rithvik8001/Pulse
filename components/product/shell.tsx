"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { features, type Feature } from "@/components/ui/features";

export type Panel = "command" | "assistant" | "shortcuts" | "nav" | null;

type ShellContextValue = {
  panel: Panel;
  open: (panel: Exclude<Panel, null>) => void;
  close: () => void;
  toggle: (panel: Exclude<Panel, null>) => void;
  announce: (message: string) => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

/** Destinations reachable with `g` then a key. */
export const goKeys: Record<string, Feature> = {
  t: "today",
  h: "habits",
  y: "history",
  r: "review",
  j: "journal",
  ",": "settings",
};

/** Old letters still work, quietly. */
const legacyGoKeys: Record<string, Feature> = {
  q: "habits",
  p: "history",
  s: "history",
  i: "review",
};

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"; // design-ok: tag names
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [panel, setPanel] = React.useState<Panel>(null);
  const [message, setMessage] = React.useState("");
  const pendingGo = React.useRef<number | null>(null);

  const announce = React.useCallback((text: string) => {
    setMessage("");
    window.setTimeout(() => setMessage(text), 50);
  }, []);

  const open = React.useCallback((p: Exclude<Panel, null>) => setPanel(p), []);
  const close = React.useCallback(() => setPanel(null), []);
  const toggle = React.useCallback(
    (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p)),
    [],
  );

  // Close transient panels on navigation. The assistant stays open.
  const [lastPathname, setLastPathname] = React.useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (panel && panel !== "assistant") setPanel(null);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle("command");
        return;
      }
      if (meta || event.altKey) return;
      if (isEditable(event.target)) return;

      if (pendingGo.current !== null) {
        window.clearTimeout(pendingGo.current);
        pendingGo.current = null;
        const feature = goKeys[event.key] ?? legacyGoKeys[event.key];
        if (feature) {
          event.preventDefault();
          router.push(features[feature].href);
          setPanel(null);
        }
        return;
      }

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        toggle("shortcuts");
        return;
      }
      switch (event.key) {
        case "/":
          event.preventDefault();
          toggle("command");
          break;
        case "a":
          event.preventDefault();
          toggle("assistant");
          break;
        case "g":
          pendingGo.current = window.setTimeout(() => {
            pendingGo.current = null;
          }, 1200);
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, toggle]);

  return (
    <ShellContext.Provider
      value={{ panel, open, close, toggle, announce }}
    >
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </ShellContext.Provider>
  );
}
