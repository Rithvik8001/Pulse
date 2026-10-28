"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CalendarDots, DotsThree, PencilSimple, Trash, TrayArrowDown } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  createQuestAction,
  moveQuestAction,
  removeQuestAction,
  restoreQuestAction,
  updateQuestScheduleAction,
  updateQuestTitleAction,
  type QuestFormState,
} from "@/app/dashboard/habits/actions";
import { SchedulePicker } from "@/components/product/schedule-picker";
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
import { Tray, TrayActions, TrayBody, TrayContent, TrayHeader } from "@/components/ui/tray";
import type { ManagedQuest } from "@/lib/pulse/quests";
import type { ScheduleInput } from "@/lib/pulse/schedule-core";

export type HabitScheduleMeta = {
  scheduleLabel: string;
  runLabel: string | null;
  schedule: ScheduleInput;
};

const initialFormState: QuestFormState = { status: "idle" };

function checkInCount(n: number) {
  if (n === 0) return "No check-ins yet";
  return `${n} ${n === 1 ? "check-in" : "check-ins"}`;
}

function caption(quest: ManagedQuest, meta: HabitScheduleMeta | undefined) {
  return [meta?.scheduleLabel ?? "Every day", checkInCount(quest.checkInCount), meta?.runLabel]
    .filter(Boolean)
    .join(" · ");
}

export function QuestManager({
  activeQuestLimit,
  activeQuests,
  archivedQuests,
  scheduleByQuestId,
  suggestions,
}: {
  activeQuestLimit: number;
  activeQuests: ManagedQuest[];
  archivedQuests: ManagedQuest[];
  scheduleByQuestId: Record<string, HabitScheduleMeta>;
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
                meta={scheduleByQuestId[quest.id]}
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
              <Row key={quest.id} className="flex-wrap" data-highlight-id={quest.id}>
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

    if (state.status === "success") {
      setFormKey((k) => k + 1);
    }
  }

  return (
    <form key={formKey} action={action} className="grid gap-4">
      <Field
        id="new-habit"
        label="New habit"
        error={state.status === "error" ? state.message : undefined}
        hint={disabled ? undefined : "One small thing you can repeat."}
      >
        <Input name="title" placeholder="Read 10 pages" maxLength={96} disabled={disabled} autoComplete="off" />
      </Field>
      <SchedulePicker key={formKey} disabled={disabled} />
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
  meta,
  isFirst,
  isLast,
  onDelete,
}: {
  quest: ManagedQuest;
  meta: HabitScheduleMeta | undefined;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const closeSchedule = useCallback(() => setEditingSchedule(false), []);
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
    <Row className="min-h-16 flex-wrap" data-highlight-id={quest.id}>
      <FeatureChip feature="habits" />
      {editing ? (
        <RenameForm quest={quest} onDone={() => setEditing(false)} />
      ) : (
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="truncate type-body font-medium">{quest.title}</div>
          <div className="type-caption text-fg-2">{caption(quest, meta)}</div>
        </div>
      )}
      {!editing ? (
        <Menu trigger={<IconButton label={`More actions for ${quest.title}`} icon={DotsThree} size="sm" />}>
          <MenuItem icon={PencilSimple} onSelect={() => setEditing(true)}>
            Rename
          </MenuItem>
          <MenuItem icon={CalendarDots} onSelect={() => setEditingSchedule(true)}>
            Change schedule
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
      <ScheduleTray
        quest={quest}
        schedule={meta?.schedule ?? { kind: "daily" }}
        open={editingSchedule}
        onClose={closeSchedule}
      />
    </Row>
  );
}

function ScheduleTray({
  quest,
  schedule,
  open,
  onClose,
}: {
  quest: ManagedQuest;
  schedule: ScheduleInput;
  open: boolean;
  onClose: () => void;
}) {
  const [state, action] = useActionState(updateQuestScheduleAction, initialFormState);
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(state.message === "No change." ? "Schedule unchanged" : "Schedule updated");
    onClose();
  }, [state, onClose]);

  return (
    <Tray open={open} onOpenChange={(next) => !next && onClose()}>
      <TrayContent>
        <TrayHeader
          title={`Schedule for ${quest.title}`}
          description="Choose when this habit is due. Past days keep the schedule they had."
        />
        <form action={action} className="grid gap-4">
          <input type="hidden" name="questId" value={quest.id} />
          <TrayBody>
            <SchedulePicker key={open ? "open" : "closed"} defaultValue={schedule} labelHidden />
            <p className="type-small text-fg-2">Starts today. Past days keep the schedule they had.</p>
            {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
          </TrayBody>
          <TrayActions
            primary={
              <SubmitButton variant="primary" fullWidth pendingLabel="Saving">
                Save schedule
              </SubmitButton>
            }
            secondary={
              <Button variant="text" fullWidth onClick={onClose}>
                Cancel
              </Button>
            }
          />
        </form>
      </TrayContent>
    </Tray>
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
