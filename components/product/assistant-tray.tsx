"use client";

import { ChatCircleText, ListChecks } from "@phosphor-icons/react";

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
import { Segmented } from "@/components/ui/segmented";
import { Tray, TrayContent, TrayHeader } from "@/components/ui/tray";
import type { CoachAction } from "@/lib/pulse/coach-core";
import type { HabitAgentAction } from "@/lib/pulse/habit-agent-core";

const coachConfig: AssistantPaneConfig = {
  api: "/api/pulse-coach",
  feature: "coach",
  emptyDescription: "Ask about today, a drifting quest, or what to do next.",
  emptyIcon: ChatCircleText,
  emptyTitle: "Ask the coach",
  inputPlaceholder: "Ask the coach what to do next",
  label: "Coach",
  mutationNotice: "Nothing changes until you confirm it.",
  parseProposal: parseCoachProposal,
  proposalPendingText: "Preparing an action",
  starterPrompts: [
    "What should I focus on today?",
    "Which quest is drifting?",
    "Summarise my recent proof.",
    "Help me plan one small next move.",
  ],
  streamingText: "Thinking",
};

const habitConfig: AssistantPaneConfig = {
  api: "/api/habit-agent",
  feature: "habits",
  emptyDescription:
    "Create, rename, archive or restore quests. Quests with no proof can be deleted.",
  emptyIcon: ListChecks,
  emptyTitle: "Ask the habit agent",
  inputPlaceholder: "Ask for a habit change",
  label: "Habit agent",
  mutationNotice: "Habit changes need your confirmation.",
  parseProposal: parseHabitProposal,
  proposalPendingText: "Preparing a habit change",
  starterPrompts: [
    "Clean up my habits",
    "Which habit should I shrink?",
    "Create a better habit for this goal",
    "What should I archive or restore?",
  ],
  streamingText: "Thinking",
};

/** The assistant, as a wide tray available on every dashboard page. */
export function AssistantTray({ showHabits = true }: { showHabits?: boolean }) {
  const { panel, close, assistantTab, setAssistantTab } = useShell();
  const coach = useAssistantChat(coachConfig.api);
  const habits = useAssistantChat(habitConfig.api);
  const tab = showHabits ? assistantTab : "coach";

  async function confirmCoach(action: ProposalAction) {
    return confirmPulseCoachAction(action as CoachAction);
  }

  async function confirmHabits(action: ProposalAction) {
    return confirmHabitAgentAction(action as HabitAgentAction);
  }

  return (
    <Tray open={panel === "assistant"} onOpenChange={(o) => !o && close()}>
      <TrayContent width="wide" className="h-[min(40rem,calc(100dvh-2rem))]">
        <TrayHeader
          title="Assistant"
          description="Coach reflection or confirmed habit changes."
        />
        {showHabits ? (
          <div className="-mt-1">
            <Segmented
              label="Assistant mode"
              size="sm"
              value={tab}
              onValueChange={(v) => setAssistantTab(v as "coach" | "habits")}
              options={[
                { value: "coach", label: "Coach" },
                { value: "habits", label: "Habits" },
              ]}
            />
          </div>
        ) : null}
        {tab === "coach" ? (
          <AssistantPane
            config={coachConfig}
            confirmAction={confirmCoach}
            session={coach}
          />
        ) : (
          <AssistantPane
            config={habitConfig}
            confirmAction={confirmHabits}
            session={habits}
          />
        )}
      </TrayContent>
    </Tray>
  );
}
