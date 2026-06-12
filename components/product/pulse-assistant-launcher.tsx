"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  AiChat02Icon,
  BubbleChatSparkIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  RefreshIcon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { confirmPulseCoachAction } from "@/app/dashboard/coach/actions";
import { confirmHabitAgentAction } from "@/app/dashboard/habit-agent/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  coachActionSchema,
  type CoachAction,
  type CoachProposal,
} from "@/lib/pulse/coach-core";
import {
  habitAgentActionSchema,
  type HabitAgentAction,
  type HabitAgentProposal,
} from "@/lib/pulse/habit-agent-core";
import { cn } from "@/lib/utils";

const coachStarterPrompts = [
  "What should I focus on today?",
  "Which Quest is drifting?",
  "Summarize my recent Proof.",
  "Help me plan one small next move.",
];

const habitStarterPrompts = [
  "Clean up my habits",
  "Which habit should I shrink?",
  "Create a better habit for this goal",
  "What should I archive or restore?",
];

type AssistantTab = "coach" | "habits";

type ConfirmationState = {
  status: "confirmed" | "canceled" | "error";
  message: string;
};

type ProposalAction = CoachAction | HabitAgentAction;

type ParsedProposal = {
  title: string;
  summary: string;
  action: ProposalAction;
  actionLabel: string;
  destructive: boolean;
};

type AssistantSession = {
  clearError: () => void;
  confirmations: Record<string, ConfirmationState>;
  disabled: boolean;
  error: Error | undefined;
  input: string;
  isStreaming: boolean;
  messages: UIMessage[];
  regenerate: () => void;
  sendMessage: (message: { text: string }) => void;
  setConfirmations: React.Dispatch<
    React.SetStateAction<Record<string, ConfirmationState>>
  >;
  setInput: (value: string) => void;
  setMessages: (messages: UIMessage[]) => void;
  startConfirming: (callback: () => void) => void;
  stop: () => void;
};

