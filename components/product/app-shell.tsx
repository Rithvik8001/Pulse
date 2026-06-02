"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Calendar03Icon,
  Home01Icon,
  NotebookIcon,
  Settings01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { Mascot } from "@/components/landing/mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Today",
    href: "/app/today",
    icon: Home01Icon,
    enabled: true,
  },
  {
    label: "Identities",
    href: "#",
    icon: Target01Icon,
    enabled: false,
  },
  {
    label: "Reflections",
    href: "#",
    icon: NotebookIcon,
    enabled: false,
  },
  {
    label: "Recaps",
    href: "#",
    icon: Calendar03Icon,
    enabled: false,
  },
  {
    label: "Settings",
    href: "#",
    icon: Settings01Icon,
    enabled: false,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="offcanvas" className="border-r">
          <SidebarHeader className="border-b px-3 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold tracking-tight"
            >
              <Mascot width={28} height={28} />
              <span className="sr-only">Pulse</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = item.enabled && pathname === item.href;
                    const icon = (
                      <HugeiconsIcon
                        icon={item.icon}
                        size={16}
                        strokeWidth={1.7}
                      />
                    );

                    return (
                      <SidebarMenuItem key={item.label}>
                        {item.enabled ? (
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              {icon}
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                aria-disabled="true"
                                className="opacity-55"
                                onClick={(event) => event.preventDefault()}
                              >
                                {icon}
                                <span>{item.label}</span>
                                <Badge
                                  variant="outline"
                                  className="ml-auto hidden h-4 px-1.5 text-[10px] md:inline-flex"
                                >
                                  Soon
                                </Badge>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              Coming in the next product milestone.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-3">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={15}
                  strokeWidth={1.7}
                />
                AI reflections
              </div>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                Notes are collected now. Pattern generation comes after auth.
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
            <SidebarTrigger />
            <div className="min-w-0">
              <div className="text-sm font-medium tracking-tight">Today</div>
              <div className="text-xs text-muted-foreground">
                A calm view of the proof you are building.
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn("ml-auto hidden md:inline-flex")}
            >
              <Link href="/onboarding">Reset setup</Link>
            </Button>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
