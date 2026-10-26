"use client";

import { type FormEvent, useMemo, useState } from "react";
import { X } from "@phosphor-icons/react";

import { ProofHistoryGrid } from "@/components/product/proof-history-grid";
import { ProofOutcome } from "@/components/product/proof-outcome";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Field, Input } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import {
  HowItWorks,
  Page,
  PageHeader,
  PageLead,
  PageTitle,
  RelatedLinks,
  Statement,
} from "@/components/ui/page";
import { ActionRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { SummaryBar } from "@/components/ui/summary-bar";
import type { ProofHistoryDay } from "@/lib/pulse/dashboard";

const placeholders = ["Write 500 words", "Morning walk", "Read 10 pages"];

function demoDays(proofToday: number): ProofHistoryDay[] {
  const days: ProofHistoryDay[] = [];
  const today = new Date();
  for (let i = 55; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = i === 0 ? proofToday : 0;
    const winCount = Math.max(0, count - (count > 1 ? 1 : 0));
    days.push({ localDate, winCount, passCount: count - winCount, totalCount: count });
  }
  return days;
}

/** A public demo of the setup. Nothing is saved, in a database or in the browser. */
export function OnboardingForm() {
  const [character, setCharacter] = useState("");
  const [quests, setQuests] = useState([""]);
  const [submitted, setSubmitted] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  const cleanQuests = useMemo(() => quests.map((q) => q.trim()).filter(Boolean), [quests]);
  const canSubmit = character.trim().length > 0 && cleanQuests.length > 0;

  function updateQuest(index: number, value: string) {
    setQuests((current) => current.map((q, i) => (i === index ? value : q)));
    setDemoReady(false);
  }

  function addQuest() {
    setQuests((current) => (current.length >= 3 ? current : [...current, ""]));
    setDemoReady(false);
  }

  function removeQuest(index: number) {
    setQuests((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
    setDemoReady(false);
  }

  function resetDemo() {
    setCharacter("");
    setQuests([""]);
    setSubmitted(false);
    setDemoReady(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;
    setDemoReady(true);
  }

  const previewQuests = cleanQuests.length > 0 ? cleanQuests : placeholders;
  const previewName = character.trim() || "writer";

  return (
    <Page>
      <PageHeader>
        <PageTitle>Try Pulse</PageTitle>
        <PageLead>Pick who you are becoming and a few habits. Nothing is saved.</PageLead>
      </PageHeader>

      <form onSubmit={onSubmit} className="grid gap-8">
        <Field
          label="I am a"
          error={submitted && character.trim().length === 0 ? "Add who you are becoming to continue." : undefined}
          hint="A word or short phrase, like writer or early riser."
        >
          <Input
            value={character}
            placeholder="writer"
            autoComplete="off"
            maxLength={48}
            onChange={(event) => {
              setCharacter(event.target.value);
              setDemoReady(false);
            }}
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
              <li key={index} className="flex items-end gap-2">
                <Field
                  label={`Habit ${index + 1}`}
                  className="flex-1"
                  error={
                    submitted && cleanQuests.length === 0 && index === quests.length - 1
                      ? "Add at least one habit to continue."
                      : undefined
                  }
                >
                  <Input
                    value={quest}
                    placeholder={placeholders[index]}
                    autoComplete="off"
                    maxLength={96}
                    onChange={(event) => updateQuest(index, event.target.value)}
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

        <SummaryBar caption={`${cleanQuests.length} of 3 habits`}>
          {demoReady ? (
            <Button variant="text" onClick={resetDemo}>
              Start over
            </Button>
          ) : null}
          <Button type="submit" variant="primary">
            Preview
          </Button>
        </SummaryBar>
      </form>

      <Section title="Preview">
        <Statement>I am a {previewName}.</Statement>
        <ProofHistoryGrid days={demoDays(demoReady ? previewQuests.length : 0)} />
        <RowList>
          {previewQuests.map((quest, index) => (
            <ActionRow
              key={`${quest}-${index}`}
              leading={<FeatureChip feature="habits" />}
              title={quest}
              caption={demoReady ? "Checked in today" : "Not done yet today"}
              actions={demoReady ? <ProofOutcome outcome={index === 1 ? "pass" : "win"} /> : null}
            />
          ))}
        </RowList>
        <p className="type-small text-fg-2">
          {demoReady
            ? "This is your first day in Pulse. Nothing was saved."
            : "Select Preview to see your first day."}
        </p>
      </Section>

      <HowItWorks
        steps={[
          { title: "Say who you are becoming", body: "I am a writer, a runner, an early riser." },
          { title: "Check in each day", body: "Mark each habit Done or Skipped. Skipping is allowed." },
          { title: "Look back each week", body: "Pulse writes a short recap of what your days show." },
        ]}
      />

      <RelatedLinks>
        <NavRow href="/sign-up" feature="today" title="Create an account" caption="Keep your check-ins." />
      </RelatedLinks>
    </Page>
  );
}
