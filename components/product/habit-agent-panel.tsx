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
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  RefreshIcon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { confirmHabitAgentAction } from "@/app/dashboard/habit-agent/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  habitAgentActionSchema,
  type HabitAgentAction,
  type HabitAgentProposal,
} from "@/lib/pulse/habit-agent-core";
import { cn } from "@/lib/utils";

const starterPrompts = [
  "Clean up my habits",
  "Which habit should I shrink?",
  "Create a better habit for this goal",
  "What should I archive or restore?",
];

type ConfirmationState = {
  status: "confirmed" | "canceled" | "error";
  message: string;
};

export function HabitAgentPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [confirmations, setConfirmations] = useState<
    Record<string, ConfirmationState>
  >({});
  const [isConfirming, startConfirming] = useTransition();
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/habit-agent" }),
    [],
  );
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
  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  function submitPrompt(prompt: string) {
    setOpen(true);
    void sendMessage({ text: prompt });
  }

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();

    if (!text || isStreaming) {
      return;
    }

    setInput("");
    void sendMessage({ text });
  }

  function clearChat() {
    setMessages([]);
    setConfirmations({});
    clearError();
  }

  function confirmProposal(toolCallId: string, action: HabitAgentAction) {
    startConfirming(async () => {
      const result = await confirmHabitAgentAction(action);
      setConfirmations((current) => ({
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
  }

  function cancelProposal(toolCallId: string) {
    setConfirmations((current) => ({
      ...current,
      [toolCallId]: {
        status: "canceled",
        message: "Canceled. Pulse was not changed.",
      },
    }));
  }

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-3 md:top-6 md:right-6">
        {open ? (
          <section
            aria-label="Habit Agent chat"
            role="dialog"
            className="flex h-[min(620px,calc(100vh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 sm:w-[460px]"
          >
            <header className="flex items-start justify-between gap-3 border-b p-3">
              <div className="flex min-w-0 gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon
                    icon={AiBrain01Icon}
                    size={17}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-sm font-semibold">
                    Habit Agent
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Proposes habit changes you confirm card by card.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {hasMessages ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label="Clear Habit Agent chat"
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                        onClick={clearChat}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={13}
                          strokeWidth={1.8}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear chat</TooltipContent>
                  </Tooltip>
                ) : null}
                <Button
                  aria-label="Close Habit Agent"
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
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-3">
              {!hasMessages ? (
                <div className="grid min-h-full content-center gap-4 py-8 text-center">
                  <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <HugeiconsIcon
                      icon={AiBrain01Icon}
                      size={22}
                      strokeWidth={1.7}
                    />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-semibold">
                      Ask for habit operations.
                    </h3>
                    <p className="mx-auto mt-1 max-w-[34ch] text-xs/relaxed text-muted-foreground">
                      Habit Agent can create, update, archive, restore, and
                      delete zero-Proof habits after confirmation.
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
                        <HugeiconsIcon
                          icon={SparklesIcon}
                          size={14}
                          strokeWidth={1.7}
                        />
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {messages.map((message) => (
                    <HabitAgentMessage
                      key={message.id}
                      confirmations={confirmations}
                      disabled={isConfirming || isStreaming}
                      message={message}
                      onCancel={cancelProposal}
                      onConfirm={confirmProposal}
                    />
                  ))}
                  {isStreaming ? (
                    <div className="justify-self-start rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Habit Agent is thinking...
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {error ? (
              <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error.message || "Habit Agent could not respond."}
              </div>
            ) : null}

            <form className="grid gap-2 border-t p-3" onSubmit={submitMessage}>
              <Textarea
                aria-label="Message Habit Agent"
                className="max-h-28 min-h-16 resize-none text-sm"
                disabled={isStreaming}
                placeholder="Ask for habit cleanup, archive, restore, or zero-Proof delete..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  Habit changes require confirmation.
                </div>
                <div className="flex gap-2">
                  {isStreaming ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void stop()}
                    >
                      Stop
                    </Button>
                  ) : hasMessages ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void regenerate()}
                    >
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        size={13}
                        strokeWidth={1.7}
                      />
                      Retry
                    </Button>
                  ) : null}
                  <Button disabled={!input.trim() || isStreaming} type="submit">
                    <HugeiconsIcon
                      icon={SentIcon}
                      size={13}
                      strokeWidth={1.7}
                    />
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </section>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Open Habit Agent"
              className="size-12 rounded-full shadow-lg"
              type="button"
              onClick={() => setOpen((current) => !current)}
            >
              <HugeiconsIcon icon={AiBrain01Icon} size={22} strokeWidth={1.8} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Habit Agent</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function HabitAgentMessage({
  confirmations,
  disabled,
  message,
  onCancel,
  onConfirm,
}: {
  confirmations: Record<string, ConfirmationState>;
  disabled: boolean;
  message: UIMessage;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: HabitAgentAction) => void;
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
              {isUser ? part.text : <AgentMarkdown text={part.text} />}
            </div>
          );
        }

        if (isHabitAgentToolPart(part)) {
          return (
            <ProposalCard
              key={`${message.id}-${index}`}
              confirmation={confirmations[part.toolCallId]}
              disabled={disabled}
              part={part}
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

function AgentMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-2 first:mt-0 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
            {children}
          </code>
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
  part,
  onCancel,
  onConfirm,
}: {
  confirmation: ConfirmationState | undefined;
  disabled: boolean;
  part: Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: HabitAgentAction) => void;
}) {
  const proposal = getProposal(part.output);
  const isPending = part.state !== "output-available";

  if (isPending) {
    return (
      <div className="max-w-[88%] rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
        Preparing a habit operation...
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
  const destructive = proposal.action.type === "deleteHabit";

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
                  : destructive
                    ? "destructive"
                    : "outline"
              }
            >
              {isConfirmed
                ? "Confirmed"
                : formatActionLabel(proposal.action.type)}
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
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(part.toolCallId, proposal.action)}
          >
            {isError ? "Try again" : "Confirm"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function isHabitAgentToolPart(
  part: UIMessage["parts"][number],
): part is Extract<UIMessage["parts"][number], { type: `tool-${string}` }> {
  return part.type.startsWith("tool-");
}

function getProposal(output: unknown): HabitAgentProposal | null {
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

function formatActionLabel(action: HabitAgentAction["type"]) {
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
