"use client";

import { useActionState } from "react";

import { generateWeeklyStoryAction, type WeeklyStoryFormState } from "@/app/dashboard/review/actions";
import { useAiQuota, useRefreshAiQuotaOnChange } from "@/components/product/ai-quota";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";

export function WeeklyRecapForm({
  disabled = false,
  hasRecap,
  isPreviousWeek = false,
  caption,
}: {
  disabled?: boolean;
  hasRecap: boolean;
  isPreviousWeek?: boolean;
  caption: string;
}) {
  const initialState: WeeklyStoryFormState = { status: "idle" };
  const [state, action] = useActionState(generateWeeklyStoryAction, initialState);
  const { exhausted, exhaustedMessage } = useAiQuota();
  useRefreshAiQuotaOnChange(state);

  return (
    <form action={action} className="grid gap-3">
      {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
      <SummaryBar caption={exhausted ? exhaustedMessage : caption}>
        <SubmitButton variant="primary" disabled={disabled || exhausted} pendingLabel="Writing recap">
          {hasRecap ? "Rewrite recap" : isPreviousWeek ? "Write last week's recap" : "Write this week's recap"}
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
