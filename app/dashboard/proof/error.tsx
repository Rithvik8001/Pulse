"use client";

import { DashboardRouteError } from "@/components/product/dashboard-route-state";

export default function ProofError({ reset }: { reset: () => void }) {
  return (
    <DashboardRouteError
      message="Pulse could not load your Proof archive."
      reset={reset}
    />
  );
}
