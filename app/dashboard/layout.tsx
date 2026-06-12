import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, Logout03Icon } from "@hugeicons/core-free-icons";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { Mascot } from "@/components/landing/mascot";
import { DashboardSidebarNav } from "@/components/product/dashboard-sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { syncEmailPreference } from "@/lib/email/preferences";
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

  if (typeof data.claims.sub === "string" && typeof data.claims.email === "string") {
    await syncEmailPreference(data.claims.sub, data.claims.email);
  }

  const sidebarLinkClassName = cn(
    "peer/menu-button group/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] p-2 text-left text-xs ring-sidebar-ring outline-hidden transition-[width,height,padding]",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
    "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  );

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/dashboard"
                aria-label="Pulse dashboard"
                title="Dashboard"
                data-slot="sidebar-menu-button"
                data-sidebar="menu-button"
                data-size="default"
                data-active="false"
                className={cn(sidebarLinkClassName, "h-10")}
              >
                <Mascot width={32} height={32} />
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <DashboardSidebarNav linkClassName={sidebarLinkClassName} />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={1.7} />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {email}
            </span>
          </div>
          <form action={signOutAction}>
            <Button
              className="w-full justify-start"
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
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
