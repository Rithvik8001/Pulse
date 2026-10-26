import { Check, Minus } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

export function ProofOutcome({
  outcome,
  className,
}: {
  outcome: "win" | "pass";
  className?: string;
}) {
  const win = outcome === "win";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 type-label",
        win ? "text-ok" : "text-fg-2",
        className,
      )}
    >
      {win ? (
        <Check size={16} weight="bold" aria-hidden />
      ) : (
        <Minus size={16} aria-hidden />
      )}
      {win ? "Done" : "Skipped"}
    </span>
  );
}
