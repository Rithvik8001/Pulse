"use client";

import { useActionState } from "react";

import { generateWeeklyStoryAction, type WeeklyStoryFormState } from "@/app/dashboard/review/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";

export function WeeklyRecapForm({
  disabled = false,
  hasRecap,
  caption,
}: {
  disabled?: boolean;
  hasRecap: boolean;
  caption: string;
}) {
  const initialState: WeeklyStoryFormState = { status: "idle" };
  const [state, action] = useActionState(generateWeeklyStoryAction, initialState);

  return (
    <form action={action} className="grid gap-3">
      {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
      <SummaryBar caption={caption}>
        <SubmitButton variant="primary" disabled={disabled} pendingLabel="Writing recap">
          {hasRecap ? "Rewrite recap" : "Write this week's recap"}
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