export function PulseAssistantLauncher({
  showHabits = true,
}: {
  showHabits?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AssistantTab>("coach");
  const coach = useAssistantChat("/api/pulse-coach");
  const habits = useAssistantChat("/api/habit-agent");

  return (
    <TooltipProvider>
      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
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
                  <h2 className="font-heading text-sm font-semibold">
                    Pulse AI
                  </h2>
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
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={13}
                  strokeWidth={1.8}
                />
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
                  {showHabits ? (
                    <TabsTrigger value="habits">Habits</TabsTrigger>
                  ) : null}
                </TabsList>
              </div>
              <TabsContent value="coach" className="min-h-0">
                <AssistantPane
                  emptyDescription="Pulse Coach can reason over your full habit context and propose confirmed actions."
                  emptyIcon={AiChat02Icon}
                  emptyTitle="Ask about today's proof."
                  label="Pulse Coach"
                  mode="coach"
                  parseProposal={parseCoachProposal}
                  proposalPendingText="Preparing an action..."
                  session={coach}
                  starterIcon={undefined}
                  starterPrompts={coachStarterPrompts}
                  streamingText="Pulse Coach is thinking..."
                />
              </TabsContent>
              {showHabits ? (
                <TabsContent value="habits" className="min-h-0">
                  <AssistantPane
                    emptyDescription="Habit Agent can create, update, archive, restore, and delete zero-Proof habits after confirmation."
                    emptyIcon={AiBrain01Icon}
                    emptyTitle="Ask for habit operations."
                    label="Habit Agent"
                    mode="habits"
                    parseProposal={parseHabitProposal}
                    proposalPendingText="Preparing a habit operation..."
                    session={habits}
                    starterIcon={SparklesIcon}
                    starterPrompts={habitStarterPrompts}
                    streamingText="Habit Agent is thinking..."
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
      </div>
    </TooltipProvider>
  );
}

function useAssistantChat(api: string): AssistantSession {
  const [input, setInput] = useState("");
  const [confirmations, setConfirmations] = useState<
    Record<string, ConfirmationState>
  >({});
  const [isConfirming, startConfirming] = useTransition();
  const transport = useMemo(() => new DefaultChatTransport({ api }), [api]);
  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat({
    transport,
    experimental_throttle: 80,
  });

  return {
    clearError,
    confirmations,
    disabled: isConfirming || status === "submitted" || status === "streaming",
    error,
    input,
    isStreaming: status === "submitted" || status === "streaming",
    messages,
    regenerate,
    sendMessage,
    setConfirmations,
    setInput,
    setMessages,
    startConfirming,
    stop,
  };
}

function AssistantPane({
  emptyDescription,
  emptyIcon,
  emptyTitle,
  label,
  mode,
  parseProposal,
  proposalPendingText,
  session,
  starterIcon,
  starterPrompts,
  streamingText,
}: {
  emptyDescription: string;
  emptyIcon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  emptyTitle: string;
  label: string;
  mode: AssistantTab;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
  session: AssistantSession;
  starterIcon: React.ComponentProps<typeof HugeiconsIcon>["icon"] | undefined;
  starterPrompts: string[];
  streamingText: string;
}) {
  const router = useRouter();
  const hasMessages = session.messages.length > 0;

  function submitPrompt(prompt: string) {
    void session.sendMessage({ text: prompt });
  }

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = session.input.trim();

    if (!text || session.isStreaming) {
      return;
    }

    session.setInput("");
    void session.sendMessage({ text });
  }

  function clearChat() {
    session.setMessages([]);
    session.setConfirmations({});
    session.clearError();
  }

  function confirmProposal(toolCallId: string, action: ProposalAction) {
    session.startConfirming(() => {
      startConfirmAction(mode, action, async (result) => {
        session.setConfirmations((current) => ({
          ...current,
          [toolCallId]: {
            status: result.status === "success" ? "confirmed" : "error",
            message: result.message,
          },
        }));

        if (result.status === "success") {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      });
    });
  }

  function cancelProposal(toolCallId: string) {
    session.setConfirmations((current) => ({
      ...current,
      [toolCallId]: {
        status: "canceled",
        message: "Canceled. Pulse was not changed.",
      },
    }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {hasMessages ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Clear ${label} chat`}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={clearChat}
              >
                <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear chat</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!hasMessages ? (
          <div className="grid min-h-full content-center gap-4 py-8 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={emptyIcon} size={22} strokeWidth={1.7} />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">
                {emptyTitle}
              </h3>
              <p className="mx-auto mt-1 max-w-[34ch] text-xs/relaxed text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
            <div className="grid gap-2">
              {starterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                  onClick={() => submitPrompt(prompt)}
                >
                  {starterIcon ? (
                    <HugeiconsIcon
                      icon={starterIcon}
                      size={14}
                      strokeWidth={1.7}
                    />
                  ) : null}
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {session.messages.map((message) => (
              <AssistantMessage
                key={message.id}
                confirmations={session.confirmations}
                disabled={session.disabled}
                message={message}
                parseProposal={parseProposal}
                proposalPendingText={proposalPendingText}
                onCancel={cancelProposal}
                onConfirm={confirmProposal}
              />
            ))}
            {session.isStreaming ? (
              <div className="justify-self-start rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {streamingText}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {session.error ? (
        <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {session.error.message || `${label} could not respond.`}
        </div>
      ) : null}

      <form className="grid gap-2 border-t p-3" onSubmit={submitMessage}>
        <Textarea
          aria-label={`Message ${label}`}
          className="max-h-28 min-h-16 resize-none text-sm"
          disabled={session.isStreaming}
          placeholder={
            mode === "coach"
              ? "Ask Pulse Coach what to do next..."
              : "Ask for habit cleanup, archive, restore, or zero-Proof delete..."
          }
          value={session.input}
          onChange={(event) => session.setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {mode === "coach"
              ? "Confirm cards before Pulse changes anything."
              : "Habit changes require confirmation."}
          </div>
          <div className="flex gap-2">
            {session.isStreaming ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void session.stop()}
              >
                Stop
              </Button>
            ) : hasMessages ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void session.regenerate()}
              >
                <HugeiconsIcon icon={RefreshIcon} size={13} strokeWidth={1.7} />
                Retry
              </Button>
            ) : null}
            <Button
              disabled={!session.input.trim() || session.isStreaming}
              type="submit"
            >
              <HugeiconsIcon icon={SentIcon} size={13} strokeWidth={1.7} />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function startConfirmAction(
  mode: AssistantTab,
  action: ProposalAction,
  onComplete: (result: { status: "success" | "error"; message: string }) => void,
) {
  if (mode === "coach") {
    void confirmPulseCoachAction(action as CoachAction).then(onComplete);
    return;
  }

  void confirmHabitAgentAction(action as HabitAgentAction).then(onComplete);
}

function AssistantMessage({
  confirmations,
  disabled,
  message,
  onCancel,
  onConfirm,
  parseProposal,
  proposalPendingText,
}: {
  confirmations: Record<string, ConfirmationState>;
  disabled: boolean;
  message: UIMessage;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: ProposalAction) => void;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "grid gap-2",
        isUser ? "justify-items-end" : "justify-items-start",
      )}
    >
      {message.parts.map((part, index) => {
        if (part.type === "text" && part.text.trim()) {
          return (
            <div
              key={`${message.id}-${index}`}
              className={cn(
                "max-w-[88%] rounded-lg px-3 py-2 text-sm/relaxed",
                isUser
                  ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                  : "border bg-muted/30",
              )}
            >
              {isUser ? part.text : <AssistantMarkdown text={part.text} />}
            </div>
          );
        }

        if (isToolPart(part)) {
          return (
            <ProposalCard
              key={`${message.id}-${index}`}
              confirmation={confirmations[part.toolCallId]}
              disabled={disabled}
              parseProposal={parseProposal}
              part={part}
              pendingText={proposalPendingText}
              onCancel={onCancel}
              onConfirm={onConfirm}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h3 className="mb-2 font-heading text-lg font-semibold leading-tight">
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h3 className="mb-2 mt-3 font-heading text-base font-semibold leading-tight first:mt-0">
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="mb-1.5 mt-3 font-heading text-sm font-semibold leading-tight first:mt-0">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="my-2 first:mt-0 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-muted-foreground">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded bg-background px-1 py-0.5 text-[0.85em]">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            className="font-medium text-primary underline-offset-2 hover:underline"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
      }}
    >
      {redactPrivateIdentifiers(text)}
    </ReactMarkdown>
  );
}

function ProposalCard({
  confirmation,
  disabled,
  onCancel,
  onConfirm,
  parseProposal,
  part,
  pendingText,
}: {
  confirmation: ConfirmationState | undefined;
  disabled: boolean;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: ProposalAction) => void;
  parseProposal: (output: unknown) => ParsedProposal | null;
  part: Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
  pendingText: string;
}) {
  const proposal = parseProposal(part.output);
  const isPending = part.state !== "output-available";

  if (isPending) {
    return (
      <div className="max-w-[88%] rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {pendingText}
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const isFinal = Boolean(confirmation);
  const isConfirmed = confirmation?.status === "confirmed";
  const isCanceled = confirmation?.status === "canceled";
  const isError = confirmation?.status === "error";

  return (
    <div
      className={cn(
        "grid max-w-[88%] gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm",
        isConfirmed && "border-primary/35 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
            isConfirmed && "bg-primary text-primary-foreground",
          )}
        >
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={14}
            strokeWidth={1.7}
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            {redactPrivateIdentifiers(proposal.title)}
            <Badge
              variant={
                isConfirmed
                  ? "default"
                  : proposal.destructive
                    ? "destructive"
                    : "outline"
              }
            >
              {isConfirmed ? "Confirmed" : proposal.actionLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs/relaxed text-muted-foreground">
            {redactPrivateIdentifiers(proposal.summary)}
          </p>
        </div>
      </div>

      {confirmation ? (
        <div
          aria-live="polite"
          className={cn(
            "rounded-md border px-3 py-2 text-xs font-medium",
            isError &&
              "border-destructive/30 bg-destructive/5 text-destructive",
            isConfirmed && "border-primary/30 bg-primary/10 text-primary",
            isCanceled && "bg-muted/30 text-muted-foreground",
          )}
        >
          {confirmation.message}
        </div>
      ) : null}

      {!isFinal || isError ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={disabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onCancel(part.toolCallId)}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.7} />
            Cancel
          </Button>
          <Button
            disabled={disabled}
            size="sm"
            type="button"
            variant={proposal.destructive ? "destructive" : "default"}
            onClick={() => onConfirm(part.toolCallId, proposal.action)}
          >
            {isError ? "Try again" : "Confirm"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function parseCoachProposal(output: unknown): ParsedProposal | null {
  const proposal = getCoachProposal(output);

  if (!proposal) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: proposal.action,
    actionLabel: formatCoachActionLabel(proposal.action.type),
    destructive: false,
  };
}

function parseHabitProposal(output: unknown): ParsedProposal | null {
  const proposal = getHabitProposal(output);

  if (!proposal) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: proposal.action,
    actionLabel: formatHabitActionLabel(proposal.action.type),
    destructive: proposal.action.type === "deleteHabit",
  };
}

function getCoachProposal(output: unknown): CoachProposal | null {
  if (!output || typeof output !== "object") {
    return null;
  }

  const proposal = output as Partial<CoachProposal>;

  if (
    typeof proposal.title !== "string" ||
    typeof proposal.summary !== "string"
  ) {
    return null;
  }

  const action = coachActionSchema.safeParse(proposal.action);

  if (!action.success) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: action.data,
  };
}

function getHabitProposal(output: unknown): HabitAgentProposal | null {
  if (!output || typeof output !== "object") {
    return null;
  }

  const proposal = output as Partial<HabitAgentProposal>;

  if (
    typeof proposal.title !== "string" ||
    typeof proposal.summary !== "string"
  ) {
    return null;
  }

  const action = habitAgentActionSchema.safeParse(proposal.action);

  if (!action.success) {
    return null;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    action: action.data,
  };
}

function isToolPart(
  part: UIMessage["parts"][number],
): part is Extract<UIMessage["parts"][number], { type: `tool-${string}` }> {
  return part.type.startsWith("tool-");
}

function redactPrivateIdentifiers(text: string) {
  return text
    .replace(/\[id:[^\]]+\]/gi, "")
    .replace(/\bid:[\w-]+/gi, "[private id]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[private id]",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[private email]")
    .replace(/\b(?:sk|vck|pk|rk|pat)_[A-Za-z0-9_-]{16,}\b/g, "[private token]")
    .replace(/\b(?:sk|vck|pk|rk|pat)-[A-Za-z0-9_-]{16,}\b/g, "[private token]");
}

function formatCoachActionLabel(action: CoachAction["type"]) {
  switch (action) {
    case "createQuest":
      return "Create";
    case "updateQuest":
      return "Update";
    case "archiveQuest":
      return "Archive";
    case "restoreQuest":
      return "Restore";
    case "saveCheckIn":
      return "Check-in";
    case "saveJournal":
      return "Journal";
  }
}

function formatHabitActionLabel(action: HabitAgentAction["type"]) {
  switch (action) {
    case "createHabit":
      return "Create";
    case "updateHabit":
      return "Update";
    case "archiveHabit":
      return "Archive";
    case "restoreHabit":
      return "Restore";
    case "deleteHabit":
      return "Delete";
  }
}
