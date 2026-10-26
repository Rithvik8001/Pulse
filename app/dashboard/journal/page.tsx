import type { Metadata } from "next";

import { JournalEditor } from "@/components/product/journal-editor";
import { SetupGate } from "@/components/product/setup-gate";
import { Breadcrumb, HowItWorks, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getJournalDataForUser, journalHistoryDays } from "@/lib/pulse/journal";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Journal · Pulse",
  description: "One honest reflection a day.",
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getJournalDataForUser(userId, dateContext, selectedDate);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const lead = formatLocalDateForLocale(data.selectedDate, dateContext.locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Journal</PageTitle>
        <PageLead>{lead}</PageLead>
      </PageHeader>

      <JournalEditor
        history={data.history}
        selectedDate={data.selectedDate}
        today={dateContext.today}
        selectedEntry={data.selectedEntry}
        selectedProof={data.selectedProof}
        locale={dateContext.locale}
      />

      <HowItWorks
        steps={[
          { title: "One entry per day", body: "Coming back to a date updates that day's entry." },
          {
            title: "Proof stays in view",
            body: "The wins and passes from the selected day sit under the entry while you write.",
          },
          {
            title: "Entries feed your weekly story",
            body: `The last ${journalHistoryDays} days are kept here. This week's entries go into the story.`,
          },
        ]}
      />
    </Page>
  );
}
