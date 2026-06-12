"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} />;
}
