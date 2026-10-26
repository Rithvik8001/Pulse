"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

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
