"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  NotebookIcon,
  SentIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";

import {
  deleteJournalEntryAction,
  saveJournalEntryAction,
  type JournalFormState,
} from "@/app/dashboard/journal/actions";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { journalBodyMaxLength } from "@/lib/pulse/journal-core";
import type { JournalEntrySummary, JournalProof } from "@/lib/pulse/journal";
import { cn } from "@/lib/utils";

type JournalEditorProps = {
  history: JournalEntrySummary[];
  selectedDate: string;
  selectedEntry: JournalEntrySummary | null;
  selectedProof: JournalProof[];
};

const initialFormState: JournalFormState = {
  status: "idle",
};

const prompts = [
  "What proof did you notice?",
  "Where did today drift?",
  "What is one small next move?",
];

export function JournalEditor({
  history,
  selectedDate,
  selectedEntry,
  selectedProof,
}: JournalEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(selectedEntry?.body ?? "");
  const [state, action, pending] = useActionState(
    saveJournalEntryAction,
    initialFormState,
  );
  const remaining = journalBodyMaxLength - draft.length;
  const hasProof = selectedProof.length > 0;

  function goToDate(date: string) {
    router.push(`/dashboard/journal?date=${date}`);
  }

  function goByDays(days: number) {
    goToDate(offsetLocalDate(selectedDate, days));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.42fr]">
      <div className="grid gap-4">
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Daily Journal</CardTitle>
                <CardDescription>
                  One honest reflection for {formatLongDate(selectedDate)}.
                </CardDescription>
              </div>
              <DateControls
                selectedDate={selectedDate}
                goByDays={goByDays}
                goToDate={goToDate}
              />
            </div>
          </CardHeader>
          <CardContent>
            <form action={action} className="grid gap-3">
              <input name="localDate" type="hidden" value={selectedDate} />
              <div className="grid gap-2 rounded-md border bg-muted/20 p-3">
                <div className="flex flex-wrap gap-2">
                  {prompts.map((prompt) => (
                    <Badge key={prompt} variant="outline">
                      {prompt}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  name="body"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={journalBodyMaxLength}
                  placeholder={["Proof: ", "Drift: ", "Next move: "].join("\n")}
                  className="min-h-56 resize-y text-sm"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={cn(
                    "text-xs text-muted-foreground",
                    remaining < 0 && "text-destructive",
                  )}
                >
                  {remaining} characters left
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {selectedEntry ? (
                    <DeleteJournalDialog entry={selectedEntry} />
                  ) : null}
                  <Button
                    type="submit"
                    disabled={pending || draft.trim() === ""}
                  >
                    <HugeiconsIcon
                      icon={SentIcon}
                      size={14}
                      strokeWidth={1.7}
                    />
                    {pending ? "Saving" : "Save Journal"}
                  </Button>
                </div>
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
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Proof from this day</CardTitle>
            <CardDescription>
              Wins and Passes saved on {formatLongDate(selectedDate)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasProof ? (
              <div className="grid gap-2">
                {selectedProof.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-md border bg-muted/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {proof.questTitle}
                        </div>
                        {proof.note ? (
                          <p className="mt-1 line-clamp-2 text-xs/relaxed text-muted-foreground">
                            {proof.note}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant={
                          proof.outcome === "win" ? "default" : "secondary"
                        }
                        className="shrink-0"
                      >
                        <HugeiconsIcon
                          icon={
                            proof.outcome === "win"
                              ? CheckmarkCircle01Icon
                              : UnavailableIcon
                          }
                          size={12}
                          strokeWidth={1.7}
                        />
                        {proof.outcome === "win" ? "Win" : "Pass"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
                  <EmptyTitle>No Proof saved for this day</EmptyTitle>
                  <EmptyDescription>
                    Journal anyway, or check in on today&apos;s Quests first.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Go to Check-ins</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={NotebookIcon} size={16} strokeWidth={1.8} />
          </div>
          <CardTitle>Last 30 days</CardTitle>
          <CardDescription>
            Revisit recent reflections and edit one day at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="grid gap-2">
              {history.map((entry) => {
                const isSelected = entry.localDate === selectedDate;

                return (
                  <Link
                    key={entry.id}
                    href={`/dashboard/journal?date=${entry.localDate}`}
                    className={cn(
                      "grid gap-1 rounded-md border bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40",
                      isSelected && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {formatLongDate(entry.localDate)}
                      </span>
                      {isSelected ? (
                        <Badge variant="outline">Open</Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs/relaxed text-muted-foreground">
                      {entry.body}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty className="rounded-lg border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={18}
                    strokeWidth={1.8}
                  />
                </EmptyMedia>
                <EmptyTitle>No Journal entries yet</EmptyTitle>
                <EmptyDescription>
                  Save today&apos;s reflection to start the history.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DateControls({
  goByDays,
  goToDate,
  selectedDate,
}: {
  goByDays: (days: number) => void;
  goToDate: (date: string) => void;
  selectedDate: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => goByDays(-1)}
      >
        Previous
      </Button>
      <input
        aria-label="Journal date"
        className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        type="date"
        value={selectedDate}
        onChange={(event) => goToDate(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => goByDays(1)}
      >
        Next
      </Button>
    </div>
  );
}

function DeleteJournalDialog({ entry }: { entry: JournalEntrySummary }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.7} />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <HugeiconsIcon icon={NotebookIcon} size={16} strokeWidth={1.8} />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Journal entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the reflection for{" "}
            {formatLongDate(entry.localDate)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteJournalEntryAction}>
            <input name="entryId" type="hidden" value={entry.id} />
            <AlertDialogAction type="submit" variant="destructive">
              Delete Journal
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function offsetLocalDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));
}
