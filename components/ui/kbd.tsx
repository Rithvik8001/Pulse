import { cn } from "@/lib/utils";

/** Keyboard keys. Hidden on devices that cannot hover (touch). */
export function Kbd({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  return (
    <span
      className={cn("hidden items-center gap-1 can-hover:inline-flex", className)}
      aria-hidden
    >
      {keys.map((key, i) => (
        <kbd
          key={`${key}-${i}`}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-key border border-line bg-bg px-1.5 type-key text-fg-2"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
