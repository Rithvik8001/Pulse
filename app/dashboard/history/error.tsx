"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function HistoryError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} message="Your history did not load. Check your connection, then try again." />;
}
