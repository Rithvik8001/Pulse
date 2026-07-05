import type { ComponentProps, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type SectionLabelProps = {
  icon?: ComponentProps<typeof HugeiconsIcon>["icon"];
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionLabel({
  icon,
  children,
  action,
  className,
}: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {icon ? (
          <HugeiconsIcon icon={icon} size={13} strokeWidth={1.9} />
        ) : null}
        {children}
      </div>
      <div className="h-px flex-1 bg-border" />
      {action}
    </div>
  );
}
