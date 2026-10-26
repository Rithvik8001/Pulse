import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-control type-body select-none outline-none press disabled:pointer-events-none disabled:opacity-(--muted) data-[pending]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "keycap font-semibold",
        secondary: "keycap-2 font-semibold",
        text: "font-medium text-fg-2 hover:bg-fill hover:text-ink",
        ghost: "font-medium text-fg-2 hover:bg-fill hover:text-ink",
        destructive: "bg-bad-bg font-semibold text-bad hover:opacity-(--soft)",
        "plain-destructive": "font-medium text-bad hover:bg-bad-bg",
      },
      size: {
        md: "h-control px-4",
        sm: "h-control-sm px-3 type-label",
        xs: "h-control-xs gap-1.5 px-3 type-small font-medium",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

type Variant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type Size = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export type ButtonProps = Omit<React.ComponentProps<"button">, "size"> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;

  pending?: boolean;
  pendingLabel?: React.ReactNode;
  asChild?: boolean;
};

function Button({
  className,
  variant = "secondary",
  size = "md",
  fullWidth,
  pending,
  pendingLabel,
  asChild = false,
  children,
  disabled,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const v = variant;
  const s = size;

  const content =
    pending && pendingLabel ? (
      <span className="grid">
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {children}
        </span>
        <span className="col-start-1 row-start-1">{pendingLabel}</span>
      </span>
    ) : (
      children
    );

  return (
    <Comp
      data-slot="button"
      data-variant={v}
      data-size={s}
      data-pending={pending ? "" : undefined}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      disabled={disabled}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant: v, size: s, fullWidth, className }))}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
