import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type IconComponent = PhosphorIcon;

const sizes = { sm: 16, md: 20, lg: 24 } as const;

export type IconProps = {
  icon: IconComponent;
  size?: keyof typeof sizes;
  /** Regular everywhere; bold only for check marks. */
  weight?: Extract<IconWeight, "regular" | "bold" | "fill">;
  /** Give the icon a name only when no visible text accompanies it. */
  label?: string;
  className?: string;
};

export function Icon({
  icon: Glyph,
  size = "md",
  weight = "regular",
  label,
  className,
}: IconProps) {
  return (
    <Glyph
      size={sizes[size]}
      weight={weight}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0", className)}
    />
  );
}
