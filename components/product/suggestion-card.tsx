"use client";

import { useActionState, useState } from "react";
import { X } from "@phosphor-icons/react";

import { removeQuestAction, restoreQuestAction } from "@/app/dashboard/habits/actions";
import {
  applyRewordAction,
  getRewordOptionsAction,
  type RewordOptionsState,
} from "@/app/dashboard/suggestions/actions";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FeatureChip } from "@/components/ui/feature-chip";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { ActionRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tray, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";
import type { QuestSuggestion } from "@/lib/pulse/suggestions";

const initialRewordState: RewordOptionsState = { status: "idle" };

export function SuggestionList({
  suggestions,
  isAtQuestLimit,
}: {
  suggestions: QuestSuggestion[];
  isAtQuestLimit: boolean;
}) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [rewordState, rewordAction, rewordPending] = useActionState(
    getRewordOptionsAction,
    initialRewordState,
  );
  const [rewordingQuestId, setRewordingQuestId] = useState<string | null>(null);

  const visible = suggestions.filter((s) => !dismissedIds.has(s.questId)).slice(0, 3);
  if (visible.length === 0) return null;

  function dismiss(questId: string) {
    setDismissedIds((prev) => new Set([...prev, questId]));
  }

  return (
    <Section title="Suggestions" count={visible.length}>
      <RowList>
        {visible.map((suggestion) => (
          <ActionRow
            key={suggestion.questId}
            leading={<FeatureChip feature="suggestions" />}
            title={suggestion.questTitle}
            caption={suggestion.reason}
            actions={
              <>
                {suggestion.type === "archive" ? (
                  <ConfirmTray
                    trigger={
                      <Button variant="text" size="sm">
                        Archive
                      </Button>
                    }
                    title={`Archive ${suggestion.questTitle}?`}
                    body="If it has check-ins, it leaves Today and they stay in your history. If it has none, it is deleted."
                    confirmLabel="Archive habit"
                    pendingLabel="Archiving"
                    formAction={removeQuestAction}
                    hidden={{ questId: suggestion.questId }}
                  />
                ) : null}
                {suggestion.type === "restore" ? (
                  <form action={restoreQuestAction}>
                    <input type="hidden" name="questId" value={suggestion.questId} />
                    <SubmitButton variant="text" size="sm" disabled={isAtQuestLimit} pendingLabel="Restoring">
                      Restore
                    </SubmitButton>
                  </form>
                ) : null}
                {suggestion.type === "reword" ? (
                  <form action={rewordAction} onSubmit={() => setRewordingQuestId(suggestion.questId)}>
                    <input type="hidden" name="questId" value={suggestion.questId} />
                    <Button
                      type="submit"
                      variant="text"
                      size="sm"
                      pending={rewordPending && rewordingQuestId === suggestion.questId}
                      pendingLabel="Finding wording"
                    >
                      Suggest wording
                    </Button>
                  </form>
                ) : null}
                <IconButton label="Dismiss suggestion" icon={X} size="sm" onClick={() => dismiss(suggestion.questId)} />
              </>
            }
          >
            {suggestion.type === "restore" && isAtQuestLimit ? (
              <p className="w-full type-small text-fg-2 sm:pl-14">
                Archive an active habit to restore this one.
              </p>
            ) : null}
            {suggestion.type === "reword" &&
            rewordingQuestId === suggestion.questId &&
            rewordState.status === "error" ? (
              <Notice tone="bad" className="w-full">
                {rewordState.message}
              </Notice>
            ) : null}
          </ActionRow>
        ))}
      </RowList>

      <RewordTray
        suggestion={visible.find((s) => s.questId === rewordingQuestId) ?? null}
        alternatives={
          rewordState.status === "success" && rewordState.alternatives ? rewordState.alternatives : null
        }
        onClose={() => setRewordingQuestId(null)}
      />
    </Section>
  );
}

function RewordTray({
  suggestion,
  alternatives,
  onClose,
}: {
  suggestion: QuestSuggestion | null;
  alternatives: string[] | null;
  onClose: () => void;
}) {
  const open = Boolean(suggestion && alternatives && alternatives.length > 0);
  return (
    <Tray open={open} onOpenChange={(o) => !o && onClose()}>
      <TrayContent>
        <TrayHeader
          title={`New wording for ${suggestion?.questTitle ?? "this habit"}`}
          description="Choose one. Nothing changes until you save."
        />
        {suggestion && alternatives ? (
          <form action={applyRewordAction} className="grid gap-4">
            <input type="hidden" name="questId" value={suggestion.questId} />
            <TrayBody>
              <ChoiceCards
                label="Wording"
                name="title"
                columns={1}
                options={alternatives.map((alt) => ({ value: alt, title: alt }))}
              />
            </TrayBody>
            <div className="grid gap-3 pt-1">
              <SubmitButton variant="primary" fullWidth pendingLabel="Renaming">
                Use this wording
              </SubmitButton>
              <Button variant="text" fullWidth onClick={onClose}>
                Keep current name
              </Button>
            </div>
          </form>
        ) : null}
      </TrayContent>
    </Tray>
  );
}
