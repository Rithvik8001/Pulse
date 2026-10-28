"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearSix, List, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";

import { Mascot } from "@/components/landing/mascot";
import { AiQuotaChip } from "@/components/product/ai-quota";
import { useShell } from "@/components/product/shell";
import { features, type Feature } from "@/components/ui/features";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const primaryLinks: Feature[] = ["today", "habits", "history", "review"];

export function isCurrent(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function AppHeader({ showAssistant = true }: { showAssistant?: boolean }) {
  const pathname = usePathname();
  const { open, toggle } = useShell();

  return (
    <header className="sticky top-0 z-(--z-bar) bg-bg">
      <div className="mx-auto flex h-header w-full max-w-page items-center gap-2 px-5 max-sm:px-4">
        <Link
          href="/dashboard"
          aria-label="Pulse home"
          className="flex items-center rounded-inner py-1 pr-2 outline-none"
        >
          <Mascot width={28} height={28} />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-2 md:flex">
          {primaryLinks.map((key) => {
            const f = features[key];
            const current = isCurrent(pathname, f.href);
            return (
              <Link
                key={key}
                href={f.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-control-sm items-center rounded-inner px-3 type-label text-fg-2 outline-none transition-colors duration-(--dur-1) hover:text-ink",
                  current && "bg-fill-2 text-ink inset-rule",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => open("command")}
            className="hidden h-control-sm items-center gap-2 rounded-pill bg-fill px-3 type-label text-fg-3 outline-none press transition-colors duration-(--dur-1) hover:bg-fill-2 hover:text-fg-2 md:inline-flex"
          >
            <MagnifyingGlass size={16} aria-hidden />
            <span className="hidden lg:inline">Search</span>
            <Kbd keys={["⌘", "K"]} />
          </button>
          <IconButton
            label="Search"
            icon={MagnifyingGlass}
            size="sm"
            shortcut={["⌘", "K"]}
            className="md:hidden"
            onClick={() => open("command")}
          />
          {showAssistant ? <AiQuotaChip /> : null}
          {showAssistant ? (
            <IconButton
              label="Ask Pip"
              icon={Sparkle}
              shortcut={["A"]}
              onClick={() => toggle("assistant")}
            />
          ) : null}
          <IconButton
            label="Settings"
            icon={GearSix}
            asChild
            className={cn(
              "hidden md:inline-flex",
              isCurrent(pathname, "/dashboard/settings") && "bg-fill-2 text-ink inset-rule",
            )}
          >
            <Link href="/dashboard/settings" />
          </IconButton>
          <IconButton
            label="Menu"
            icon={List}
            className="md:hidden"
            onClick={() => open("nav")}
          />
        </div>
      </div>
    </header>
  );
}
