"use client";

import { confirmPulseCoachAction } from "@/app/dashboard/coach/actions";
import { confirmHabitAgentAction } from "@/app/dashboard/habit-agent/actions";
import {
  AssistantPane,
  type AssistantPaneConfig,
  useAssistantChat,
} from "@/components/product/assistant/assistant-chat-shell";
import {
  parseCoachProposal,
  parseHabitProposal,
  type ProposalAction,
} from "@/components/product/assistant/assistant-proposals";
import { useShell } from "@/components/product/shell";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Tray, TrayContent, TrayHeader } from "@/components/ui/tray";
import type { CoachAction } from "@/lib/pulse/coach-core";
import type { HabitAgentAction } from "@/lib/pulse/habit-agent-core";

const coachConfig: AssistantPaneConfig = {
  api: "/api/pulse-coach",
  parseProposal: parseCoachProposal,
  proposalPendingText: "Preparing a change",
};

const habitConfig: AssistantPaneConfig = {
  api: "/api/habit-agent",
  parseProposal: parseHabitProposal,
  proposalPendingText: "Preparing a habit change",
};

const askStarters = [
  "What should I focus on today?",
  "Which habit is slipping?",
  "Sum up my last two weeks.",
  "Help me plan one small next step.",
];

const changeStarters = [
  "Tidy up my habits",
  "Make one of my habits smaller",
  "Add a habit for a goal",
  "Which habits should I archive or restore?",
];

function StarterGroup({
  title,
  prompts,
  onPick,
}: {
  title: string;
  prompts: string[];
  onPick: (prompt: string) => void;
}) {
  return (
    <section aria-label={title} className="grid gap-1">
      <h3 className="type-section">{title}</h3>
      <ul className="grid list-none p-0 [&>*+*]:hairline">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="-mx-3 flex min-h-control w-[calc(100%+1.5rem)] items-center rounded-row px-3 py-2.5 text-left type-body font-medium outline-none transition-colors duration-(--dur-1) hover:bg-fill"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One assistant. Both endpoints stay; the conversation uses whichever one
 * the first message went to, and "Start over" brings back the choice.
 */
export function AssistantTray({ showHabits = true }: { showHabits?: boolean }) {
  const { panel, close } = useShell();
  const coach = useAssistantChat(coachConfig.api);
  const habits = useAssistantChat(habitConfig.api);

  const active = habits.messages.length > 0 ? "habits" : "coach";
  const session = active === "habits" ? habits : coach;
  const config = active === "habits" ? habitConfig : coachConfig;

  async function confirm(action: ProposalAction) {
    return active === "habits"
      ? confirmHabitAgentAction(action as HabitAgentAction)
      : confirmPulseCoachAction(action as CoachAction);
  }

  function startOver() {
    for (const s of [coach, habits]) {
      if (s.isStreaming) s.stop();
      s.setMessages([]);
      s.setConfirmations({});
      s.clearError();
      s.setInput("");
    }
  }

  const empty = (
    <div className="grid gap-6 py-1">
      <div className="grid justify-items-center gap-2 text-center">
        <FeatureChip feature="assistant" size="lg" />
        <p className="mx-auto max-w-lead type-caption text-fg-2">
          Ask about your habits or change them. Nothing changes until you confirm.
        </p>
      </div>
      <StarterGroup
        title="Ask about my habits"
        prompts={askStarters}
        onPick={(prompt) => void coach.sendMessage({ text: prompt })}
      />
      {showHabits ? (
        <StarterGroup
          title="Change my habits"
          prompts={changeStarters}
          onPick={(prompt) => void habits.sendMessage({ text: prompt })}
        />
      ) : null}
    </div>
  );

  return (
    <Tray open={panel === "assistant"} onOpenChange={(o) => !o && close()}>
      <TrayContent width="wide" className="h-[min(40rem,calc(100dvh-2rem))]">
        <TrayHeader title="Assistant" description="Ask about your habits or change them. Nothing changes until you confirm." />
        <AssistantPane
          config={config}
          confirmAction={confirm}
          session={session}
          empty={empty}
          onReset={startOver}
        />
      </TrayContent>
    </Tray>
  );
}
