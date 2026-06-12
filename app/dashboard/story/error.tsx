"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function StoryError({ reset }: { reset: () => void }) {
  return (
    <DashboardRouteError
      message="Pulse could not load your Weekly Story."
      reset={reset}
    />
  );
}
