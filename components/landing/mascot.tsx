import { cn } from "@/lib/utils";

export function Mascot({
  width = 200,
  height = width,
  className,
  label,
}: {
  width?: number;
  height?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >

      <path
        d="M40 95 L112 28 C119 22 131 26 134 36 L163 135 C166 146 156 156 145 152 L46 123 C36 120 32 102 40 95 Z"
        fill="var(--mascot-eye)"
      />

      <path
        d="M43 95 L120 37 C126 33 134 37 135 44 L151 132 C153 142 143 150 134 146 L45 121 C36 118 34 101 43 95 Z"
        fill="var(--mascot-body)"
      />

      <path d="M51 96 L121 48 L100 104 L145 132 L57 115 Z" fill="var(--mascot-face)" />
    </svg>
  );
}
