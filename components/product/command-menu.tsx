"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Keyboard,
  ListChecks,
  MagnifyingGlass,
  Moon,
  Notebook,
  PencilSimple,
  Plus,
  SignOut,
  Sparkle,
  Sun,
  SunHorizon,
} from "@phosphor-icons/react";
import { Command } from "cmdk";
import { useTheme } from "next-themes";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { goKeys, useShell } from "@/components/product/shell";
import { FeatureChip } from "@/components/ui/feature-chip";
import { features, type Feature } from "@/components/ui/features";
import { Icon, type IconComponent } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Tray, TrayContent } from "@/components/ui/tray";
import { cn } from "@/lib/utils";

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

const destinations: Feature[] = [
  "today",
  "quests",
  "proof",
  "stats",
  "identity",
  "journal",
  "story",
  "settings",
];

const goKeyFor = Object.fromEntries(
  Object.entries(goKeys).map(([key, feature]) => [feature, key]),
) as Record<Feature, string>;

/** The command menu. Opens with ⌘K, Ctrl K, or / when nothing is focused. */
export function CommandMenu({ showHabits }: { showHabits: boolean }) {
  const router = useRouter();
  const { panel, close, open, setAssistantTab } = useShell();
  const { setTheme } = useTheme();
  const signOutRef = React.useRef<HTMLFormElement>(null);
  const [query, setQuery] = React.useState("");

  const isOpen = panel === "command";

  function go(href: string) {
    close();
    router.push(href);
  }

  function assistant(tab: "coach" | "habits") {
    setAssistantTab(tab);
    open("assistant");
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
        <Command label="Command menu" loop className="grid gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-3"
            />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or jump to"
              aria-label="Search or jump to"
              className="field pl-12"
            />
          </div>
          <Command.List className="max-h-[min(24rem,50dvh)] overflow-y-auto overscroll-contain">
            <Command.Empty className="px-3 py-6 text-center type-body text-fg-2">
              Nothing matches.
            </Command.Empty>

            <Group heading="Go to">
              {destinations.map((key) => (
                <Item
                  key={key}
                  feature={key}
                  shortcut={["G", goKeyFor[key].toUpperCase()]}
                  onSelect={() => go(features[key].href)}
                >
                  {features[key].label}
                </Item>
              ))}
            </Group>

            <Group heading="Create">
              <Item icon={Plus} keywords={["quest", "habit"]} onSelect={() => go("/dashboard/quests#new-quest")}>
                New quest
              </Item>
              <Item icon={Notebook} keywords={["journal"]} onSelect={() => go("/dashboard/journal")}>
                Write today&apos;s entry
              </Item>
              <Item icon={PencilSimple} keywords={["story", "weekly"]} onSelect={() => go("/dashboard/story#write")}>
                Write weekly story
              </Item>
            </Group>

            <Group heading="Assistant">
              <Item icon={Sparkle} shortcut={["A"]} onSelect={() => assistant("coach")}>
                Ask coach
              </Item>
              {showHabits ? (
                <Item icon={ListChecks} onSelect={() => assistant("habits")}>
                  Ask habit agent
                </Item>
              ) : null}
            </Group>

            <Group heading="Preferences">
              <Item icon={Sun} keywords={["theme"]} onSelect={() => { setTheme("light"); close(); }}>
                Use light theme
              </Item>
              <Item icon={Moon} keywords={["theme"]} onSelect={() => { setTheme("dark"); close(); }}>
                Use dark theme
              </Item>
              <Item icon={SunHorizon} keywords={["theme", "system"]} onSelect={() => { setTheme("system"); close(); }}>
                Match system theme
              </Item>
              <Item icon={Keyboard} shortcut={["?"]} onSelect={() => open("shortcuts")}>
                Keyboard shortcuts
              </Item>
            </Group>

            <Group heading="Account">
              <Item icon={SignOut} onSelect={() => signOutRef.current?.requestSubmit()}>
                Sign out
              </Item>
            </Group>
          </Command.List>
        </Command>
        <form ref={signOutRef} action={signOutAction} className={cn("hidden")} />
      </TrayContent>
    </Tray>
  );
}
