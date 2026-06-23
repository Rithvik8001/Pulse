"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  AiChat02Icon,
  BubbleChatSparkIcon,
  Cancel01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CoachAction } from "@/lib/pulse/coach-core";
import type { HabitAgentAction } from "@/lib/pulse/habit-agent-core";

type AssistantTab = "coach" | "habits";

const coachConfig: AssistantPaneConfig = {
  api: "/api/pulse-coach",
  emptyDescription:
    "Pulse Coach can reason over your full habit context and propose confirmed actions.",
  emptyIcon: AiChat02Icon,
  emptyTitle: "Ask about today's proof.",
  inputPlaceholder: "Ask Pulse Coach what to do next...",
  label: "Pulse Coach",
  mutationNotice: "Confirm cards before Pulse changes anything.",
  parseProposal: parseCoachProposal,
  proposalPendingText: "Preparing an action...",
  starterPrompts: [
    "What should I focus on today?",
    "Which Quest is drifting?",
    "Summarize my recent Proof.",
    "Help me plan one small next move.",
  ],
  streamingText: "Pulse Coach is thinking...",
};

const habitConfig: AssistantPaneConfig = {
  api: "/api/habit-agent",
  emptyDescription:
    "Habit Agent can create, update, archive, restore, and delete zero-Proof habits after confirmation.",
  emptyIcon: AiBrain01Icon,
  emptyTitle: "Ask for habit operations.",
  inputPlaceholder: "Ask for habit cleanup, archive, restore, or zero-Proof delete...",
  label: "Habit Agent",
  mutationNotice: "Habit changes require confirmation.",
  parseProposal: parseHabitProposal,
  proposalPendingText: "Preparing a habit operation...",
  starterIcon: SparklesIcon,
  starterPrompts: [
    "Clean up my habits",
    "Which habit should I shrink?",
    "Create a better habit for this goal",
    "What should I archive or restore?",
  ],
  streamingText: "Habit Agent is thinking...",
};

export function PulseAssistantLauncher({
  showHabits = true,
}: {
  showHabits?: boolean;
}) {
  const coach = useAssistantChat(coachConfig.api);
  const habits = useAssistantChat(habitConfig.api);

  async function confirmCoach(action: ProposalAction) {
    return confirmPulseCoachAction(action as CoachAction);
  }

  async function confirmHabits(action: ProposalAction) {
    return confirmHabitAgentAction(action as HabitAgentAction);
  }

  return (
    <TooltipProvider>
      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
        <AssistantPanel
          coachSession={coach}
          confirmCoach={confirmCoach}
          confirmHabits={confirmHabits}
          habitSession={habits}
          showHabits={showHabits}
        />
      </div>
    </TooltipProvider>
  );
}

function AssistantPanel({
  coachSession,
  confirmCoach,
  confirmHabits,
  habitSession,
  showHabits,
}: {
  coachSession: ReturnType<typeof useAssistantChat>;
  confirmCoach: (
    action: ProposalAction,
  ) => Promise<{ status: "success" | "error"; message: string }>;
  confirmHabits: (
    action: ProposalAction,
  ) => Promise<{ status: "success" | "error"; message: string }>;
  habitSession: ReturnType<typeof useAssistantChat>;
  showHabits: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AssistantTab>("coach");

  return (
    <>
      {open ? (
        <section
          aria-label="Pulse AI"
          role="dialog"
          className="flex h-[min(700px,calc(100vh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 sm:w-[460px]"
        >
          <header className="flex items-start justify-between gap-3 border-b p-3">
            <div className="flex min-w-0 gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={BubbleChatSparkIcon}
                  size={17}
                  strokeWidth={1.8}
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-semibold">Pulse AI</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Coach reflection or confirmed habit operations.
                </p>
              </div>
            </div>
            <Button
              aria-label="Close Pulse AI"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.8} />
            </Button>
          </header>

          <Tabs
            value={showHabits ? tab : "coach"}
            onValueChange={(value) => setTab(value as AssistantTab)}
            className="min-h-0 flex-1 gap-0"
          >
            <div className="border-b px-3 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="coach">Coach</TabsTrigger>
                {showHabits ? <TabsTrigger value="habits">Habits</TabsTrigger> : null}
              </TabsList>
            </div>
            <TabsContent value="coach" className="min-h-0">
              <AssistantPane
                config={coachConfig}
                confirmAction={confirmCoach}
                session={coachSession}
              />
            </TabsContent>
            {showHabits ? (
              <TabsContent value="habits" className="min-h-0">
                <AssistantPane
                  config={habitConfig}
                  confirmAction={confirmHabits}
                  session={habitSession}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Open Pulse AI"
            className="size-12 rounded-full shadow-lg"
            type="button"
            onClick={() => setOpen((current) => !current)}
          >
            <HugeiconsIcon
              icon={BubbleChatSparkIcon}
              size={22}
              strokeWidth={1.8}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Pulse AI</TooltipContent>
      </Tooltip>
    </>
  );
}
