"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiChat02Icon,
  BubbleChatSparkIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  RefreshIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";

import { confirmPulseCoachAction } from "@/app/dashboard/coach/actions";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const starterPrompts = [
  "What should I focus on today?",
  "Which Quest is drifting?",
  "Summarize my recent Proof.",
  "Help me plan one small next move.",
];

type ConfirmationState = {
  status: "confirmed" | "canceled" | "error";
  message: string;
};

export function PulseCoach() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [confirmations, setConfirmations] = useState<
    Record<string, ConfirmationState>
  >({});
  const [isConfirming, startConfirming] = useTransition();
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/pulse-coach" }),
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

  function confirmProposal(toolCallId: string, action: CoachAction) {
    startConfirming(async () => {
      const result = await confirmPulseCoachAction(action);
      setConfirmations((current) => ({
        ...current,
        [toolCallId]: {
          status: result.status === "success" ? "confirmed" : "error",
          message: result.message,
        },
      }));

      if (result.status === "success") {
        router.refresh();
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
      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
        {open ? (
          <section
            aria-label="Pulse Coach chat"
            role="dialog"
            className="flex h-[min(680px,calc(100vh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 sm:w-[420px]"
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
                    Pulse Coach
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Streams from your Quests, Proof, Journal, Story, and
                    Momentum.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {hasMessages ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label="Clear Pulse Coach chat"
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
                  aria-label="Close Pulse Coach"
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
                      icon={AiChat02Icon}
                      size={22}
                      strokeWidth={1.7}
                    />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-semibold">
                      Ask about today&apos;s proof.
                    </h3>
                    <p className="mx-auto mt-1 max-w-[34ch] text-xs/relaxed text-muted-foreground">
                      Pulse Coach can reason over your full habit context and
                      propose confirmed actions.
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
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {messages.map((message) => (
                    <CoachMessage
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
                      Pulse Coach is thinking…
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {error ? (
              <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error.message || "Pulse Coach could not respond."}
              </div>
            ) : null}

            <form className="grid gap-2 border-t p-3" onSubmit={submitMessage}>
              <Textarea
                aria-label="Message Pulse Coach"
                className="max-h-28 min-h-16 resize-none text-sm"
                disabled={isStreaming}
                placeholder="Ask Pulse Coach what to do next…"
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
                  Confirm cards before Pulse changes anything.
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
              aria-label="Open Pulse Coach"
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
          <TooltipContent side="left">Pulse Coach</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function CoachMessage({
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
  onConfirm: (toolCallId: string, action: CoachAction) => void;
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
              {isUser ? part.text : <CoachMarkdown text={part.text} />}
            </div>
          );
        }

        if (isCoachToolPart(part)) {
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

function CoachMarkdown({ text }: { text: string }) {
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
  onConfirm: (toolCallId: string, action: CoachAction) => void;
}) {
  const proposal = getProposal(part.output);
  const isPending = part.state !== "output-available";

  if (isPending) {
    return (
      <div className="max-w-[88%] rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Preparing an action…
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const isFinal = Boolean(confirmation);

  return (
    <div className="grid max-w-[88%] gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={14}
            strokeWidth={1.7}
          />
        </div>
        <div className="min-w-0">
          <div className="font-medium">
            {redactPrivateIdentifiers(proposal.title)}
          </div>
          <p className="mt-1 text-xs/relaxed text-muted-foreground">
            {redactPrivateIdentifiers(proposal.summary)}
          </p>
        </div>
      </div>

      {confirmation ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            confirmation.status === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "bg-muted/30 text-muted-foreground",
          )}
        >
          {confirmation.message}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={disabled || isFinal}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onCancel(part.toolCallId)}
        >
          Cancel
        </Button>
        <Button
          disabled={disabled || isFinal}
          size="sm"
          type="button"
          onClick={() => onConfirm(part.toolCallId, proposal.action)}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

function isCoachToolPart(
  part: UIMessage["parts"][number],
): part is Extract<UIMessage["parts"][number], { type: `tool-${string}` }> {
  return part.type.startsWith("tool-");
}

function getProposal(output: unknown): CoachProposal | null {
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
