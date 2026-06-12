"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  SentIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
  type CheckInFormState,
  upsertCheckInAction,
} from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DashboardQuest } from "@/lib/pulse/dashboard";

type CheckInListProps = {
  quests: DashboardQuest[];
};

function getBrowserLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function CheckInList({ quests }: CheckInListProps) {
  const [localDate] = useState(() => getBrowserLocalDate());
  const [outcomes, setOutcomes] = useState<Record<string, "win" | "pass">>(
    () =>
      Object.fromEntries(
        quests
          .filter((quest) => quest.todayCheckIn)
          .map((quest) => [quest.id, quest.todayCheckIn?.outcome ?? "win"]),
      ),
  );
  const setQuestOutcome = useCallback(
    (questId: string, outcome: "win" | "pass" | null) => {
      setOutcomes((current) => {
        if (outcome) {
          return {
            ...current,
            [questId]: outcome,
          };
        }

        const next = { ...current };
        delete next[questId];
        return next;
      });
    },
    [],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/25 p-3">
        <div className="mr-1 text-xs font-medium text-muted-foreground">
          Today&apos;s proof
        </div>
        {quests.map((quest) => {
          const outcome = outcomes[quest.id];

          return (
            <div
              key={quest.id}
              title={`${quest.title}: ${
                outcome ? (outcome === "win" ? "Win" : "Pass") : "Not checked in"
              }`}
              aria-label={`${quest.title}: ${
                outcome ? (outcome === "win" ? "Win" : "Pass") : "Not checked in"
              }`}
              className={cn(
                "size-4 rounded-[3px] border transition-colors",
                outcome === "win" &&
                  "border-primary bg-primary shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]",
                outcome === "pass" &&
                  "border-muted-foreground/30 bg-muted-foreground/25",
                !outcome && "border-border bg-background",
              )}
            />
          );
        })}
      </div>
      <div className="grid gap-3">
        {quests.map((quest) => (
          <CheckInRow
            key={quest.id}
            activeOutcome={outcomes[quest.id] ?? null}
            localDate={localDate}
            quest={quest}
            setQuestOutcome={setQuestOutcome}
          />
        ))}
      </div>
    </div>
  );
}

function CheckInRow({
  activeOutcome,
  localDate,
  quest,
  setQuestOutcome,
}: {
  activeOutcome: "win" | "pass" | null;
  localDate: string;
  quest: DashboardQuest;
  setQuestOutcome: (questId: string, outcome: "win" | "pass" | null) => void;
}) {
  const initialState: CheckInFormState = {
    status: "idle",
  };
  const [state, setState] = useState<CheckInFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const savedOutcome = quest.todayCheckIn?.outcome ?? null;
  const currentOutcome = activeOutcome ?? savedOutcome;
  const [note, setNote] = useState(quest.todayCheckIn?.note ?? "");
  const [savedNote, setSavedNote] = useState(quest.todayCheckIn?.note ?? "");
  const rollbackOutcomeRef = useRef<"win" | "pass" | null | undefined>(
    undefined,
  );
  const submittedOutcomeRef = useRef<"win" | "pass" | null>(null);
  const isDirty = note !== savedNote;
  const canSaveNote = Boolean(currentOutcome);

  function rememberOutcomeSubmit(outcome: "win" | "pass") {
    rollbackOutcomeRef.current = currentOutcome;
    submittedOutcomeRef.current = outcome;
    setQuestOutcome(quest.id, outcome);
  }

  function rememberNoteSubmit() {
    rollbackOutcomeRef.current = undefined;
    submittedOutcomeRef.current = currentOutcome;
  }

  function submitCheckIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (
      event.nativeEvent as SubmitEvent
    ).submitter as HTMLButtonElement | null;

    if (submitter?.name) {
      formData.set(submitter.name, submitter.value);
    }

    startTransition(async () => {
      const result = await upsertCheckInAction(initialState, formData);
      setState(result);

      if (result.status === "success") {
        if (submittedOutcomeRef.current) {
          setQuestOutcome(quest.id, submittedOutcomeRef.current);
        }
        setSavedNote(note);
        toast.success(result.message ?? "Proof saved.");
      } else {
        if (rollbackOutcomeRef.current !== undefined) {
          setQuestOutcome(quest.id, rollbackOutcomeRef.current);
        }
        toast.error(result.message ?? "Proof could not be saved.");
      }

      rollbackOutcomeRef.current = undefined;
      submittedOutcomeRef.current = null;
    });
  }

  return (
    <form
      className="grid gap-3 rounded-md border bg-muted/25 p-3 text-sm"
      onSubmit={submitCheckIn}
    >
      <input name="questId" type="hidden" value={quest.id} />
      <input name="localDate" type="hidden" value={localDate} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate font-medium">{quest.title}</span>
            {quest.todayCheckIn ? (
              <Badge variant="outline" className="shrink-0">
                {quest.todayCheckIn.outcome === "win" ? "Win" : "Pass"} saved
              </Badge>
            ) : null}
          </div>
          {quest.todayCheckIn?.note ? (
            <p className="mt-1 line-clamp-2 text-xs/relaxed text-muted-foreground">
              {quest.todayCheckIn.note}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            name="outcome"
            value="win"
            type="submit"
            size="sm"
            variant={currentOutcome === "win" ? "default" : "outline"}
            disabled={pending}
            onClick={() => rememberOutcomeSubmit("win")}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={14}
              strokeWidth={1.7}
            />
            Win
          </Button>
          <Button
            name="outcome"
            value="pass"
            type="submit"
            size="sm"
            variant={currentOutcome === "pass" ? "default" : "outline"}
            disabled={pending}
            onClick={() => rememberOutcomeSubmit("pass")}
          >
            <HugeiconsIcon icon={UnavailableIcon} size={14} strokeWidth={1.7} />
            Pass
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <Input
          name="note"
          placeholder="Proof note, optional"
          value={note}
          maxLength={240}
          className="h-9 text-sm"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          name="outcome"
          value={currentOutcome ?? ""}
          type="submit"
          size="sm"
          variant="ghost"
          disabled={pending || !canSaveNote || !isDirty}
          className="h-9 justify-center sm:px-3"
          onClick={rememberNoteSubmit}
        >
          <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.7} />
          {!canSaveNote || isDirty ? "Save note" : "Saved"}
        </Button>
      </div>
      {!canSaveNote ? (
        <p className="text-xs text-muted-foreground">
          Choose Win or Pass before saving a proof note.
        </p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-xs text-destructive"
              : "text-xs text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
