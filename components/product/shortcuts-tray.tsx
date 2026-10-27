"use client";

import { useShell } from "@/components/product/shell";
import { Kbd } from "@/components/ui/kbd";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";

const groups: { title: string; rows: { keys: string[][]; label: string }[] }[] = [
  {
    title: "Anywhere",
    rows: [
      { keys: [["⌘", "K"], ["/"]], label: "Search or go to a page" },
      { keys: [["?"]], label: "Keyboard shortcuts" },
      { keys: [["A"]], label: "Open Pip" },
      { keys: [["Esc"]], label: "Close a tray or menu" },
    ],
  },
  {
    title: "Go to",
    rows: [
      { keys: [["G", "T"]], label: "Today" },
      { keys: [["G", "H"]], label: "Habits" },
      { keys: [["G", "Y"]], label: "History" },
      { keys: [["G", "R"]], label: "Review" },
      { keys: [["G", "J"]], label: "Journal" },
      { keys: [["G", ","]], label: "Settings" },
    ],
  },
  {
    title: "Writing",
    rows: [
      { keys: [["⌘", "Enter"]], label: "Save or send" },
      { keys: [["["], ["]"]], label: "Previous or next day in the journal" },
    ],
  },
];

export function ShortcutsTray() {
  const { panel, close } = useShell();
  return (
    <Tray open={panel === "shortcuts"} onOpenChange={(o) => !o && close()}>
      <TrayContent>
        <TrayHeader title="Keyboard shortcuts" description="Every shortcut in Pulse." />
        <TrayBody>
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title} className="grid gap-1">
              <h3 className="type-section">{group.title}</h3>
              <ul className="grid list-none p-0 [&>*+*]:hairline">
                {group.rows.map((row) => (
                  <li key={row.label} className="flex min-h-10 items-center justify-between gap-4 py-2">
                    <span className="type-body">{row.label}</span>
                    <span className="flex items-center gap-2">
                      {row.keys.map((keys, i) => (
                        <Kbd key={i} keys={keys} className="inline-flex" />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </TrayBody>
      </TrayContent>
    </Tray>
  );
}
