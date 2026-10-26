"use client";

import * as React from "react";
import { useActionState, useMemo, useState } from "react";
import { DotsThree, MagnifyingGlass, PencilSimple, Trash } from "@phosphor-icons/react";

import { deleteProofAction, updateProofAction, type ProofFormState } from "@/app/dashboard/proof/actions";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Notice } from "@/components/ui/notice";
import { ActionRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import type { ProofEntry, ProofOutcome as Outcome, ProofQuestOption } from "@/lib/pulse/proof";

const initialFormState: ProofFormState = { status: "idle" };

export function ProofArchive({
  entries,
  questOptions,
  locale,
}: {
  entries: ProofEntry[];
  questOptions: ProofQuestOption[];
  locale: string;
}) {
  const [questFilter, setQuestFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | Outcome>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProofEntry | null>(null);
  const [deleting, setDeleting] = useState<ProofEntry | null>(null);

  const hasProof = entries.length > 0;
  const hasFilters = questFilter !== "all" || outcomeFilter !== "all" || search.trim() !== "";

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (questFilter !== "all" && entry.questId !== questFilter) return false;
      if (outcomeFilter !== "all" && entry.outcome !== outcomeFilter) return false;
      if (!query) return true;
      return (
        entry.questTitle.toLowerCase().includes(query) ||
        (entry.note?.toLowerCase().includes(query) ?? false)
      );
    });
    const byDate = new Map<string, ProofEntry[]>();
    for (const entry of filtered) {
      const list = byDate.get(entry.localDate) ?? [];
      list.push(entry);
      byDate.set(entry.localDate, list);
    }
    return [...byDate.entries()];
  }, [entries, outcomeFilter, questFilter, search]);

  function resetFilters() {
    setQuestFilter("all");
    setOutcomeFilter("all");
    setSearch("");
  }

  const formatDay = (date: string) =>
    formatLocalDateForLocale(date, locale, { weekday: "long", month: "short", day: "numeric" });

  if (!hasProof) {
    return (
      <Section title="Saved proof">
        <Notice action={{ label: "Go to today", href: "/dashboard" }}>
          Check in on a quest to start your proof.
        </Notice>
      </Section>
    );
  }

  return (
    <Section
      title="Saved proof"
      action={
        hasFilters ? (
          <Button variant="text" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr] sm:items-end">
        <Field label="Search proof">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-3"
            />
            <Input
              type="search"
              placeholder="Notes or quest names"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-12"
            />
          </div>
        </Field>
        <Select
          label="Quest"
          value={questFilter}
          onValueChange={setQuestFilter}
          options={[
            { value: "all", label: "All quests" },
            ...questOptions.map((quest) => ({
              value: quest.id,
              label: quest.status === "archived" ? `${quest.title} (archived)` : quest.title,
            })),
          ]}
        />
        <Select
          label="Outcome"
          value={outcomeFilter}
          onValueChange={(value) => setOutcomeFilter(value as "all" | Outcome)}
          options={[
            { value: "all", label: "All outcomes" },
            { value: "win", label: "Wins" },
            { value: "pass", label: "Passes" },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <Notice action={{ label: "Reset filters", onClick: resetFilters }}>
          No proof matches these filters.
        </Notice>
      ) : (
        <div className="grid gap-6">
          {groups.map(([date, list]) => (
            <section key={date} aria-label={formatDay(date)} className="grid gap-2">
              <h3 className="type-section">{formatDay(date)}</h3>
              <RowList>
                {list.map((entry) => (
                  <ActionRow
                    key={entry.id}
                    leading={<FeatureChip feature="proof" />}
                    title={entry.questTitle}
                    caption={
                      [entry.questStatus === "archived" ? "Archived quest" : null, entry.note]
                        .filter(Boolean)
                        .join(" · ") || "No note"
                    }
                    actions={
                      <>
                        <ProofOutcome outcome={entry.outcome} className="mr-2" />
                        <Menu trigger={<IconButton label={`More actions for ${entry.questTitle}`} icon={DotsThree} size="sm" />}>
                          <MenuItem icon={PencilSimple} onSelect={() => setEditing(entry)}>
                            Edit
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon={Trash} destructive onSelect={() => setDeleting(entry)}>
                            Delete
                          </MenuItem>
                        </Menu>
                      </>
                    }
                  />
                ))}
              </RowList>
            </section>
          ))}
        </div>
      )}

      <EditProofTray entry={editing} onClose={() => setEditing(null)} />
      <ConfirmTray
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this proof?"
        body={
          deleting
            ? `The check-in for ${deleting.questTitle} on ${formatDay(deleting.localDate)} is removed for good.`
            : ""
        }
        confirmLabel="Delete proof"
        pendingLabel="Deleting"
        formAction={deleteProofAction}
        hidden={{ checkInId: deleting?.id ?? "" }}
      />
    </Section>
  );
}

function EditProofTray({ entry, onClose }: { entry: ProofEntry | null; onClose: () => void }) {
  const [state, action] = useActionState(updateProofAction, initialFormState);
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);
    if (state.status === "success") onClose();
  }

  return (
    <Tray open={entry !== null} onOpenChange={(o) => !o && onClose()}>
      <TrayContent>
        <TrayHeader title="Edit proof" description="Change the outcome or the note." />
        {entry ? (
          <form key={entry.id} action={action} className="grid gap-4">
            <input type="hidden" name="checkInId" value={entry.id} />
            <TrayBody>
              <p className="type-body text-fg-2">
                {entry.questTitle}. The date stays the same.
              </p>
              <Select
                label="Outcome"
                name="outcome"
                defaultValue={entry.outcome}
                options={[
                  { value: "win", label: "Win" },
                  { value: "pass", label: "Pass" },
                ]}
              />
              <Field label="Note" hint="Up to 240 characters.">
                <Textarea
                  name="note"
                  autoGrow
                  rows={3}
                  defaultValue={entry.note ?? ""}
                  maxLength={240}
                  placeholder="What did this prove?"
                />
              </Field>
              {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
            </TrayBody>
            <div className="grid gap-2 pt-1">
              <SubmitButton variant="primary" fullWidth pendingLabel="Saving">
                Save proof
              </SubmitButton>
              <Button variant="text" fullWidth onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </TrayContent>
    </Tray>
  );
}
