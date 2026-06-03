"use client";

import { useActionState, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  SentIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";

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
            setOutcome={(outcome) =>
              setOutcomes((current) => ({
                ...current,
                [quest.id]: outcome,
              }))
            }
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
  setOutcome,
}: {
  activeOutcome: "win" | "pass" | null;
  localDate: string;
  quest: DashboardQuest;
  setOutcome: (outcome: "win" | "pass") => void;
}) {
  const initialState: CheckInFormState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    upsertCheckInAction,
    initialState,
  );
  const currentOutcome = activeOutcome ?? quest.todayCheckIn?.outcome;

  return (
    <form
      action={action}
      className="grid gap-3 rounded-md border bg-muted/25 p-3 text-sm"
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
            onClick={() => setOutcome("win")}
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
            onClick={() => setOutcome("pass")}
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
          defaultValue={quest.todayCheckIn?.note ?? ""}
          maxLength={240}
          className="h-9 text-sm"
        />
        <Button
          name="outcome"
          value={currentOutcome ?? "win"}
          type="submit"
          size="sm"
          variant="ghost"
          disabled={pending}
          className="h-9 justify-center sm:px-3"
          onClick={() => setOutcome(currentOutcome ?? "win")}
        >
          <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.7} />
          Save note
        </Button>
      </div>
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
