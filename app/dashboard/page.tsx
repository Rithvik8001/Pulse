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

function summary(done: number, due: number, total: number) {
  if (total === 0) return "No habits yet.";
  if (due === 0) return "Nothing due today.";
  if (done === 0) return due === 1 ? "1 habit due today." : `${due} habits due today.`;
  if (done >= due) return due === 1 ? "Your habit for today is checked in." : `All ${due} due habits checked in.`;
  return `${done} of ${due} due habits checked in.`;
}

export default async function TodayPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const dashboard = await getDashboardDataForUser(userId, dateContext);

  if (!dashboard.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const total = dashboard.quests.length;
  const dueQuests = dashboard.quests.filter(
    (quest) => quest.dueToday || (quest.thisWeek !== null && quest.todayCheckIn !== null),
  );
  const notDueQuests = dashboard.quests.filter((quest) => !dueQuests.includes(quest));
  const done = dueQuests.filter((quest) => quest.todayCheckIn).length;

  return (
    <Page>
      <PageHeader>
        <PageTitle>Today</PageTitle>
        <PageLead>{summary(done, dueQuests.length, total)}</PageLead>
      </PageHeader>

      {total > 0 ? (
        <CheckInList quests={dueQuests} notDueQuests={notDueQuests} />
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
