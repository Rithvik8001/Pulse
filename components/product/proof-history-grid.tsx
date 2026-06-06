"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";
import { cn } from "@/lib/utils";

function formatProofTooltip(day: ProofHistoryDay) {
  const proofLabel = `${day.totalCount} Proof`;
  const winLabel = `${day.winCount} Win${day.winCount === 1 ? "" : "s"}`;
  const passLabel = `${day.passCount} Pass${day.passCount === 1 ? "" : "es"}`;

  return `${day.localDate}: ${proofLabel}, ${winLabel}, ${passLabel}`;
}

export function ProofHistoryGrid({ days }: { days: ProofHistoryDay[] }) {
  const winDays = days.filter((day) => day.winCount > 0).length;

  return (
    <div className="rounded-md border bg-muted/25 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Proof history</div>
          <div className="text-xs text-muted-foreground">
            {winDays} win {winDays === 1 ? "day" : "days"} in the last 8 weeks
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          <span className="size-3 rounded-[3px] border bg-background" />
          <span className="size-3 rounded-[3px] border border-primary/20 bg-primary/25" />
          <span className="size-3 rounded-[3px] border border-primary/30 bg-primary/55" />
          <span className="size-3 rounded-[3px] border border-primary bg-primary" />
          <span>More</span>
        </div>
      </div>
      <TooltipProvider>
        <div className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-x-auto pb-1">
          {days.map((day) => (
            <Tooltip key={day.localDate}>
              <TooltipTrigger asChild>
                <button
                  aria-label={formatProofTooltip(day)}
                  className={cn(
                    "size-3 rounded-[3px] border outline-none transition-[box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    day.winCount >= 3 && "border-primary bg-primary",
                    day.winCount === 2 && "border-primary/30 bg-primary/55",
                    day.winCount === 1 && "border-primary/20 bg-primary/25",
                    day.winCount === 0 &&
                      day.passCount > 0 &&
                      "border-muted-foreground/30 bg-muted-foreground/25",
                    day.totalCount === 0 && "border-border bg-background",
                  )}
                  type="button"
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {formatProofTooltip(day)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
