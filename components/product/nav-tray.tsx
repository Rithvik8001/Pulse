"use client";

import { usePathname } from "next/navigation";

import { isCurrent } from "@/components/product/app-header";
import { useShell } from "@/components/product/shell";
import { features, type Feature } from "@/components/ui/features";
import { NavRow } from "@/components/ui/row";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";

const destinations: Feature[] = ["today", "habits", "history", "review", "journal", "settings"];

export function NavTray() {
  const pathname = usePathname();
  const { panel, close } = useShell();
  return (
    <Tray open={panel === "nav"} onOpenChange={(o) => !o && close()}>
      <TrayContent>
        <TrayHeader title="Go to" description="Go to a page." />
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
        </TrayBody>
      </TrayContent>
    </Tray>
  );
}
