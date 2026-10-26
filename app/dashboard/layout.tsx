import { redirect } from "next/navigation";

import { getEmailPreferenceRow } from "@/app/dashboard/_data";
import { AppHeader } from "@/components/product/app-header";
import { AssistantTray } from "@/components/product/assistant-tray";
import { CommandMenu } from "@/components/product/command-menu";
import { NavTray } from "@/components/product/nav-tray";
import { RouteFocus } from "@/components/product/route-focus";
import { ShellProvider } from "@/components/product/shell";
import { ShortcutsTray } from "@/components/product/shortcuts-tray";
import { UserSettingsSync } from "@/components/product/user-settings-sync";
import { getCharacterNameForUser } from "@/lib/pulse/dashboard";
import { getUserSettingsForUser } from "@/lib/pulse/user-settings";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/sign-in?next=/dashboard");
  }

  const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;

  if (userId && typeof data.claims.email === "string") {
    await getEmailPreferenceRow(userId, data.claims.email);
  }
  const settings = userId ? await getUserSettingsForUser(userId) : null;
  const characterName = userId ? await getCharacterNameForUser(userId) : null;
  const showHabits = Boolean(characterName);

  return (
    <ShellProvider>
      {settings ? (
        <UserSettingsSync locale={settings.locale} timeZone={settings.timeZone} />
      ) : null}
      <AppHeader />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-page flex-1 px-5 py-10 outline-none max-sm:px-4"
      >
        {children}
      </main>
      <RouteFocus />
      <NavTray />
      <CommandMenu />
      <ShortcutsTray />
      <AssistantTray showHabits={showHabits} />
    </ShellProvider>
  );
}
