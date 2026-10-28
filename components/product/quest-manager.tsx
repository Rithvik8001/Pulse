"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, DotsThree, PencilSimple, Trash, TrayArrowDown } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  createQuestAction,
  moveQuestAction,
  removeQuestAction,
  restoreQuestAction,
  updateQuestTitleAction,
  type QuestFormState,
} from "@/app/dashboard/habits/actions";
import { useShell } from "@/components/product/shell";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Field, Input } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Notice } from "@/components/ui/notice";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";
import type { ManagedQuest } from "@/lib/pulse/quests";

const initialFormState: QuestFormState = { status: "idle" };

function checkInCount(n: number) {
  if (n === 0) return "No check-ins yet";
  return `${n} ${n === 1 ? "check-in" : "check-ins"}`;
}

function caption(quest: ManagedQuest, streak: number) {
  const base = checkInCount(quest.checkInCount);
  return streak >= 2 ? `${base} · ${streak} days in a row` : base;
}

export function QuestManager({
  activeQuestLimit,
  activeQuests,
  archivedQuests,
  streakByQuestId,
  suggestions,
}: {
  activeQuestLimit: number;
  activeQuests: ManagedQuest[];
  archivedQuests: ManagedQuest[];
  streakByQuestId: Record<string, number>;
  suggestions?: React.ReactNode;
}) {
  const activeCount = activeQuests.length;
  const isAtLimit = activeCount >= activeQuestLimit;
  const [deleting, setDeleting] = useState<ManagedQuest | null>(null);

  async function deleteHabit(formData: FormData) {
    try {
      await removeQuestAction(formData);
      toast.success("Habit deleted");
    } catch {
      toast.error("The habit was not deleted. Try again.");
    }
  }

  async function restoreHabit(formData: FormData) {
    try {
      await restoreQuestAction(formData);
      toast.success("Habit restored");
    } catch {
      toast.error("The habit was not restored. Try again.");
    }
  }

  return (
    <div className="grid gap-10">
      <CreateQuestForm activeCount={activeCount} limit={activeQuestLimit} disabled={isAtLimit} />

      <Section title="Active" count={activeCount}>
        {activeQuests.length > 0 ? (
          <RowList>
            {activeQuests.map((quest, index) => (
              <QuestRow
                key={quest.id}
                quest={quest}
                streak={streakByQuestId[quest.id] ?? 0}
                isFirst={index === 0}
                isLast={index === activeQuests.length - 1}
                onDelete={() => setDeleting(quest)}
              />
            ))}
          </RowList>
        ) : (
          <Notice>No active habits. Add one above to see it on Today.</Notice>
        )}
      </Section>

      {suggestions}

      {archivedQuests.length > 0 ? (
        <Section title="Archived" count={archivedQuests.length}>
          <RowList>
            {archivedQuests.map((quest) => (
              <Row key={quest.id} className="flex-wrap">
                <FeatureChip feature="habits" className="opacity-(--soft)" />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="truncate type-body font-medium">{quest.title}</div>
                  <div className="type-caption text-fg-2">{checkInCount(quest.checkInCount)}</div>
                </div>
                <form action={restoreHabit}>
                  <input type="hidden" name="questId" value={quest.id} />
                  <SubmitButton variant="text" size="sm" disabled={isAtLimit} pendingLabel="Restoring">
                    Restore
                  </SubmitButton>
                </form>
              </Row>
            ))}
          </RowList>
          {isAtLimit ? (
            <p className="type-small text-fg-2">Archive an active habit to restore one.</p>
          ) : null}
        </Section>
      ) : null}

      <ConfirmTray
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "this habit"}?`}
        body="It has no check-ins, so nothing else is lost. This cannot be undone."
        confirmLabel="Delete habit"
        pendingLabel="Deleting"
        formAction={deleteHabit}
        hidden={{ questId: deleting?.id ?? "" }}
      />
    </div>
  );
}

function CreateQuestForm({
  activeCount,
  limit,
  disabled,
}: {
  activeCount: number;
  limit: number;
  disabled: boolean;
}) {
  const [state, action] = useActionState(createQuestAction, initialFormState);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state.status === "success") toast.success("Habit added");
  }, [state]);
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);

    if (state.status === "success") setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={action} className="grid gap-4">
      <Field
        id="new-habit"
        label="New habit"
        error={state.status === "error" ? state.message : undefined}
        hint={disabled ? undefined : "One small thing you can repeat each day."}
      >
        <Input name="title" placeholder="Read 10 pages" maxLength={96} disabled={disabled} autoComplete="off" />
      </Field>
      {disabled ? (
        <Notice>You have {limit} active habits. Archive one to add another.</Notice>
      ) : null}
      <SummaryBar caption={`${activeCount} of ${limit} active`}>
        <SubmitButton variant="primary" disabled={disabled} pendingLabel="Adding">
          Add habit
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}

function QuestRow({
  quest,
  streak,
  isFirst,
  isLast,
  onDelete,
}: {
  quest: ManagedQuest;
  streak: number;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const { announce } = useShell();

  function move(direction: "up" | "down") {
    const fd = new FormData();
    fd.set("questId", quest.id);
    fd.set("direction", direction);
    startTransition(async () => {
      await moveQuestAction(fd);
      announce(`Moved ${quest.title} ${direction}`);
    });
  }

  function archive() {
    const fd = new FormData();
    fd.set("questId", quest.id);
    startTransition(async () => {
      try {
        await removeQuestAction(fd);
      } catch {
        toast.error(`${quest.title} was not archived. Try again.`);
        return;
      }
      announce(`${quest.title} archived`);
      toast("Habit archived", {
        description: "Its check-ins stay in your history.",
        duration: 10000,
        action: {
          label: "Undo",
          onClick: () => {
            const undo = new FormData();
            undo.set("questId", quest.id);
            startTransition(async () => {
              try {
                await restoreQuestAction(undo);
                announce(`${quest.title} restored`);
                toast.success("Habit restored");
              } catch {
                toast.error(`${quest.title} was not restored. Restore it from Archived.`);
              }
            });
          },
        },
      });
    });
  }

  return (
    <Row className="min-h-16 flex-wrap">
      <FeatureChip feature="habits" />
      {editing ? (
        <RenameForm quest={quest} onDone={() => setEditing(false)} />
      ) : (
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="truncate type-body font-medium">{quest.title}</div>
          <div className="type-caption text-fg-2">{caption(quest, streak)}</div>
        </div>
      )}
      {!editing ? (
        <Menu trigger={<IconButton label={`More actions for ${quest.title}`} icon={DotsThree} size="sm" />}>
          <MenuItem icon={PencilSimple} onSelect={() => setEditing(true)}>
            Rename
          </MenuItem>
          <MenuItem icon={ArrowUp} disabled={isFirst} onSelect={() => move("up")}>
            Move up
          </MenuItem>
          <MenuItem icon={ArrowDown} disabled={isLast} onSelect={() => move("down")}>
            Move down
          </MenuItem>
          <MenuSeparator />
          {quest.checkInCount > 0 ? (
            <MenuItem icon={TrayArrowDown} onSelect={archive}>
              Archive
            </MenuItem>
          ) : (
            <MenuItem icon={Trash} destructive onSelect={onDelete}>
              Delete
            </MenuItem>
          )}
        </Menu>
      ) : null}
    </Row>
  );
}

function RenameForm({ quest, onDone }: { quest: ManagedQuest; onDone: () => void }) {
  const [state, action] = useActionState(updateQuestTitleAction, initialFormState);
  const [handled, setHandled] = useState(state);
  useEffect(() => {
    if (state.status === "success") toast.success("Habit renamed");
  }, [state]);
  if (handled !== state) {
    setHandled(state);
    if (state.status === "success") onDone();
  }
  return (
    <form action={action} className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
      <input type="hidden" name="questId" value={quest.id} />
      <Field
        label="Habit name"
        labelHidden
        className="min-w-0 flex-1"
        error={state.status === "error" ? state.message : undefined}
      >
        <Input
          name="title"
          defaultValue={quest.title}
          maxLength={96}
          autoFocus
          className="h-control-sm"
          onKeyDown={(event) => {
            if (event.key === "Escape") onDone();
          }}
        />
      </Field>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving">
        Save
      </SubmitButton>
      <Button variant="text" size="sm" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}
