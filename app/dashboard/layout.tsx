import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  CheckmarkCircle01Icon,
  Home01Icon,
  NotebookIcon,
  Logout03Icon,
  Target01Icon,
  UserStoryIcon,
} from "@hugeicons/core-free-icons";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home01Icon,
      active: true,
      disabled: false,
    },
    {
      label: "Quests",
      href: "/dashboard",
      icon: Target01Icon,
      active: false,
      disabled: true,
    },
    {
      label: "Proof",
      href: "/dashboard",
      icon: CheckmarkCircle01Icon,
      active: false,
      disabled: true,
    },
    {
      label: "Journal",
      href: "/dashboard",
      icon: NotebookIcon,
      active: false,
      disabled: true,
    },
    {
      label: "Story",
      href: "/dashboard",
      icon: UserStoryIcon,
      active: false,
      disabled: true,
    },
  ];
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
                <Mascot width={28} height={28} />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                {item.disabled ? (
                  <SidebarMenuButton
                    aria-disabled="true"
                    disabled
                    title={item.label}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={15}
                      strokeWidth={1.7}
                    />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                ) : (
                  <Link
                    href={item.href}
                    title={item.label}
                    data-slot="sidebar-menu-button"
                    data-sidebar="menu-button"
                    data-size="default"
                    data-active={item.active}
                    className={cn(
                      sidebarLinkClassName,
                      item.active &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={15}
                      strokeWidth={1.7}
                    />
                    <span>{item.label}</span>
                  </Link>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
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
              <HugeiconsIcon
                icon={Logout03Icon}
                size={14}
                strokeWidth={1.7}
              />
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
          <Link
            href="/dashboard"
            aria-label="Pulse dashboard"
            className="flex size-8 items-center justify-center rounded-md"
          >
            <Mascot width={27} height={27} />
          </Link>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
