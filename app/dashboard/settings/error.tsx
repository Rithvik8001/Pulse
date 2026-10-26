"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function SettingsError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} message="Settings could not be loaded." />;
}
