"use client";

import { useActionState } from "react";

import { generateWeeklyStoryAction, type WeeklyStoryFormState } from "@/app/dashboard/story/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";

export function WeeklyStoryForm({
  disabled = false,
  hasStory,
  caption,
}: {
  disabled?: boolean;
  hasStory: boolean;
  caption: string;
}) {
  const initialState: WeeklyStoryFormState = { status: "idle" };
  const [state, action] = useActionState(generateWeeklyStoryAction, initialState);

  return (
    <form id="write" action={action} className="grid gap-3 scroll-mt-24">
      {state.status === "error" ? <Notice tone="bad">{state.message}</Notice> : null}
      <SummaryBar caption={caption}>
        <SubmitButton variant="primary" disabled={disabled} pendingLabel="Writing story">
          {hasStory ? "Rewrite story" : "Write this week's story"}
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
