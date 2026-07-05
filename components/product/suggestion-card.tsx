"use client";

import { useActionState, useState, type ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  RefreshIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import {
  removeQuestAction,
  restoreQuestAction,
} from "@/app/dashboard/quests/actions";
import {
  applyRewordAction,
  getRewordOptionsAction,
  type RewordOptionsState,
} from "@/app/dashboard/suggestions/actions";
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
import { SectionLabel } from "@/components/product/section-label";
import type { QuestSuggestion } from "@/lib/pulse/suggestions";
import { cn } from "@/lib/utils";

type SuggestionListProps = {
  suggestions: QuestSuggestion[];
  isAtQuestLimit: boolean;
};

const initialRewordState: RewordOptionsState = { status: "idle" };

export function SuggestionList({
  suggestions,
  isAtQuestLimit,
}: SuggestionListProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rewordState, rewordAction, rewordPending] = useActionState(
    getRewordOptionsAction,
    initialRewordState,
  );
  const [rewordingQuestId, setRewordingQuestId] = useState<string | null>(null);

  const visible = suggestions.filter((s) => !dismissedIds.has(s.questId));

  if (visible.length === 0) return null;

  function dismiss(questId: string) {
    setDismissedIds((prev) => new Set([...prev, questId]));
  }

  return (
    <section className="grid gap-3">
      <SectionLabel icon={SparklesIcon}>
        Suggestions ({visible.length})
      </SectionLabel>
      <div className="grid gap-3">
        {visible.map((suggestion) => {
          if (suggestion.type === "archive") {
            return (
              <ArchiveSuggestion
                key={suggestion.questId}
                suggestion={suggestion}
                onDismiss={() => dismiss(suggestion.questId)}
              />
            );
          }

          if (suggestion.type === "restore") {
            return (
              <RestoreSuggestion
                key={suggestion.questId}
                suggestion={suggestion}
                isAtQuestLimit={isAtQuestLimit}
                onDismiss={() => dismiss(suggestion.questId)}
              />
            );
          }

          return (
            <RewordSuggestion
              key={suggestion.questId}
              suggestion={suggestion}
              rewordState={rewordState}
              rewordAction={rewordAction}
              rewordPending={rewordPending}
              rewordingQuestId={rewordingQuestId}
              setRewordingQuestId={setRewordingQuestId}
              onDismiss={() => dismiss(suggestion.questId)}
            />
          );
        })}
      </div>
    </section>
  );
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Dismiss suggestion"
      onClick={onDismiss}
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.8} />
    </button>
  );
}

function SuggestionRow({
  children,
  icon,
  badge,
  questTitle,
  reason,
  onDismiss,
  badgeVariant,
}: {
  children: React.ReactNode;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
  badge: string;
  questTitle: string;
  reason: string;
  onDismiss: () => void;
  badgeVariant: "destructive" | "secondary" | "outline";
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={icon} size={18} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 truncate font-medium">
                {questTitle}
              </span>
              <Badge variant={badgeVariant} className="shrink-0">
                {badge}
              </Badge>
            </div>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              {reason}
            </p>
          </div>
        </div>
        <DismissButton onDismiss={onDismiss} />
      </div>
      {children}
    </div>
  );
}

function ArchiveSuggestion({
  suggestion,
  onDismiss,
}: {
  suggestion: QuestSuggestion;
  onDismiss: () => void;
}) {
  return (
    <SuggestionRow
      icon={Delete02Icon}
      badge="Archive"
      badgeVariant="destructive"
      questTitle={suggestion.questTitle}
      reason={suggestion.reason}
      onDismiss={onDismiss}
    >
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" type="button" variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
              Archive Quest
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
              <AlertDialogTitle>Archive Quest?</AlertDialogTitle>
              <AlertDialogDescription>
                {`Your Proof stays intact. This Quest will leave daily Check-ins and move to your Archive.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={removeQuestAction}>
                <input
                  type="hidden"
                  name="questId"
                  value={suggestion.questId}
                />
                <AlertDialogAction type="submit" variant="destructive">
                  Archive Quest
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SuggestionRow>
  );
}

function RestoreSuggestion({
  suggestion,
  isAtQuestLimit,
  onDismiss,
}: {
  suggestion: QuestSuggestion;
  isAtQuestLimit: boolean;
  onDismiss: () => void;
}) {
  const atLimit = isAtQuestLimit;

  return (
    <SuggestionRow
      icon={RefreshIcon}
      badge="Restore"
      badgeVariant="outline"
      questTitle={suggestion.questTitle}
      reason={suggestion.reason}
      onDismiss={onDismiss}
    >
      <div className="grid gap-2">
        <div className="flex gap-2">
          <form action={restoreQuestAction}>
            <input type="hidden" name="questId" value={suggestion.questId} />
            <Button
              size="sm"
              type="submit"
              variant="outline"
              disabled={atLimit}
            >
              <HugeiconsIcon icon={RefreshIcon} size={13} strokeWidth={1.8} />
              Restore Quest
            </Button>
          </form>
        </div>
        {atLimit ? (
          <p className="text-xs text-muted-foreground">
            Archive a Quest first to restore this one.
          </p>
        ) : null}
      </div>
    </SuggestionRow>
  );
}

function RewordSuggestion({
  suggestion,
  rewordState,
  rewordAction,
  rewordPending,
  rewordingQuestId,
  setRewordingQuestId,
  onDismiss,
}: {
  suggestion: QuestSuggestion;
  rewordState: RewordOptionsState;
  rewordAction: (payload: FormData) => void;
  rewordPending: boolean;
  rewordingQuestId: string | null;
  setRewordingQuestId: (id: string | null) => void;
  onDismiss: () => void;
}) {
  const isThisReword = rewordingQuestId === suggestion.questId;
  const isLoading = rewordPending && isThisReword;
  const showAlternatives =
    rewordState.status === "success" &&
    isThisReword &&
    rewordState.alternatives;

  return (
    <SuggestionRow
      icon={SparklesIcon}
      badge="Reword"
      badgeVariant="secondary"
      questTitle={suggestion.questTitle}
      reason={suggestion.reason}
      onDismiss={onDismiss}
    >
      <div className="grid gap-2">
        {!showAlternatives ? (
          <form
            action={rewordAction}
            onSubmit={() => setRewordingQuestId(suggestion.questId)}
          >
            <input type="hidden" name="questId" value={suggestion.questId} />
            <Button
              size="sm"
              type="submit"
              variant="outline"
              disabled={isLoading}
            >
              <HugeiconsIcon
                icon={SparklesIcon}
                size={13}
                strokeWidth={1.8}
                className={cn(isLoading && "animate-pulse")}
              />
              {isLoading ? "Generating…" : "Suggest rewording"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-2">
            <p className="text-xs text-muted-foreground">
              Choose an alternative:
            </p>
            <div className="flex flex-wrap gap-2">
              {rewordState.alternatives!.map((alt) => (
                <form key={alt} action={applyRewordAction}>
                  <input
                    type="hidden"
                    name="questId"
                    value={suggestion.questId}
                  />
                  <input type="hidden" name="title" value={alt} />
                  <Button size="sm" type="submit" variant="outline">
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      size={13}
                      strokeWidth={1.8}
                    />
                    {alt}
                  </Button>
                </form>
              ))}
            </div>
            <button
              type="button"
              className="text-left text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setRewordingQuestId(null)}
            >
              Keep original title
            </button>
          </div>
        )}
        {rewordState.status === "error" && isThisReword ? (
          <p className="text-xs text-destructive">{rewordState.message}</p>
        ) : null}
      </div>
    </SuggestionRow>
  );
}
