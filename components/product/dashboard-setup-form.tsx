"use client";

import { useActionState, useState } from "react";
import { X } from "@phosphor-icons/react";

import { createInitialSetup, type SetupFormState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { SubmitButton } from "@/components/ui/submit-button";
import { SummaryBar } from "@/components/ui/summary-bar";

const placeholders = ["Write 500 words", "Morning walk", "Read 10 pages"];

export function DashboardSetupForm() {
  const initialState: SetupFormState = {
    status: "idle",
    fields: { quests: [""] },
  };
  const [state, action] = useActionState(createInitialSetup, initialState);
  const [character, setCharacter] = useState(state.fields?.character ?? "");
  const [quests, setQuests] = useState<string[]>(() => {
    const given = (state.fields?.quests ?? []).filter((q) => q.trim());
    return given.length > 0 ? given : [""];
  });

  function addQuest() {
    setQuests((current) => (current.length >= 3 ? current : [...current, ""]));
  }

  function removeQuest(index: number) {
    setQuests((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  }

  function updateQuest(index: number, value: string) {
    setQuests((current) => current.map((q, i) => (i === index ? value : q)));
  }

  return (
    <form action={action} className="grid gap-8">
      <Field
        label="I am a"
        error={state.errors?.character}
        hint="A word or short phrase, like writer or early riser."
        required
      >
        <Input
          name="character"
          placeholder="writer"
          value={character}
          onChange={(event) => setCharacter(event.target.value)}
          maxLength={48}
          required
          autoComplete="off"
        />
      </Field>

      <Section
        title="Habits that show it"
        action={
          quests.length < 3 ? (
            <Button variant="text" size="sm" onClick={addQuest}>
              Add another habit
            </Button>
          ) : null
        }
      >
        <ul className="grid list-none gap-4 p-0">
          {quests.map((quest, index) => (
            <li key={index} className="flex items-end gap-3">
              <Field
                label={`Habit ${index + 1}`}
                className="flex-1"
                error={index === quests.length - 1 ? state.errors?.quests : undefined}
              >
                <Input
                  name="quests"
                  placeholder={placeholders[index]}
                  value={quest}
                  onChange={(event) => updateQuest(index, event.target.value)}
                  maxLength={96}
                  autoComplete="off"
                />
              </Field>
              {quests.length > 1 ? (
                <IconButton
                  label={`Remove habit ${index + 1}`}
                  icon={X}
                  onClick={() => removeQuest(index)}
                  className="mb-1"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      {state.message ? <Notice tone="bad">{state.message}</Notice> : null}

      <SummaryBar caption="One to three habits, each starting as every day. You can change schedules later on Habits.">
        <SubmitButton variant="primary" pendingLabel="Setting up">
          Start checking in
        </SubmitButton>
      </SummaryBar>
    </form>
  );
}
