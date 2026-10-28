"use client";

import { useActionState } from "react";

import { generateIdentitySnapshotAction, type IdentitySnapshotFormState } from "@/app/dashboard/review/actions";
import { useAiQuota, useRefreshAiQuotaOnChange } from "@/components/product/ai-quota";
import { Notice } from "@/components/ui/notice";
import { Statement } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";

export function ReviewStatement({
  statement,
  updatedAt,
  canRefresh,
  aiAvailable,
  locale,
}: {
  statement: string;
  updatedAt: Date | null;
  canRefresh: boolean;
  aiAvailable: boolean;
  locale: string;
}) {
  const initialState: IdentitySnapshotFormState = { status: "idle" };
  const [state, action] = useActionState(generateIdentitySnapshotAction, initialState);
  const { exhausted, exhaustedMessage } = useAiQuota();
  useRefreshAiQuotaOnChange(state);

  const caption = exhausted
    ? exhaustedMessage
    : !aiAvailable
      ? "AI is not set up, so this cannot be rewritten yet."
      : updatedAt
        ? `Updated ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(updatedAt)}.`
        : "Based on your check-ins so far.";

  return (
    <form action={action} className="grid gap-3">
      <Statement>{statement}</Statement>
      {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
      <SummaryBar caption={caption}>
        <SubmitButton variant="secondary" size="sm" disabled={!canRefresh || exhausted} pendingLabel="Reading your check-ins">
          Refresh statement
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
