"use client";

import { useActionState, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  PlusSignIcon,
  RefreshIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import {
  createQuestAction,
  moveQuestAction,
  removeQuestAction,
  restoreQuestAction,
  updateQuestTitleAction,
  type QuestFormState,
} from "@/app/dashboard/quests/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManagedQuest } from "@/lib/pulse/quests";

type QuestManagerProps = {
  activeQuestLimit: number;
  activeQuests: ManagedQuest[];
  archivedQuests: ManagedQuest[];
};

const initialFormState: QuestFormState = {
  status: "idle",
};

export function QuestManager({
  activeQuestLimit,
  activeQuests,
  archivedQuests,
}: QuestManagerProps) {
  const activeCount = activeQuests.length;
  const isAtLimit = activeCount >= activeQuestLimit;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">
                Active Quests
              </h2>
              <Badge variant={isAtLimit ? "secondary" : "outline"}>
                {activeCount}/{activeQuestLimit} active
              </Badge>
            </div>
            <p className="mt-1 text-sm/relaxed text-muted-foreground">
              These are the Quests that appear in today&apos;s Check-ins.
            </p>
          </div>
          <CreateQuestForm disabled={isAtLimit} />
        </div>

        <div className="grid gap-2 p-4">
          {activeQuests.length > 0 ? (
            activeQuests.map((quest, index) => (
              <QuestRow
                key={quest.id}
                canMoveDown={index < activeQuests.length - 1}
                canMoveUp={index > 0}
                quest={quest}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Add a Quest to start building proof again.
            </div>
          )}
          {isAtLimit ? (
            <div className="rounded-xl border bg-muted/25 px-3 py-2 text-xs/relaxed text-muted-foreground">
              You have reached the calm limit of {activeQuestLimit} active
              Quests. Archive one before adding or restoring another.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">Archived</h2>
            <Badge variant="outline">{archivedQuests.length}</Badge>
          </div>
          <p className="mt-1 text-sm/relaxed text-muted-foreground">
            Archived Quests stay in your Proof history, but leave daily
            Check-ins.
          </p>
        </div>

        <div className="grid gap-2 p-4">
          {archivedQuests.length > 0 ? (
            archivedQuests.map((quest) => (
              <ArchivedQuestRow
                key={quest.id}
                canRestore={!isAtLimit}
                quest={quest}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Archived Quests will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CreateQuestForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(
    createQuestAction,
    initialFormState,
  );

  return (
    <form action={action} className="grid w-full gap-2 sm:w-[min(100%,320px)]">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          name="title"
          placeholder="Add a Quest"
          maxLength={96}
          disabled={disabled || pending}
          className="h-9 text-sm"
        />
        <Button type="submit" disabled={disabled || pending}>
          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.7} />
          Add
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

function QuestRow({
  canMoveDown,
  canMoveUp,
  quest,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  quest: ManagedQuest;
}) {
  const [title, setTitle] = useState(quest.title);
  const [state, action, pending] = useActionState(
    updateQuestTitleAction,
    initialFormState,
  );
  const removeVerb = quest.checkInCount > 0 ? "Archive" : "Delete";
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  const hasTitleChanged = cleanTitle !== quest.title;

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
      <form action={action} className="grid gap-2 lg:grid-cols-[1fr_auto]">
        <input name="questId" type="hidden" value={quest.id} />
        <Input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={96}
          className="h-9 text-sm"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={pending || !hasTitleChanged}
        >
          Save
        </Button>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">#{quest.position}</Badge>
          <span>
            {quest.checkInCount} Check-in
            {quest.checkInCount === 1 ? "" : "s"}
          </span>
          {state.message ? (
            <span
              className={
                state.status === "error" ? "text-destructive" : "text-primary"
              }
            >
              {state.message}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <MoveQuestButton
            direction="up"
            disabled={!canMoveUp}
            questId={quest.id}
          />
          <MoveQuestButton
            direction="down"
            disabled={!canMoveDown}
            questId={quest.id}
          />
          <RemoveQuestDialog quest={quest} removeVerb={removeVerb} />
        </div>
      </div>
    </div>
  );
}

function MoveQuestButton({
  direction,
  disabled,
  questId,
}: {
  direction: "up" | "down";
  disabled: boolean;
  questId: string;
}) {
  return (
    <form action={moveQuestAction}>
      <input name="questId" type="hidden" value={questId} />
      <input name="direction" type="hidden" value={direction} />
      <Button
        aria-label={`Move Quest ${direction}`}
        disabled={disabled}
        size="sm"
        type="submit"
        variant="outline"
      >
        <HugeiconsIcon
          icon={direction === "up" ? ArrowUp01Icon : ArrowDown01Icon}
          size={13}
          strokeWidth={1.8}
        />
        {direction === "up" ? "Up" : "Down"}
      </Button>
    </form>
  );
}

function RemoveQuestDialog({
  quest,
  removeVerb,
}: {
  quest: ManagedQuest;
  removeVerb: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="destructive">
          <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
          {removeVerb}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <HugeiconsIcon icon={Target01Icon} size={16} strokeWidth={1.8} />
          </AlertDialogMedia>
          <AlertDialogTitle>{removeVerb} Quest?</AlertDialogTitle>
          <AlertDialogDescription>
            {quest.checkInCount > 0
              ? "This Quest has Proof, so Pulse will archive it and keep the history intact."
              : "This Quest has no Proof yet, so Pulse will delete it permanently."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={removeQuestAction}>
            <input name="questId" type="hidden" value={quest.id} />
            <AlertDialogAction type="submit" variant="destructive">
              {removeVerb} Quest
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchivedQuestRow({
  canRestore,
  quest,
}: {
  canRestore: boolean;
  quest: ManagedQuest;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{quest.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {quest.checkInCount} saved Check-in
          {quest.checkInCount === 1 ? "" : "s"}
        </div>
      </div>
      <form action={restoreQuestAction}>
        <input name="questId" type="hidden" value={quest.id} />
        <Button
          disabled={!canRestore}
          size="sm"
          type="submit"
          variant="outline"
        >
          <HugeiconsIcon icon={RefreshIcon} size={13} strokeWidth={1.8} />
          Restore
        </Button>
      </form>
    </div>
  );
}
