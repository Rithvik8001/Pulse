"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, RefreshIcon } from "@hugeicons/core-free-icons";

import {
  generateWeeklyStoryAction,
  type WeeklyStoryFormState,
} from "@/app/dashboard/story/actions";
import { Button } from "@/components/ui/button";

type WeeklyStoryFormProps = {
  disabled?: boolean;
  hasStory: boolean;
};

export function WeeklyStoryForm({
  disabled = false,
  hasStory,
}: WeeklyStoryFormProps) {
  const initialState: WeeklyStoryFormState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    generateWeeklyStoryAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" disabled={disabled || pending}>
        <HugeiconsIcon
          icon={hasStory ? RefreshIcon : AiBrain01Icon}
          size={15}
          strokeWidth={1.8}
        />
        {pending
          ? "Writing Story"
          : hasStory
            ? "Regenerate Story"
            : "Generate Story"}
      </Button>
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
  );
}
