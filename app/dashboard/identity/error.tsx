"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function IdentityError({ reset }: { reset: () => void }) {
  return <DashboardRouteError reset={reset} message="Identity could not be loaded." />;
}
