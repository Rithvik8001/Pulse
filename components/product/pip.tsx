import { cn } from "@/lib/utils";

export const pipName = "Pip";

export function Pip({
  size = 40,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <path d="M32 17 C32 12 32.5 9 34 6" fill="none" stroke="var(--pip-leaf)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M33.5 8 C36 3 42 2 45 4 C43 9 38 11 33.5 8 Z" fill="var(--pip-leaf)" />
      <path d="M32.5 10 C29 6 24 6 22 8.5 C25 12 29.5 12.5 32.5 10 Z" fill="var(--pip-leaf)" />
      <path
        d="M32 16 C47 16 57 26.5 57 40 C57 52 46 59 32 59 C18 59 7 52 7 40 C7 26.5 17 16 32 16 Z"
        fill="var(--pip-shade)"
      />
      <path
        d="M32 16 C46 16 55 25.5 55 38.5 C55 49.5 45 56 32 56 C19 56 9 49.5 9 38.5 C9 25.5 18 16 32 16 Z"
        fill="var(--pip-body)"
      />
      <ellipse cx="32" cy="46" rx="13" ry="8.5" fill="var(--pip-belly)" />
      <ellipse cx="24" cy="34.5" rx="3.2" ry="4" fill="var(--pip-eye)" />
      <ellipse cx="40" cy="34.5" rx="3.2" ry="4" fill="var(--pip-eye)" />
      <circle cx="25.2" cy="33" r="1.1" fill="var(--pip-belly)" />
      <circle cx="41.2" cy="33" r="1.1" fill="var(--pip-belly)" />
      <ellipse cx="17.5" cy="41" rx="3.6" ry="2.2" fill="var(--pip-cheek)" />
      <ellipse cx="46.5" cy="41" rx="3.6" ry="2.2" fill="var(--pip-cheek)" />
      <path d="M28.5 40.5 Q32 44 35.5 40.5" fill="none" stroke="var(--pip-eye)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
