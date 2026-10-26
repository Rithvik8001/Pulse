"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Sparkle } from "@phosphor-icons/react";
import { Command } from "cmdk";

import { goKeys, useShell } from "@/components/product/shell";
import { FeatureChip } from "@/components/ui/feature-chip";
import { features, type Feature } from "@/components/ui/features";
import { Icon, type IconComponent } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Tray, TrayContent } from "@/components/ui/tray";

const itemClassName =
  "flex h-10 cursor-pointer items-center gap-3 rounded-item px-3 type-body font-medium outline-none select-none data-[selected=true]:bg-fill-2 data-[selected=true]:inset-rule";

function Item({
  onSelect,
  icon,
  feature,
  shortcut,
  children,
  keywords,
}: {
  onSelect: () => void;
  icon?: IconComponent;
  feature?: Feature;
  shortcut?: string[];
  children: React.ReactNode;
  keywords?: string[];
}) {
  return (
    <Command.Item onSelect={onSelect} keywords={keywords} className={itemClassName}>
      {feature ? (
        <FeatureChip feature={feature} size="sm" />
      ) : icon ? (
        <span className="inline-flex size-8 items-center justify-center text-fg-2">
          <Icon icon={icon} size="sm" />
        </span>
      ) : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <Kbd keys={shortcut} /> : null}
    </Command.Item>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:type-section"
    >
      {children}
    </Command.Group>
  );
}

const destinations: { key: Feature; keywords: string[] }[] = [
  { key: "today", keywords: ["check in", "home"] },
  { key: "habits", keywords: ["quest", "add habit", "archive"] },
  { key: "history", keywords: ["proof", "check-ins", "stats", "consistency"] },
  { key: "review", keywords: ["recap", "story", "identity", "milestones", "statement"] },
  { key: "journal", keywords: ["entry", "write"] },
  { key: "settings", keywords: ["theme", "dark", "sign out", "email"] },
];

const goKeyFor = Object.fromEntries(
  Object.entries(goKeys).map(([key, feature]) => [feature, key]),
) as Partial<Record<Feature, string>>;

export function CommandMenu() {
  const router = useRouter();
  const { panel, close, open } = useShell();
  const [query, setQuery] = React.useState("");
  const isOpen = panel === "command";

  function go(href: string) {
    close();
    router.push(href);
  }

  return (
    <Tray
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          setQuery("");
          close();
        }
      }}
    >
      <TrayContent width="wide" className="top-[12vh] translate-y-0 data-[state=open]:animate-rise" aria-describedby={undefined}>
        <DialogPrimitive.Title className="sr-only">Search or go to a page</DialogPrimitive.Title>
        <Command label="Search or go to a page" loop className="grid gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-3"
            />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Go to"
              aria-label="Search or go to a page"
              className="field pl-12"
            />
          </div>
          <Command.List className="max-h-[min(24rem,50dvh)] overflow-y-auto overscroll-contain">
            <Command.Empty className="px-3 py-6 text-center type-body text-fg-2">
              Nothing matches.
            </Command.Empty>
            <Group heading="Go to">
              {destinations.map(({ key, keywords }) => (
                <Item
                  key={key}
                  feature={key}
                  keywords={keywords}
                  shortcut={goKeyFor[key] ? ["G", goKeyFor[key]!.toUpperCase()] : undefined}
                  onSelect={() => go(features[key].href)}
                >
                  {features[key].label}
                </Item>
              ))}
            </Group>
            <Group heading="Assistant">
              <Item icon={Sparkle} shortcut={["A"]} keywords={["coach", "ask", "help"]} onSelect={() => open("assistant")}>
                Ask the assistant
              </Item>
            </Group>
          </Command.List>
        </Command>
      </TrayContent>
    </Tray>
  );
}
