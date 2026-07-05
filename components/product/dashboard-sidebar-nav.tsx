"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  ChartLineData01Icon,
  CheckmarkCircle01Icon,
  Home01Icon,
  NotebookIcon,
  Target01Icon,
  UserStoryIcon,
} from "@hugeicons/core-free-icons";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navGroups = [
  [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home01Icon,
      disabled: false,
    },
  ],
  [
    {
      label: "Quests",
      href: "/dashboard/quests",
      icon: Target01Icon,
      disabled: false,
    },
    {
      label: "Proof",
      href: "/dashboard/proof",
      icon: CheckmarkCircle01Icon,
      disabled: false,
    },
    {
      label: "Stats",
      href: "/dashboard/stats",
      icon: ChartLineData01Icon,
      disabled: false,
    },
  ],
  [
    {
      label: "Identity",
      href: "/dashboard/identity",
      icon: AiBrain01Icon,
      disabled: false,
    },
    {
      label: "Journal",
      href: "/dashboard/journal",
      icon: NotebookIcon,
      disabled: false,
    },
    {
      label: "Story",
      href: "/dashboard/story",
      icon: UserStoryIcon,
      disabled: false,
    },
  ],
];

type DashboardSidebarNavProps = {
  linkClassName: string;
};

export function DashboardSidebarNav({
  linkClassName,
}: DashboardSidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      {navGroups.map((group, groupIndex) => (
        <SidebarMenu key={groupIndex} className="px-2">
          {group.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
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
                    data-active={isActive}
                    className={cn(
                      linkClassName,
                      isActive && "bg-card text-foreground hover:bg-card",
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={18}
                      strokeWidth={1.7}
                    />
                    <span>{item.label}</span>
                  </Link>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      ))}
    </div>
  );
}
