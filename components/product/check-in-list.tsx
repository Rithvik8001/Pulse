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
  const [note, setNote] = useState(quest.todayCheckIn?.note ?? "");
  const [savedNote, setSavedNote] = useState(quest.todayCheckIn?.note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(quest.todayCheckIn?.note));
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
        setSavedNote(nextNote);
        toast.success("Proof saved");
      } else {
        setState(result);
        if (optimistic) setQuestOutcome(quest.id, previous);
      }
    });
  }

  const caption = quest.todayCheckIn
    ? `Saved as a ${quest.todayCheckIn.outcome}${quest.todayCheckIn.note ? `: ${quest.todayCheckIn.note}` : ""}`
    : "Not checked in yet";

  return (
    <li className="grid gap-3 py-3.5">
      <div className="flex flex-wrap items-center gap-4">
        <FeatureChip feature="quests" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="truncate type-body font-medium">{quest.title}</div>
          <div className="truncate type-caption text-fg-2">{caption}</div>
        </div>
        <div className="w-full sm:w-44">
          <Segmented
            label={`Outcome for ${quest.title}`}
            size="sm"
            value={currentOutcome ?? ""}
            disabled={pending}
            onValueChange={(value) => submit(value as Outcome, note, true)}
            options={[
              { value: "win", label: "Win" },
              { value: "pass", label: "Pass" },
            ]}
          />
        </div>
      </div>

      {currentOutcome ? (
        noteOpen ? (
          <form
            className="flex flex-wrap items-end gap-2 sm:pl-14"
            onSubmit={(event) => {
              event.preventDefault();
              if (isDirty) submit(currentOutcome, note, false);
            }}
          >
            <Field label="Note" labelHidden className="min-w-0 flex-1">
              <Input
                placeholder="What happened?"
                value={note}
                maxLength={240}
                className="h-control-sm"
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!isDirty}
              pending={pending && isDirty}
              pendingLabel="Saving"
            >
              Save note
            </Button>
          </form>
        ) : (
          <div className="sm:pl-14">
            <Button variant="text" size="xs" onClick={() => setNoteOpen(true)}>
              Add a note
            </Button>
          </div>
        )
      ) : null}

      {state.status === "error" ? (
        <Notice tone="bad" className="sm:ml-14">
          {state.message ?? "Proof could not be saved. Check your connection and try again."}
        </Notice>
      ) : null}
    </li>
  );
}
