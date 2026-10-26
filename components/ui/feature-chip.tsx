import { features, tintClassName, type Feature, type Tint } from "@/components/ui/features";
import { Icon, type IconComponent } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** An icon on a tinted rounded square. Identifies a feature; never decorative alone. */
export function FeatureChip({
  feature,
  tint,
  icon,
  size = "md",
  className,
}: {
  feature?: Feature;
  /** Override the tint, for things that are not a feature (evidence kinds). */
  tint?: Tint;
  icon?: IconComponent;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const f = feature ? features[feature] : undefined;
  const t = tint ?? f?.tint ?? "neutral";
  const glyph = icon ?? f?.icon;
  if (!glyph) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "sm" && "size-8 rounded-key",
        size === "md" && "size-10 rounded-inner",
        size === "lg" && "size-14 rounded-item",
        tintClassName[t],
        className,
      )}
    >
      <Icon icon={glyph} size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
    </span>
  );
}
