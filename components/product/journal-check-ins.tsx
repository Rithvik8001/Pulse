"use client";

import { useState, useTransition } from "react";

import {
  findJournalCheckInsAction,
  saveJournalCheckInsAction,
} from "@/app/dashboard/journal/actions";
import { useAiQuota } from "@/components/product/ai-quota";
import { Pip, pipName } from "@/components/product/pip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { SummaryBar } from "@/components/ui/summary-bar";
import {
  journalCheckInNoteMaxLength,
  type JournalCheckInDraft,
  type JournalCheckInOutcome,
} from "@/lib/pulse/journal-check-ins-core";
import { toast } from "sonner";

type View =
  | { kind: "idle" }
  | { kind: "result"; drafts: JournalCheckInDraft[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const outcomeLabel: Record<JournalCheckInOutcome, string> = {
  win: "Done",
  pass: "Skipped",
};

function statusCaption(draft: JournalCheckInDraft) {
  if (draft.existingOutcome === null) return "Not checked in yet";
  if (draft.status === "same") return `Already ${outcomeLabel[draft.existingOutcome]}`;
  return `Already ${outcomeLabel[draft.existingOutcome]}, your entry says ${outcomeLabel[draft.outcome]}`;
}

export function JournalCheckIns({
  localDate,
  dayLabel,
  hasSavedEntry,
  isDirty,
}: {
  localDate: string;
  dayLabel: string;
  hasSavedEntry: boolean;
  isDirty: boolean;
}) {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [finding, startFinding] = useTransition();
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { exhausted, exhaustedMessage, refresh: refreshAiQuota } = useAiQuota();

  const canFind = hasSavedEntry && !isDirty && !finding && !exhausted;
  const drafts = view.kind === "result" ? view.drafts : [];
  const selected = drafts.filter((draft) => draft.selected && draft.status !== "same");
  const allCheckedIn = drafts.length > 0 && drafts.every((draft) => draft.status === "same");

  function find() {
    setSaveError(null);
    startFinding(async () => {
      const result = await findJournalCheckInsAction(localDate);
      refreshAiQuota();
      if (result.status === "error") {
        setView({ kind: "error", message: result.message });
      } else if (result.drafts.length === 0) {
        setView({ kind: "empty" });
      } else {
        setView({ kind: "result", drafts: result.drafts });
      }
    });
  }

  function update(questId: string, patch: Partial<JournalCheckInDraft>) {
    setView((current) =>
      current.kind === "result"
        ? {
            kind: "result",
            drafts: current.drafts.map((draft) =>
              draft.questId === questId ? { ...draft, ...patch } : draft,
            ),
          }
        : current,
    );
  }

  function save() {
    setSaveError(null);
    startSaving(async () => {
      const result = await saveJournalCheckInsAction({
        localDate,
        items: selected.map((draft) => ({
          questId: draft.questId,
          outcome: draft.outcome,
          note: draft.note.trim() || undefined,
        })),
      });
      if (result.status === "success") {
        toast.success(result.message.replace(/\.$/, ""));
        setView({ kind: "idle" });
      } else {
        setSaveError(result.message);
      }
    });
  }

  if (finding) {
    return (
      <p className="flex items-center gap-2 type-caption text-fg-2" aria-live="polite">
        <Pip size={24} className="motion-safe:animate-pip-bob" />
        {pipName} is reading your entry
      </p>
    );
  }

  if (view.kind === "result") {
    return (
      <div className="grid w-full gap-4 rounded-notice bg-fill p-4">
        <div className="flex items-start gap-3">
          <Pip size={32} />
          <div className="grid min-w-0 gap-0.5">
            <span className="type-body font-medium">Check-ins for {dayLabel}</span>
            <span className="type-caption text-fg-2">
              {allCheckedIn
                ? "Everything this entry mentions is already checked in."
                : "Tick the ones to save. Nothing changes until you save."}
            </span>
          </div>
        </div>

        <ul className="grid list-none p-0 [&>*+*]:hairline">
          {drafts.map((draft) => {
            const locked = draft.status === "same";
            return (
              <li key={draft.questId} className="grid gap-3 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox
                    aria-label={`Save ${draft.questTitle}`}
                    checked={draft.selected && !locked}
                    disabled={locked || saving}
                    onCheckedChange={(checked) => update(draft.questId, { selected: checked === true })}
                  />
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate type-body font-medium">{draft.questTitle}</span>
                    <span className={draft.status === "conflict" ? "type-caption text-warn" : "type-caption text-fg-2"}>
                      {statusCaption(draft)}
                    </span>
                  </div>
                  {locked ? null : (
                    <div className="w-full sm:w-44">
                      <Segmented
                        label={`Did you do ${draft.questTitle}?`}
                        size="sm"
                        value={draft.outcome}
                        disabled={saving}
                        onValueChange={(value) =>
                          update(draft.questId, { outcome: value as JournalCheckInOutcome })
                        }
                        options={[
                          { value: "win", label: "Done" },
                          { value: "pass", label: "Skipped" },
                        ]}
                      />
                    </div>
                  )}
                </div>
                {locked ? null : (
                  <Field label={`Note for ${draft.questTitle}`} labelHidden className="sm:pl-9">
                    <Input
                      value={draft.note}
                      maxLength={journalCheckInNoteMaxLength}
                      placeholder="Add a note"
                      disabled={saving}
                      className="h-control-sm"
                      onChange={(event) => update(draft.questId, { note: event.target.value })}
                    />
                  </Field>
                )}
              </li>
            );
          })}
        </ul>

        {saveError ? <Notice tone="bad">{saveError}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="text" size="sm" disabled={saving} onClick={() => setView({ kind: "idle" })}>
            {allCheckedIn ? "Close" : "Cancel"}
          </Button>
          {allCheckedIn ? null : (
            <Button
              variant="secondary"
              size="sm"
              disabled={selected.length === 0}
              pending={saving}
              pendingLabel="Saving"
              onClick={save}
            >
              {selected.length === 1 ? "Save 1 check-in" : `Save ${selected.length} check-ins`}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const caption = exhausted
    ? exhaustedMessage
    : !hasSavedEntry
      ? "Save an entry first. Pip reads it and suggests check-ins."
      : isDirty
        ? "Save the entry first so Pip reads the latest version."
        : "Pip reads this entry and suggests Done or Skipped for the habits it mentions.";

  return (
    <div className="grid gap-3">
      {view.kind === "empty" ? (
        <Notice>
          {pipName} didn&apos;t find any of your habits in this entry. Mention a habit by name and try again.
        </Notice>
      ) : null}
      {view.kind === "error" ? <Notice tone="bad">{view.message}</Notice> : null}
      <SummaryBar caption={caption}>
        <Button variant="secondary" size="sm" disabled={!canFind} onClick={find}>
          Find check-ins
        </Button>
      </SummaryBar>
    </div>
  );
}
