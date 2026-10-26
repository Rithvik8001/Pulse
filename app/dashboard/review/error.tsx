"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function ReviewError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} message="Your review did not load. Check your connection, then try again." />;
}
