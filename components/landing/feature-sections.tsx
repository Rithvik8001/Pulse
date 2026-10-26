import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature } from "@/components/ui/features";

const sections: { feature: Feature; title: string; body: string }[] = [
  {
    feature: "quests",
    title: "Quests tied to who you are",
    body: "Pick one character and a few small, repeatable actions that prove it. Each day you mark each one as a win or a pass. A pass is honest, not a failure.",
  },
  {
    feature: "proof",
    title: "Proof, not pressure",
    body: "Every check-in is kept as proof. No red numbers, no broken chains, just a quiet record of the days you showed up.",
  },
  {
    feature: "journal",
    title: "A journal and a weekly story",
    body: "One honest entry a day. At the end of the week, Pulse reads your proof and your entries and writes you a short letter about the pattern it sees.",
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

/** One still exchange with the coach, in the assistant's own styles. */
export function CoachSample() {
  return (
    <section aria-labelledby="feature-coach" className="grid gap-4">
      <FeatureChip feature="coach" size="lg" />
      <h2 id="feature-coach" className="type-heading text-balance">
        A coach that reads your proof
      </h2>
      <p className="max-w-measure type-body text-fg-2 text-pretty">
        Ask what to focus on, which quest is drifting, or how the week went. It
        answers from your own history, and nothing changes until you confirm it.
      </p>
      <div inert className="grid gap-3 rounded-card bg-fill p-5">
        <div className="justify-self-end rounded-row bg-fill-2 px-4 py-2.5 type-body">
          Which quest is drifting?
        </div>
        <div className="max-w-measure type-body">
          Morning walk. Four passes in the last week after two weeks of wins. The
          writing has not slipped. One small move: tie the walk to the first coffee
          rather than to a time.
        </div>
      </div>
    </section>
  );
}
