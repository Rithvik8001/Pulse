"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  NotebookIcon,
} from "@hugeicons/core-free-icons";

import {
  deleteProofAction,
  updateProofAction,
  type ProofFormState,
} from "@/app/dashboard/proof/actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ProofEntry,
  ProofHistoryDay,
  ProofOutcome,
  ProofQuestOption,
} from "@/lib/pulse/proof";
import { cn } from "@/lib/utils";

type ProofArchiveProps = {
  days: ProofHistoryDay[];
  entries: ProofEntry[];
  questOptions: ProofQuestOption[];
};

const initialFormState: ProofFormState = {
  status: "idle",
};

export function ProofArchive({
  days,
  entries,
  questOptions,
}: ProofArchiveProps) {
  const [questFilter, setQuestFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | ProofOutcome>(
    "all",
  );
  const [search, setSearch] = useState("");
  const hasProof = entries.length > 0;
  const hasFilters =
    questFilter !== "all" || outcomeFilter !== "all" || search.trim() !== "";
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (questFilter !== "all" && entry.questId !== questFilter) {
        return false;
      }

      if (outcomeFilter !== "all" && entry.outcome !== outcomeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        entry.questTitle.toLowerCase().includes(query) ||
        (entry.note?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [entries, outcomeFilter, questFilter, search]);

  function resetFilters() {
    setQuestFilter("all");
    setOutcomeFilter("all");
    setSearch("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.38fr_1fr]">
      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              className="text-primary"
              icon={Calendar03Icon}
              size={16}
              strokeWidth={1.8}
            />
            <h2 className="text-base font-semibold tracking-tight">
              90-day map
            </h2>
          </div>
          <p className="mt-1 text-sm/relaxed text-muted-foreground">
            Each square is a day with saved Proof.
          </p>
        </div>
        <ProofCalendar days={days} />
      </section>

      <section className="rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Saved Proof
              </h2>
              <p className="mt-1 text-sm/relaxed text-muted-foreground">
                Search, edit, and remove Check-ins from the last 90 days.
              </p>
            </div>
            {hasFilters ? (
              <Button size="sm" type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_0.7fr_0.7fr]">
            <Input
              aria-label="Search Proof"
              className="h-9 text-sm"
              placeholder="Search notes or Quest titles"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter by Quest"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={questFilter}
              onChange={(event) => setQuestFilter(event.target.value)}
            >
              <option value="all">All Quests</option>
              {questOptions.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                  {quest.status === "archived" ? " (archived)" : ""}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by outcome"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={outcomeFilter}
              onChange={(event) =>
                setOutcomeFilter(event.target.value as "all" | ProofOutcome)
              }
            >
              <option value="all">All outcomes</option>
              <option value="win">Wins</option>
              <option value="pass">Passes</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2 p-4">
          {!hasProof ? (
            <Empty className="rounded-lg border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon
                    icon={NotebookIcon}
                    size={18}
                    strokeWidth={1.8}
                  />
                </EmptyMedia>
                <EmptyTitle>No Proof in the last 90 days</EmptyTitle>
                <EmptyDescription>
                  Save a Win or Pass from today&apos;s Check-ins to start the
                  archive.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Go to today&apos;s Check-ins</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <ProofRow key={entry.id} entry={entry} />
            ))
          ) : (
            <Empty className="rounded-lg border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={18}
                    strokeWidth={1.8}
                  />
                </EmptyMedia>
                <EmptyTitle>No matching Proof</EmptyTitle>
                <EmptyDescription>
                  Clear filters or try a different Quest, outcome, or search.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </div>
      </section>
    </div>
  );
}

function ProofCalendar({ days }: { days: ProofHistoryDay[] }) {
  return (
    <div className="grid gap-3 p-4">
      <TooltipProvider>
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
          {days.map((day) => (
            <Tooltip key={day.localDate}>
              <TooltipTrigger asChild>
                <button
                  aria-label={formatProofTooltip(day)}
                  className={cn(
                    "aspect-square rounded-[3px] border border-transparent outline-none transition-[box-shadow,transform] focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    day.totalCount === 0 && "border-border bg-muted/30",
                    day.totalCount > 0 &&
                      day.winCount === 0 &&
                      "border-border bg-secondary",
                    day.winCount === 1 && "bg-primary/30",
                    day.winCount === 2 && "bg-primary/55",
                    day.winCount >= 3 && "bg-primary",
                  )}
                  type="button"
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {formatProofTooltip(day)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-muted/50 ring-1 ring-border" />
          None
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-secondary ring-1 ring-border" />
          Pass
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary/45" />
          Win
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary" />
          Many
        </span>
      </div>
    </div>
  );
}

function formatProofTooltip(day: ProofHistoryDay) {
  const proofLabel = `${day.totalCount} Proof`;
  const winLabel = `${day.winCount} Win${day.winCount === 1 ? "" : "s"}`;
  const passLabel = `${day.passCount} Pass${day.passCount === 1 ? "" : "es"}`;

  return `${formatProofDate(day.localDate)}: ${proofLabel}, ${winLabel}, ${passLabel}`;
}

function ProofRow({ entry }: { entry: ProofEntry }) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{entry.questTitle}</span>
          {entry.questStatus === "archived" ? (
            <Badge variant="outline">Archived</Badge>
          ) : null}
          <Badge variant={entry.outcome === "win" ? "default" : "secondary"}>
            {entry.outcome === "win" ? "Win" : "Pass"}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatProofDate(entry.localDate)}
        </div>
        {entry.note ? (
          <p className="mt-2 line-clamp-2 text-sm/relaxed text-muted-foreground">
            {entry.note}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No note saved.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <EditProofDialog entry={entry} />
        <DeleteProofDialog entry={entry} />
      </div>
    </div>
  );
}

function EditProofDialog({ entry }: { entry: ProofEntry }) {
  const [state, action, pending] = useActionState(
    updateProofAction,
    initialFormState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Proof</DialogTitle>
          <DialogDescription>
            Update the saved outcome or note for {entry.questTitle}.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="checkInId" type="hidden" value={entry.id} />
          <label className="grid gap-2 text-sm font-medium">
            Outcome
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm font-normal shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              name="outcome"
              defaultValue={entry.outcome}
            >
              <option value="win">Win</option>
              <option value="pass">Pass</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Note
            <Textarea
              className="min-h-28 text-sm font-normal"
              defaultValue={entry.note ?? ""}
              maxLength={240}
              name="note"
              placeholder="What did this prove?"
            />
          </label>
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
          <DialogFooter>
            <Button disabled={pending} type="submit">
              Save Proof
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProofDialog({ entry }: { entry: ProofEntry }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="destructive">
          <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <HugeiconsIcon
              icon={Delete02Icon}
              size={16}
              strokeWidth={1.8}
            />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Proof?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the saved Check-in for {entry.questTitle} on{" "}
            {formatProofDate(entry.localDate)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteProofAction}>
            <input name="checkInId" type="hidden" value={entry.id} />
            <AlertDialogAction type="submit" variant="destructive">
              Delete Proof
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatProofDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
