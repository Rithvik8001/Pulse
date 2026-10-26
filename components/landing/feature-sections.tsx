import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature } from "@/components/ui/features";

const sections: { feature: Feature; title: string; body: string }[] = [
  {
    feature: "habits",
    title: "Habits tied to who you are becoming",
    body: "Start with I am a writer and pick one to three small things a writer does. Each day, mark each one done or skipped. Skipping is honest, not failure.",
  },
  {
    feature: "history",
    title: "A record, not a scoreboard",
    body: "Every check-in is kept. No red numbers or broken chains, only the days you showed up and the days you chose to skip.",
  },
  {
    feature: "journal",
    title: "A journal and a weekly recap",
    body: "Write a few lines a day. At the end of the week, Pulse reads your check-ins and entries and writes a short recap of what it sees.",
  },
];

export function FeatureSections() {
  return (
    <div className="grid gap-10">
      {sections.map((section) => (
        <section key={section.feature} aria-labelledby={`feature-${section.feature}`} className="grid gap-4">
          <FeatureChip feature={section.feature} size="lg" />
          <h2 id={`feature-${section.feature}`} className="type-heading text-balance">
            {section.title}
          </h2>
          <p className="max-w-measure type-body text-fg-2 text-pretty">{section.body}</p>
        </section>
      ))}
    </div>
  );
}

/** One still exchange with the assistant, in its own styles. */
export function CoachSample() {
  return (
    <section aria-labelledby="feature-assistant" className="grid gap-4">
      <FeatureChip feature="assistant" size="lg" />
      <h2 id="feature-assistant" className="type-heading text-balance">
        An assistant that knows your habits
      </h2>
      <p className="max-w-measure type-body text-fg-2 text-pretty">
        Ask what to focus on or which habit is slipping. It answers from your own
        history, and nothing changes until you confirm.
      </p>
      <div inert className="grid gap-3 rounded-card bg-fill p-5">
        <div className="justify-self-end rounded-row bg-fill-2 px-4 py-2.5 type-body">
          Which habit is slipping?
        </div>
        <div className="max-w-measure type-body">
          Morning walk. Four skipped days this week after two weeks of done. Your
          writing has held steady. One small step: take the walk right after your
          first coffee instead of at a set time.
        </div>
      </div>
    </section>
  );
}
