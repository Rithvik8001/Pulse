import { DashboardPageSkeleton } from "@/components/product/dashboard-route-state";

export default function StatsLoading() {
  return <DashboardPageSkeleton cards={4} chart listRows={4} />;
}
