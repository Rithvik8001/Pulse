"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, DotsThree, PencilSimple, Trash, TrayArrowDown } from "@phosphor-icons/react";

import {
  createQuestAction,
  moveQuestAction,
  removeQuestAction,
  restoreQuestAction,
  updateQuestTitleAction,
  type QuestFormState,
} from "@/app/dashboard/quests/actions";
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
import { toast } from "@/components/ui/toast";
import type { ManagedQuest } from "@/lib/pulse/quests";
import { cn } from "@/lib/utils";

const initialFormState: QuestFormState = { status: "idle" };

function proofCount(n: number) {
  return `${n} ${n === 1 ? "proof" : "proof"}`;
}

export function QuestManager({
  activeQuestLimit,
  activeQuests,
  archivedQuests,
}: {
  activeQuestLimit: number;
  activeQuests: ManagedQuest[];
  archivedQuests: ManagedQuest[];
}) {
  const activeCount = activeQuests.length;
  const isAtLimit = activeCount >= activeQuestLimit;
  const [deleting, setDeleting] = useState<ManagedQuest | null>(null);

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
                canMoveUp={index > 0}
                canMoveDown={index < activeQuests.length - 1}
                onDelete={() => setDeleting(quest)}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Add a quest above to start building proof again.</Notice>
        )}
      </Section>

      <Section title="Archived" count={archivedQuests.length}>
        {archivedQuests.length > 0 ? (
          <RowList>
            {archivedQuests.map((quest) => (
              <Row key={quest.id} className="flex-wrap">
                <FeatureChip feature="quests" className="opacity-(--soft)" />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="truncate type-body font-medium">{quest.title}</div>
                  <div className="type-caption text-fg-2">{proofCount(quest.checkInCount)}</div>
                </div>
                <form action={restoreQuestAction}>
                  <input type="hidden" name="questId" value={quest.id} />
                  <SubmitButton variant="text" size="sm" disabled={isAtLimit} pendingLabel="Restoring">
                    Restore
                  </SubmitButton>
                </form>
              </Row>
            ))}
          </RowList>
        ) : (
          <Notice>Archived quests will appear here, with their proof kept.</Notice>
        )}
        {archivedQuests.length > 0 && isAtLimit ? (
          <p className="type-small text-fg-2">
            Archive an active quest before restoring one.
          </p>
        ) : null}
      </Section>

      <ConfirmTray
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "this quest"}?`}
        body="It has no proof yet, so it is removed for good."
        confirmLabel="Delete quest"
        pendingLabel="Deleting"
        formAction={removeQuestAction}
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
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);
    // Remount the form so the field clears after a successful add.
    if (state.status === "success") setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={action} className="grid gap-4">
      <Field
        id="new-quest"
        label="New quest"
        error={state.status === "error" ? state.message : undefined}
        hint={disabled ? undefined : "One small, repeatable action."}
      >
        <Input name="title" placeholder="Write 500 words" maxLength={96} disabled={disabled} autoComplete="off" />
      </Field>
      {disabled ? (
        <Notice>
          You have {limit} active quests. Archive one to add another.
        </Notice>
      ) : null}
      <SummaryBar caption={`${activeCount} of ${limit} active`}>
        <SubmitButton variant="primary" disabled={disabled} pendingLabel="Adding">
          Add quest
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}

function QuestRow({
  quest,
  canMoveUp,
  canMoveDown,
  onDelete,
}: {
  quest: ManagedQuest;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const { announce } = useShell();

  function archive() {
    const fd = new FormData();
    fd.set("questId", quest.id);
    startTransition(async () => {
      await removeQuestAction(fd);
      announce(`${quest.title} archived`);
      toast.show("Quest archived", {
        action: {
          label: "Undo",
          onClick: () => {
            const undo = new FormData();
            undo.set("questId", quest.id);
            startTransition(async () => {
              await restoreQuestAction(undo);
              announce(`${quest.title} restored`);
            });
          },
        },
      });
    });
  }

  return (
    <Row className="min-h-16 flex-wrap">
      <FeatureChip feature="quests" />
      {editing ? (
        <RenameForm quest={quest} onDone={() => setEditing(false)} />
      ) : (
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="truncate type-body font-medium">{quest.title}</div>
          <div className="type-caption text-fg-2">{proofCount(quest.checkInCount)}</div>
        </div>
      )}
      {!editing ? (
        <div className="flex shrink-0 items-center gap-1">
          <MoveButton direction="up" questId={quest.id} visible={canMoveUp} />
          <MoveButton direction="down" questId={quest.id} visible={canMoveDown} />
          <Menu trigger={<IconButton label={`More actions for ${quest.title}`} icon={DotsThree} size="sm" />}>
            <MenuItem icon={PencilSimple} onSelect={() => setEditing(true)}>
              Rename
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
        </div>
      ) : null}
    </Row>
  );
}

function MoveButton({
  direction,
  questId,
  visible,
}: {
  direction: "up" | "down";
  questId: string;
  visible: boolean;
}) {
  // The slot stays reserved so rows never shift.
  if (!visible) return <span aria-hidden className="size-control-sm" />;
  return (
    <form action={moveQuestAction} className="contents">
      <input type="hidden" name="questId" value={questId} />
      <input type="hidden" name="direction" value={direction} />
      <IconButton
        type="submit"
        label={direction === "up" ? "Move up" : "Move down"}
        icon={direction === "up" ? ArrowUp : ArrowDown}
        size="sm"
      />
    </form>
  );
}

function RenameForm({ quest, onDone }: { quest: ManagedQuest; onDone: () => void }) {
  const [state, action] = useActionState(updateQuestTitleAction, initialFormState);
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);
    if (state.status === "success") onDone();
  }
  return (
    <form action={action} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="questId" value={quest.id} />
      <Field
        label="Quest name"
        labelHidden
        className="min-w-0 flex-1"
        error={state.status === "error" ? state.message : undefined}
      >
        <Input
          name="title"
          defaultValue={quest.title}
          maxLength={96}
          autoFocus
          className={cn("h-control-sm")}
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
