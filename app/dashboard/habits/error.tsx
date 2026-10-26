"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function HabitsError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} message="Your habits did not load. Check your connection, then try again." />;
}
