import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-fill text-ink",
  ok: "bg-ok-bg text-ok",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
} as const;

/** Notices explain; they never shout. Body text with an optional text action. */
export function Notice({
  tone = "neutral",
  action,
  role,
  className,
  children,
}: {
  tone?: keyof typeof tones;
  action?: { label: string; href?: string; onClick?: () => void };
  role?: "alert" | "status";
  className?: string;
  children: React.ReactNode;
}) {
  const actionClass =
    "shrink-0 rounded-inner px-2 py-1 type-label underline-offset-4 outline-none hover:underline";
  return (
    <div
      role={role ?? (tone === "bad" ? "alert" : undefined)}
      data-slot="notice"
      className={cn(
        "flex items-start justify-between gap-4 rounded-notice p-4 type-body",
        tones[tone],
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action?.href ? (
        <Link href={action.href} className={actionClass}>
          {action.label}
        </Link>
      ) : action ? (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
