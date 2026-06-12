"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function StatsError({ reset }: { reset: () => void }) {
  return (
    <DashboardRouteError
      message="Pulse could not load your analytics."
      reset={reset}
    />
  );
}
