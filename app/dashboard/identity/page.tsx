import type { Metadata } from "next";

import { IdentityTimeline } from "@/components/product/identity-timeline";
import { SetupGate } from "@/components/product/setup-gate";
import { Notice } from "@/components/ui/notice";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { getIdentityTimelineDataForUser } from "@/lib/pulse/identity";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Identity · Pulse",
  description: "Evidence of who you are becoming.",
};

export default async function IdentityPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getIdentityTimelineDataForUser(userId, dateContext);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const hasEvidence = data.views["90d"].nodes.length > 0;

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Identity</PageTitle>
        <PageLead>
          Proof, journal entries and stories, read as evidence of who {data.character.name}{" "}
          is becoming.
        </PageLead>
      </PageHeader>

      {hasEvidence ? (
        <IdentityTimeline data={data} locale={dateContext.locale} />
      ) : (
        <Notice action={{ label: "Go to today", href: "/dashboard" }}>
          Save one check-in or journal entry to start the timeline.
        </Notice>
      )}
    </Page>
  );
}
