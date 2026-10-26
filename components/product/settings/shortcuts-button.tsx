"use client";

import { useShell } from "@/components/product/shell";
import { Button } from "@/components/ui/button";

export function ShortcutsButton() {
  const { open } = useShell();
  return (
    <Button variant="text" size="sm" onClick={() => open("shortcuts")}>
      Show shortcuts
    </Button>
  );
}
