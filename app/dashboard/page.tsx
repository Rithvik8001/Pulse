import type { Metadata } from "next";

import { CheckInList } from "@/components/product/check-in-list";
import { SetupGate } from "@/components/product/setup-gate";
import { Notice } from "@/components/ui/notice";
import { Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { NavRow } from "@/components/ui/row";
import { getDashboardDataForUser, requireUserId } from "@/lib/pulse/dashboard";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Today - Pulse",
  description: "Check in on today's habits.",
};

function summary(done: number, total: number) {
  if (total === 0) return "No habits yet.";
  if (done === 0) return total === 1 ? "1 habit to check in today." : `${total} habits to check in today.`;
  if (done >= total) return total === 1 ? "Checked in today." : `All ${total} checked in today.`;
  return `${done} of ${total} checked in today.`;
}

export default async function TodayPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const dashboard = await getDashboardDataForUser(userId, dateContext);

  if (!dashboard.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const total = dashboard.quests.length;
  const done = dashboard.quests.filter((quest) => quest.todayCheckIn).length;

  return (
    <Page>
      <PageHeader>
        <PageTitle>Today</PageTitle>
        <PageLead>{summary(done, total)}</PageLead>
      </PageHeader>

      {total > 0 ? (
        <CheckInList quests={dashboard.quests} />
      ) : (
        <Notice action={{ label: "Add a habit", href: "/dashboard/habits#new-habit" }}>
          You have no active habits.
        </Notice>
      )}

      <NavRow
        as="div"
        href="/dashboard/journal"
        feature="journal"
        title="Write in your journal"
        caption="A few lines about today"
        className="bg-fill hover:bg-fill-2"
      />
    </Page>
  );
}
