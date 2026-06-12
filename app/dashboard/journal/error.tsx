"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function JournalError({ reset }: { reset: () => void }) {
  return (
    <DashboardRouteError
      message="Pulse could not load your Journal."
      reset={reset}
    />
  );
}
