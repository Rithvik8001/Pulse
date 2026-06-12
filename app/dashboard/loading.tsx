import { DashboardPageSkeleton } from "@/components/product/dashboard-route-state";

export default function DashboardLoading() {
  return <DashboardPageSkeleton cards={4} listRows={5} />;
}
