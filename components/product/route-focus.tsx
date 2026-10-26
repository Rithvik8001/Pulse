"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** Moves focus to main on every route change, after the first render. */
export function RouteFocus() {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const main = document.getElementById("main");
    main?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
