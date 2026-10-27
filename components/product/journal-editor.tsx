"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import {
  deleteJournalEntryAction,
  saveJournalEntryAction,
  type JournalFormState,
} from "@/app/dashboard/journal/actions";
import { JournalCheckIns } from "@/components/product/journal-check-ins";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FeatureChip } from "@/components/ui/feature-chip";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Textarea } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { ActionRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";
import { toast } from "@/components/ui/toast";
import { journalBodyMaxLength, normalizeJournalBody } from "@/lib/pulse/journal-core";
import type { JournalEntrySummary, JournalProof } from "@/lib/pulse/journal";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { cn } from "@/lib/utils";

const initialFormState: JournalFormState = { status: "idle" };

const prompts = [
  "What went well?",
  "What got in the way?",
  "What is one small next step?",
];

function offsetLocalDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function JournalEditor({
  history,
  selectedDate,
  today,
  selectedEntry,
  selectedProof,
  locale,
}: {
  history: JournalEntrySummary[];
  selectedDate: string;
  today: string;
  selectedEntry: JournalEntrySummary | null;
  selectedProof: JournalProof[];
  locale: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(selectedEntry?.body ?? "");
  const [state, action] = useActionState(saveJournalEntryAction, initialFormState);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const remaining = journalBodyMaxLength - draft.length;

  const lastState = React.useRef(state);
  React.useEffect(() => {
    if (lastState.current === state) return;
    lastState.current = state;
    if (state.status === "success") toast.show("Entry saved");
  }, [state]);

  const goToDate = React.useCallback(
    (date: string) => router.push(`/dashboard/journal?date=${date}`),
    [router],
  );

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (editable || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "[") goToDate(offsetLocalDate(selectedDate, -1));
      if (event.key === "]") goToDate(offsetLocalDate(selectedDate, 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDate, goToDate]);

  function insertPrompt(prompt: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const needsBreak = before.length > 0 && !before.endsWith("\n");
    const inserted = `${needsBreak ? "\n" : ""}${prompt} `;
    const next = `${before}${inserted}${after}`;
    setDraft(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + inserted.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  const formatDay = (date: string) =>
    formatLocalDateForLocale(date, locale, { weekday: "short", month: "short", day: "numeric" });

  const savedCaption = selectedEntry
    ? `Saved ${new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(selectedEntry.updatedAt)}`
    : "Not saved yet";

  return (
    <div className="grid gap-10">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton
            label="Previous day"
            icon={CaretLeft}
            shortcut={["["]}
            onClick={() => goToDate(offsetLocalDate(selectedDate, -1))}
          />
          <Field label="Date" labelHidden className="w-48">
            <DatePicker
              value={selectedDate}
              today={today}
              max={today}
              locale={locale}
              marked={history.map((entry) => entry.localDate)}
              className="h-control-sm"
              onChange={goToDate}
            />
          </Field>
          <IconButton
            label="Next day"
            icon={CaretRight}
            shortcut={["]"]}
            disabled={selectedDate >= today}
            onClick={() => goToDate(offsetLocalDate(selectedDate, 1))}
          />
          {selectedDate !== today ? (
            <Button variant="text" size="sm" onClick={() => goToDate(today)}>
              Go to today
            </Button>
          ) : null}
        </div>

        <form ref={formRef} action={action} className="grid gap-4">
          <input name="localDate" type="hidden" value={selectedDate} />
          <div className="flex flex-wrap gap-3">
            {prompts.map((prompt) => (
              <Button key={prompt} variant="secondary" size="xs" onClick={() => insertPrompt(prompt)}>
                {prompt}
              </Button>
            ))}
          </div>
          <Field
            label="Entry"
            hint={
              <span className={cn("tabular-nums", remaining < 0 && "text-bad")}>
                {draft.length} of {journalBodyMaxLength}
              </span>
            }
          >
            <Textarea
              ref={textareaRef}
              name="body"
              autoGrow
              rows={6}
              value={draft}
              maxLength={journalBodyMaxLength}
              placeholder="Walked before work and it set up the morning."
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
          </Field>
          {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
          <SummaryBar caption={savedCaption}>
            {selectedEntry ? (
              <ConfirmTray
                trigger={
                  <Button variant="plain-destructive" size="sm">
                    Delete entry
                  </Button>
                }
                title="Delete this entry?"
                body={`The entry for ${formatDay(selectedEntry.localDate)} is deleted. This cannot be undone.`}
                confirmLabel="Delete entry"
                pendingLabel="Deleting"
                formAction={deleteJournalEntryAction}
                hidden={{ entryId: selectedEntry.id }}
              />
            ) : null}
            <SubmitButton variant="primary" disabled={draft.trim() === ""} pendingLabel="Saving">
              Save entry
            </SubmitButton>
          </SummaryBar>
        </form>
      </div>

      <Section title="Check in from this entry">
        <JournalCheckIns
          key={selectedDate}
          localDate={selectedDate}
          dayLabel={formatDay(selectedDate)}
          hasSavedEntry={Boolean(selectedEntry)}
          isDirty={normalizeJournalBody(draft) !== (selectedEntry?.body ?? "")}
        />
      </Section>

      <Section title="Check-ins on this day">
        {selectedProof.length > 0 ? (
          <RowList>
            {selectedProof.map((proof) => (
              <ActionRow
                key={proof.id}
                leading={<FeatureChip feature="history" />}
                title={proof.questTitle}
                caption={proof.note ?? "No note"}
                actions={<ProofOutcome outcome={proof.outcome} />}
              />
            ))}
          </RowList>
        ) : (
          <Notice action={selectedDate === today ? { label: "Go to today", href: "/dashboard" } : undefined}>
            No check-ins on this day.
          </Notice>
        )}
      </Section>

      <Section title="Past entries">
        {history.length > 0 ? (
          <RowList>
            {history.map((entry) => (
              <NavRow
                key={entry.id}
                href={`/dashboard/journal?date=${entry.localDate}`}
                feature="journal"
                title={formatDay(entry.localDate)}
                caption={entry.body.split("\n")[0]}
                current={entry.localDate === selectedDate}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Entries you save show here.</Notice>
        )}
      </Section>
    </div>
  );
}
