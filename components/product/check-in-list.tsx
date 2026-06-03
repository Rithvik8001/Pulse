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

  return (
    <div className="grid gap-3">
      {quests.map((quest) => (
        <CheckInRow key={quest.id} localDate={localDate} quest={quest} />
      ))}
    </div>
  );
}

function CheckInRow({
  localDate,
  quest,
}: {
  localDate: string;
  quest: DashboardQuest;
}) {
  const initialState: CheckInFormState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    upsertCheckInAction,
    initialState,
  );
  const activeOutcome = state.status === "success"
    ? null
    : quest.todayCheckIn?.outcome;

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
            variant={activeOutcome === "win" ? "default" : "outline"}
            disabled={pending}
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
            variant={activeOutcome === "pass" ? "default" : "outline"}
            disabled={pending}
          >
            <HugeiconsIcon icon={UnavailableIcon} size={14} strokeWidth={1.7} />
            Pass
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          name="note"
          placeholder="Proof note, optional"
          defaultValue={quest.todayCheckIn?.note ?? ""}
          maxLength={240}
          className="h-9 text-sm"
        />
        <Button
          name="outcome"
          value={quest.todayCheckIn?.outcome ?? "win"}
          type="submit"
          size="sm"
          variant="ghost"
          disabled={pending}
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
