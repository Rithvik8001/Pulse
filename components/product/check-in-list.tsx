"use client";

import { useCallback, useState, useTransition } from "react";

import { type CheckInFormState, upsertCheckInAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { RowList } from "@/components/ui/row";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import type { DashboardQuest } from "@/lib/pulse/dashboard";

type Outcome = "win" | "pass";

function getBrowserLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CheckInList({ quests }: { quests: DashboardQuest[] }) {
  const [localDate] = useState(() => getBrowserLocalDate());
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>(() =>
    Object.fromEntries(
      quests
        .filter((quest) => quest.todayCheckIn)
        .map((quest) => [quest.id, quest.todayCheckIn?.outcome ?? "win"]),
    ),
  );
  const setQuestOutcome = useCallback((questId: string, outcome: Outcome | null) => {
    setOutcomes((current) => {
      if (outcome) return { ...current, [questId]: outcome };
      const next = { ...current };
      delete next[questId];
      return next;
    });
  }, []);

  return (
    <RowList>
      {quests.map((quest) => (
        <CheckInRow
          key={quest.id}
          activeOutcome={outcomes[quest.id] ?? null}
          localDate={localDate}
          quest={quest}
          setQuestOutcome={setQuestOutcome}
        />
      ))}
    </RowList>
  );
}

function CheckInRow({
  activeOutcome,
  localDate,
  quest,
  setQuestOutcome,
}: {
  activeOutcome: Outcome | null;
  localDate: string;
  quest: DashboardQuest;
  setQuestOutcome: (questId: string, outcome: Outcome | null) => void;
}) {
  const initialState: CheckInFormState = { status: "idle" };
  const [state, setState] = useState<CheckInFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const savedOutcome = quest.todayCheckIn?.outcome ?? null;
  const currentOutcome = activeOutcome ?? savedOutcome;
  const [savedNote, setSavedNote] = useState(quest.todayCheckIn?.note ?? "");
  const [note, setNote] = useState(savedNote);
  const [editingNote, setEditingNote] = useState(false);
  const isDirty = note !== savedNote;

  function submit(outcome: Outcome, nextNote: string, optimistic: boolean) {
    const previous = currentOutcome;
    if (optimistic) setQuestOutcome(quest.id, outcome);

    const formData = new FormData();
    formData.set("questId", quest.id);
    formData.set("localDate", localDate);
    formData.set("outcome", outcome);
    formData.set("note", nextNote);

    startTransition(async () => {
      const result = await upsertCheckInAction(initialState, formData);
      if (result.status === "success") {
        setState(initialState);
        setQuestOutcome(quest.id, outcome);
        const noteChanged = nextNote !== savedNote;
        setSavedNote(nextNote);
        setEditingNote(false);
        toast.show(
          noteChanged && !optimistic
            ? "Note saved"
            : outcome === "win"
              ? "Saved as done"
              : "Saved as skipped",
        );
      } else {
        setState(result);
        if (optimistic) setQuestOutcome(quest.id, previous);
      }
    });
  }

  const status = !currentOutcome
    ? "Not done yet today"
    : currentOutcome === "win"
      ? "Done"
      : "Skipped";

  return (
    <li className="grid gap-3 py-3.5">
      <div className="flex flex-wrap items-center gap-4">
        <FeatureChip feature="habits" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="truncate type-body font-medium">{quest.title}</div>
          {editingNote ? null : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 type-caption text-fg-2">
              <span className="truncate">
                {status}
                {currentOutcome && savedNote ? `: ${savedNote}` : ""}
              </span>
              {currentOutcome ? (
                <Button variant="text" size="xs" className="-my-1 h-6 px-1.5" onClick={() => setEditingNote(true)}>
                  {savedNote ? "Edit note" : "Add a note"}
                </Button>
              ) : null}
            </div>
          )}
        </div>
        <div className="w-full sm:w-44">
          <Segmented
            label={`Did you do ${quest.title} today?`}
            size="sm"
            value={currentOutcome ?? ""}
            disabled={pending}
            onValueChange={(value) => submit(value as Outcome, note, true)}
            options={[
              { value: "win", label: "Done" },
              { value: "pass", label: "Skipped" },
            ]}
          />
        </div>
      </div>

      {editingNote && currentOutcome ? (
        <form
          className="flex flex-wrap items-end gap-2 sm:pl-14"
          onSubmit={(event) => {
            event.preventDefault();
            if (isDirty) submit(currentOutcome, note, false);
            else setEditingNote(false);
          }}
        >
          <Field label="Note" labelHidden className="min-w-0 flex-1">
            <Input
              autoFocus
              placeholder="Walked to the station instead of driving"
              value={note}
              maxLength={240}
              className="h-control-sm"
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setNote(savedNote);
                  setEditingNote(false);
                }
              }}
            />
          </Field>
          <Button type="submit" variant="secondary" size="sm" disabled={!isDirty} pending={pending && isDirty} pendingLabel="Saving">
            Save note
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => {
              setNote(savedNote);
              setEditingNote(false);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : null}

      {state.status === "error" ? (
        <Notice tone="bad" className="sm:ml-14">
          {state.message ?? "This did not save. Check your connection and try again."}
        </Notice>
      ) : null}
    </li>
  );
}
