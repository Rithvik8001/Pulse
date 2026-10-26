import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";

/**
 * Shows the setup form until a character and quests exist, then the page.
 * Composition only; the loaders decide whether setup is complete.
 */
export function SetupGate({
  isSetupComplete,
  children,
}: {
  isSetupComplete: boolean;
  children: React.ReactNode;
}) {
  if (isSetupComplete) return <>{children}</>;
  return (
    <Page>
      <PageHeader>
        <PageTitle>Set up Pulse</PageTitle>
        <PageLead>
          Choose one character and one to three quests. Daily check-ins become
          proof of who you are becoming.
        </PageLead>
      </PageHeader>
      <DashboardSetupForm />
    </Page>
  );
}
