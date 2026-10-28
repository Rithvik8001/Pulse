"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { DotsThree, MagnifyingGlass, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { deleteProofAction, updateProofAction, type ProofFormState } from "@/app/dashboard/history/actions";
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
import { SummaryBar } from "@/components/ui/summary-bar";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import type { ProofEntry, ProofQuestOption } from "@/lib/pulse/proof";

const initialFormState: ProofFormState = { status: "idle" };
const pageSize = 30;

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
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const [editing, setEditing] = useState<ProofEntry | null>(null);
  const [deleting, setDeleting] = useState<ProofEntry | null>(null);

  async function deleteCheckIn(formData: FormData) {
    try {
      await deleteProofAction(formData);
      toast.success("Check-in deleted");
    } catch {
      toast.error("The check-in was not deleted. Try again.");
    }
  }

  const hasFilters = questFilter !== "all" || search.trim() !== "";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (questFilter !== "all" && entry.questId !== questFilter) return false;
      if (!query) return true;
      return (
        entry.questTitle.toLowerCase().includes(query) ||
        (entry.note?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [entries, questFilter, search]);

  const groups = useMemo(() => {
    const byDate = new Map<string, ProofEntry[]>();
    for (const entry of filtered.slice(0, limit)) {
      const list = byDate.get(entry.localDate) ?? [];
      list.push(entry);
      byDate.set(entry.localDate, list);
    }
    return [...byDate.entries()];
  }, [filtered, limit]);

  function resetFilters() {
    setQuestFilter("all");
    setSearch("");
    setLimit(pageSize);
  }

  const formatDay = (date: string) =>
    formatLocalDateForLocale(date, locale, { weekday: "long", month: "short", day: "numeric" });

  if (entries.length === 0) {
    return (
      <Section title="All check-ins">
        <Notice action={{ label: "Go to today", href: "/dashboard" }}>
          No check-ins yet. Check in on Today to start your history.
        </Notice>
      </Section>
    );
  }

  const shown = Math.min(limit, filtered.length);

  return (
    <Section
      title="All check-ins"
      action={
        hasFilters ? (
          <Button variant="text" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr] sm:items-end">
        <Field label="Search notes and habits">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-3"
            />
            <Input
              type="search"
              placeholder="morning"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setLimit(pageSize);
              }}
              className="pl-12"
            />
          </div>
        </Field>
        <Select
          label="Habit"
          value={questFilter}
          onValueChange={(value) => {
            setQuestFilter(value);
            setLimit(pageSize);
          }}
          options={[
            { value: "all", label: "All habits" },
            ...questOptions.map((quest) => ({
              value: quest.id,
              label: quest.status === "archived" ? `${quest.title} (archived)` : quest.title,
            })),
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <Notice action={{ label: "Clear filters", onClick: resetFilters }}>No check-ins match.</Notice>
      ) : (
        <div className="grid gap-6">
          {groups.map(([date, list]) => (
            <section key={date} aria-label={formatDay(date)} className="grid gap-2">
              <h3 className="type-section">{formatDay(date)}</h3>
              <RowList>
                {list.map((entry) => (
                  <ActionRow
                    key={entry.id}
                    leading={<FeatureChip feature="history" />}
                    title={entry.questTitle}
                    caption={
                      [entry.questStatus === "archived" ? "Archived habit" : null, entry.note]
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

      {filtered.length > shown ? (
        <SummaryBar caption={`Showing ${shown} of ${filtered.length}`}>
          <Button variant="secondary" onClick={() => setLimit((l) => l + pageSize)}>
            Show {pageSize} more
          </Button>
        </SummaryBar>
      ) : filtered.length > pageSize ? (
        <p className="type-small text-fg-2">Showing all {filtered.length}.</p>
      ) : null}

      <EditProofTray entry={editing} onClose={() => setEditing(null)} />
      <ConfirmTray
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this check-in?"
        body={
          deleting
            ? `The check-in for ${deleting.questTitle} on ${formatDay(deleting.localDate)} is deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete check-in"
        pendingLabel="Deleting"
        formAction={deleteCheckIn}
        hidden={{ checkInId: deleting?.id ?? "" }}
      />
    </Section>
  );
}

function EditProofTray({ entry, onClose }: { entry: ProofEntry | null; onClose: () => void }) {
  const [state, action] = useActionState(updateProofAction, initialFormState);
  useEffect(() => {
    if (state.status === "success") toast.success("Check-in updated");
  }, [state]);
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);
    if (state.status === "success") onClose();
  }

  return (
    <Tray open={entry !== null} onOpenChange={(o) => !o && onClose()}>
      <TrayContent>
        <TrayHeader title="Edit check-in" description="Change the outcome or the note. The date stays the same." />
        {entry ? (
          <form key={entry.id} action={action} className="grid gap-4">
            <input type="hidden" name="checkInId" value={entry.id} />
            <TrayBody>
              <p className="type-body text-fg-2">{entry.questTitle}. The date stays the same.</p>
              <Select
                label="Outcome"
                name="outcome"
                defaultValue={entry.outcome}
                options={[
                  { value: "win", label: "Done" },
                  { value: "pass", label: "Skipped" },
                ]}
              />
              <Field label="Note" hint="Up to 240 characters.">
                <Textarea
                  name="note"
                  autoGrow
                  rows={3}
                  defaultValue={entry.note ?? ""}
                  maxLength={240}
                  placeholder="Finished the first chapter"
                />
              </Field>
              {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
            </TrayBody>
            <div className="grid gap-3 pt-1">
              <SubmitButton variant="primary" fullWidth pendingLabel="Saving">
                Save check-in
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
