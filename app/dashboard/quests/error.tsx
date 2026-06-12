"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function QuestsError({ reset }: { reset: () => void }) {
  return (
    <DashboardRouteError
      message="Pulse could not load your Quest manager."
      reset={reset}
    />
  );
}
