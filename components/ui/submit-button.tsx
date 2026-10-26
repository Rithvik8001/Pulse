"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/** A submit button that reads its pending state from the surrounding form. */
export function SubmitButton({
  pendingLabel,
  ...props
}: Omit<ButtonProps, "pending" | "type">) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      pending={pending}
      pendingLabel={pendingLabel}
    />
  );
}
