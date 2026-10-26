import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { getEmailPreferenceRow } from "@/app/dashboard/_data";
import { ShortcutsButton } from "@/components/product/settings/shortcuts-button";
import { ThemeControl } from "@/components/product/settings/theme-control";
import { Notice } from "@/components/ui/notice";
import { Breadcrumb, Page, PageHeader, PageTitle } from "@/components/ui/page";
import { DetailRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";
import { getUserSettingsForUser } from "@/lib/pulse/user-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings · Pulse",
  description: "Appearance, region and email preferences.",
};

function Value({ children }: { children: React.ReactNode }) {
  return <span className="type-body text-fg-2">{children}</span>;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims || typeof data.claims.sub !== "string") {
    redirect("/sign-in?next=/dashboard/settings");
  }
  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  const [settings, preference] = await Promise.all([
    getUserSettingsForUser(userId),
    email ? getEmailPreferenceRow(userId, email) : Promise.resolve(null),
  ]);

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Settings</PageTitle>
      </PageHeader>

      <Section title="Appearance">
        <RowList>
          <DetailRow
            label="Theme"
            caption="Follows your device by default."
            control={
              <div className="w-60 max-w-full">
                <ThemeControl />
              </div>
            }
            className="max-sm:flex-col max-sm:items-stretch"
          />
        </RowList>
      </Section>

      <Section title="Region">
        <RowList>
          <DetailRow label="Time zone" control={<Value>{settings.timeZone}</Value>} />
          <DetailRow label="Language and region" control={<Value>{settings.locale}</Value>} />
        </RowList>
        <Notice>Pulse uses your device&apos;s time zone and language.</Notice>
      </Section>

      <Section title="Email">
        <RowList>
          <DetailRow
            label="Product emails"
            control={<Value>{preference?.productEmailsEnabled ? "On" : "Off"}</Value>}
          />
          <DetailRow
            label="Weekly digest"
            control={<Value>{preference?.weeklyDigestEnabled ? "On" : "Off"}</Value>}
          />
        </RowList>
        <Notice>To stop emails, use the unsubscribe link in any Pulse email.</Notice>
      </Section>

      <Section title="Keyboard">
        <RowList>
          <DetailRow
            label="Keyboard shortcuts"
            caption="Press ? anywhere to see them."
            control={<ShortcutsButton />}
          />
        </RowList>
      </Section>

      <Section title="Account">
        <RowList>
          <DetailRow label="Email" control={<Value>{email ?? "Signed in"}</Value>} />
        </RowList>
        <form action={signOutAction}>
          <SummaryBar caption="Signed in on this device.">
            <SubmitButton variant="secondary" pendingLabel="Signing out">
              Sign out
            </SubmitButton>
          </SummaryBar>
        </form>
      </Section>
    </Page>
  );
}
