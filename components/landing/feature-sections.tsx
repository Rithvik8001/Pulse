import type { ReactNode } from "react";
import { EnvelopeSimple, Keyboard, MoonStars } from "@phosphor-icons/react/dist/ssr";

import { Pip } from "@/components/product/pip";
import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature, Tint } from "@/components/ui/features";
import type { IconComponent } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Say who you are becoming", body: "I am a writer, a runner, an early riser." },
  { title: "Check in on the days you plan", body: "Every day, set days or a few times a week. Mark each habit Done or Skipped." },
  { title: "Look back each week", body: "Pulse writes a short recap of what your days show." },
];

export function HowItWorksRow() {
  return (
    <section aria-labelledby="how-title" className="grid gap-6">
      <h2 id="how-title" className="type-section">
        How it works
      </h2>
      <ol className="grid list-none gap-6 p-0 sm:grid-cols-3 sm:gap-8">
        {steps.map((step, i) => (
          <li key={step.title} className="grid content-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-pill bg-fill-2 type-label text-fg-2 tabular-nums"
            >
              {i + 1}
            </span>
            <span className="grid gap-1">
              <span className="type-subhead">{step.title}</span>
              <span className="type-body text-fg-2 text-pretty">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const features: { feature: Feature; title: string; body: string }[] = [
  {
    feature: "today",
    title: "Check in, done or skipped",
    body: "Today shows only the habits due today. Mark each one Done or Skipped and add a note if you want. Skipping is honest, not failure.",
  },
  {
    feature: "habits",
    title: "Habits tied to who you are becoming",
    body: "Start with I am a writer and keep up to twelve small habits a writer does. Pick when each is due, then rename, reorder, archive and restore them as life changes.",
  },
  {
    feature: "history",
    title: "A record, not a scoreboard",
    body: "Every check-in is kept and searchable. See your consistency, done rate, an 8-week grid and how each habit is going, counted only on the days each habit was due. One missed day a week is forgiven.",
  },
  {
    feature: "review",
    title: "A weekly recap, written for you",
    body: "Each week Pulse reads your check-ins and journal and writes a short recap, a one-line statement of who you are becoming, and your milestones.",
  },
  {
    feature: "journal",
    title: "A journal for the day",
    body: "A few lines a day, with prompts to start you off. Each entry sits next to that day's check-ins so you can see what was behind them.",
  },
  {
    feature: "suggestions",
    title: "Quiet suggestions",
    body: "When a habit goes untouched, is skipped often, or an archived one used to be strong, Pulse suggests one small move, including shorter wording.",
  },
];

const extras: { icon: IconComponent; tint: Tint; title: string; body: string }[] = [
  { icon: EnvelopeSimple, tint: "pink", title: "Weekly summary email", body: "Your week in one email, with an unsubscribe link." },
  { icon: Keyboard, tint: "blue", title: "Keyboard first", body: "Command menu, G plus a letter to move around, A to open Pip." },
  { icon: MoonStars, tint: "indigo", title: "Light and dark", body: "Follows your device, or pick one in Settings." },
];

function FeatureCard({
  feature,
  badge,
  title,
  body,
  aside,
  className,
}: {
  feature: Feature;
  badge?: ReactNode;
  title: string;
  body: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("grid content-start gap-4 rounded-card bg-fill p-6", className)}>
      <div className="grid gap-4">
        {badge ?? <FeatureChip feature={feature} size="lg" />}
        <div className="grid gap-2">
          <h3 className="type-heading text-balance">{title}</h3>
          <p className="type-body text-fg-2 text-pretty">{body}</p>
        </div>
      </div>
      {aside}
    </article>
  );
}

export function FeatureSections() {
  return (
    <section aria-labelledby="features-title" className="grid gap-6">
      <h2 id="features-title" className="type-section">
        What you get
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          feature="assistant"
          badge={<Pip size={56} />}
          title="Meet Pip, your habit assistant"
          body="Ask Pip which habit is slipping or what to focus on. Or ask it to add, rename, shrink, archive, restore or delete a habit, check you in, or save a journal entry. Pip knows only your own check-ins and journal, and every change is a proposal you confirm first."
          className="md:col-span-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center md:gap-x-8"
          aside={
            <div inert className="grid gap-3 rounded-row bg-bg p-4">
              <div className="justify-self-end rounded-row bg-fill-2 px-3 py-2 type-caption">
                Make my walk smaller
              </div>
              <div className="flex items-start gap-2.5">
                <Pip size={24} />
                <p className="type-caption text-ink">
                  Four skipped days this week after two weeks of done. A shorter
                  version may hold up better.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-item bg-fill px-3 py-2">
                <span className="grid gap-0.5">
                  <span className="type-caption font-medium">Rename habit</span>
                  <span className="type-small text-fg-2">Morning walk to 10 minute walk</span>
                </span>
                <span className="keycap rounded-key px-3 py-1.5 type-small font-medium">Confirm</span>
              </div>
            </div>
          }
        />
        {features.map((item) => (
          <FeatureCard key={item.feature} {...item} />
        ))}
      </div>
      <ul className="grid list-none gap-4 p-0 md:grid-cols-3">
        {extras.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <FeatureChip icon={item.icon} tint={item.tint} />
            <span className="grid gap-0.5 pt-1">
              <span className="type-body font-medium">{item.title}</span>
              <span className="type-caption text-fg-2">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
