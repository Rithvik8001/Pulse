"use client";

import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { isCurrent } from "@/components/product/app-header";
import { useShell } from "@/components/product/shell";
import { features, type Feature } from "@/components/ui/features";
import { NavRow } from "@/components/ui/row";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";

const destinations: Feature[] = [
  "today",
  "quests",
  "proof",
  "journal",
  "stats",
  "identity",
  "story",
  "settings",
];

/** Every destination, for phones. */
export function NavTray() {
  const pathname = usePathname();
  const { panel, close } = useShell();
  return (
    <Tray open={panel === "nav"} onOpenChange={(o) => !o && close()}>
      <TrayContent>
        <TrayHeader title="Go to" description="Pages in Pulse." />
        <TrayBody>
          <ul className="grid list-none p-0 [&>*+*]:hairline">
            {destinations.map((key) => {
              const f = features[key];
              return (
                <NavRow
                  key={key}
                  href={f.href}
                  feature={key}
                  title={f.label}
                  current={isCurrent(pathname, f.href)}
                  onClick={close}
                />
              );
            })}
          </ul>
          <form action={signOutAction} className="pt-1">
            <SubmitButton variant="text" fullWidth pendingLabel="Signing out">
              Sign out
            </SubmitButton>
          </form>
        </TrayBody>
      </TrayContent>
    </Tray>
  );
}
