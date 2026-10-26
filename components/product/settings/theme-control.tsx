"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Segmented } from "@/components/ui/segmented";

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return (
    <Segmented
      label="Theme"
      size="sm"
      value={mounted ? (theme ?? "system") : "system"}
      onValueChange={setTheme}
      disabled={!mounted}
      options={[
        { value: "light", label: "Light" },
        { value: "system", label: "System" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}
