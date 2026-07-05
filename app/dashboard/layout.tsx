import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpDownIcon,
  Logout03Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { Mascot } from "@/components/landing/mascot";
import { DashboardSidebarNav } from "@/components/product/dashboard-sidebar-nav";
import { UserSettingsSync } from "@/components/product/user-settings-sync";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { syncEmailPreference } from "@/lib/email/preferences";
import { getCharacterNameForUser } from "@/lib/pulse/dashboard";
import { getUserSettingsForUser } from "@/lib/pulse/user-settings";
import { cn } from "@/lib/utils";
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

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Signed in";
  const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;

  if (userId && typeof data.claims.email === "string") {
    await syncEmailPreference(userId, data.claims.email);
  }
  const settings = userId ? await getUserSettingsForUser(userId) : null;
  const characterName = userId ? await getCharacterNameForUser(userId) : null;

  const sidebarLinkClassName = cn(
    "peer/menu-button group/menu-button flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left text-[13px] font-medium text-muted-foreground ring-sidebar-ring outline-hidden transition-colors",
    "hover:bg-card hover:text-foreground focus-visible:ring-2",
    "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! [&_svg]:size-[18px] [&_svg]:shrink-0 [&>span:last-child]:truncate",
  );

  return (
    <SidebarProvider>
      <Sidebar collapsible="none">
        <SidebarHeader className="gap-3 px-3 pt-4 pb-2">
          <Link
            href="/dashboard"
            aria-label="Pulse dashboard"
            className="flex items-center gap-2 px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Mascot width={26} height={26} />
            <span className="font-heading text-[15px] font-semibold tracking-[0.14em] uppercase group-data-[collapsible=icon]:hidden">
              Pulse
            </span>
          </Link>
          {characterName ? (
            <div className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={Target01Icon} size={14} strokeWidth={1.9} />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                {characterName}
              </span>
              <HugeiconsIcon
                icon={ArrowUpDownIcon}
                size={14}
                strokeWidth={1.7}
                className="shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
              />
            </div>
          ) : null}
        </SidebarHeader>
        <SidebarContent className="px-1 pt-2">
          <DashboardSidebarNav linkClassName={sidebarLinkClassName} />
        </SidebarContent>
        <SidebarFooter className="px-3 pb-4">
          <div className="flex min-w-0 items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {email}
            </span>
          </div>
          <form action={signOutAction}>
            <Button
              className="w-full justify-start rounded-lg"
              variant="outline"
              size="sm"
              type="submit"
            >
              <HugeiconsIcon icon={Logout03Icon} size={14} strokeWidth={1.7} />
              <span className="group-data-[collapsible=icon]:hidden">
                Sign out
              </span>
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {settings ? (
          <UserSettingsSync
            locale={settings.locale}
            timeZone={settings.timeZone}
          />
        ) : null}
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
