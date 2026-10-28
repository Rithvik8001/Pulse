"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { useAiQuota } from "@/components/product/ai-quota";
import { AssistantMessage } from "@/components/product/assistant/assistant-message";
import {
  type ConfirmationState,
  isToolPart,
  type ParsedProposal,
  type ProposalAction,
} from "@/components/product/assistant/assistant-proposals";
import { Pip } from "@/components/product/pip";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { aiChatMaxUserTextChars } from "@/lib/pulse/ai-limits-core";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function errorText(error: Error) {
  const raw = error.message?.trim();
  if (!raw) return "Pip could not answer. Try again.";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    } catch {
    }
  }
  return raw;
}

export type AssistantSession = {
  clearError: () => void;
  confirmations: Record<string, ConfirmationState>;
  disabled: boolean;
  error: Error | undefined;
  input: string;
  isStreaming: boolean;
  messages: UIMessage[];
  regenerate: () => void;
  sendMessage: (message: { text: string }) => void;
  setConfirmations: React.Dispatch<React.SetStateAction<Record<string, ConfirmationState>>>;
  setInput: (value: string) => void;
  setMessages: (messages: UIMessage[]) => void;
  startConfirming: (callback: () => void) => void;
  stop: () => void;
};

export type AssistantPaneConfig = {
  api: string;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
};

export function useAssistantChat(api: string): AssistantSession {
  const [input, setInput] = useState("");
  const [confirmations, setConfirmations] = useState<Record<string, ConfirmationState>>({});
  const [isConfirming, startConfirming] = useTransition();
  const transport = useMemo(() => new DefaultChatTransport({ api }), [api]);
  const { refresh: refreshAiQuota } = useAiQuota();
  const { clearError, error, messages, regenerate, sendMessage, setMessages, status, stop } =
    useChat({
      transport,
      experimental_throttle: 80,
      onFinish: refreshAiQuota,
      onError: refreshAiQuota,
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

export function AssistantPane({
  config,
  confirmAction,
  session,
  empty,
  onReset,
}: {
  config: AssistantPaneConfig;
  confirmAction: (action: ProposalAction) => Promise<{ status: "success" | "error"; message: string }>;
  session: AssistantSession;
  empty: React.ReactNode;
  onReset: () => void;
}) {
  const router = useRouter();
  const { exhausted, exhaustedMessage } = useAiQuota();
  const hasMessages = session.messages.length > 0;
  const remainingChars = aiChatMaxUserTextChars - session.input.length;
  const logRef = React.useRef<HTMLDivElement>(null);

  const awaitingConfirmation = session.messages.some((message) =>
    message.parts.some(
      (part) =>
        isToolPart(part) && part.state === "output-available" && !session.confirmations[part.toolCallId],
    ),
  );

  React.useEffect(() => {
    const el = logRef.current;
    if (!el || !hasMessages) return;
    el.scrollTop = el.scrollHeight;
  }, [hasMessages, session.messages, session.isStreaming]);

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = session.input.trim();
    if (!text || session.isStreaming || exhausted || text.length > aiChatMaxUserTextChars) return;
    session.setInput("");
    void session.sendMessage({ text });
  }

  function confirmProposal(toolCallId: string, action: ProposalAction) {
    session.startConfirming(() => {
      void confirmAction(action).then((result) => {
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
        }
      });
    });
  }

  function cancelProposal(toolCallId: string) {
    session.setConfirmations((current) => ({
      ...current,
      [toolCallId]: { status: "canceled", message: "Cancelled. Nothing changed." },
    }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Pip"
        className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"
      >
        {!hasMessages ? (
          empty
        ) : (
          <div className="grid gap-4 py-1">
            <div className="flex justify-end">
              <Button variant="text" size="xs" onClick={onReset}>
                Start over
              </Button>
            </div>
            {session.messages.map((message) => (
              <AssistantMessage
                key={message.id}
                confirmations={session.confirmations}
                disabled={session.disabled}
                feature="assistant"
                message={message}
                parseProposal={config.parseProposal}
                proposalPendingText={config.proposalPendingText}
                onCancel={cancelProposal}
                onConfirm={confirmProposal}
              />
            ))}
            {session.isStreaming ? (
              <p className="flex items-center gap-2 type-small text-fg-3" aria-live="polite">
                <Pip size={20} className="motion-safe:animate-pip-bob" />
                Pip is thinking
              </p>
            ) : null}
          </div>
        )}
      </div>

      {session.error ? (
        <Notice tone="bad" action={{ label: "Try again", onClick: () => void session.regenerate() }}>
          {errorText(session.error)}
        </Notice>
      ) : null}

      <form className="grid gap-3" onSubmit={submitMessage}>
        <Field
          label="Message Pip"
          labelHidden
          hint={
            session.input.length > aiChatMaxUserTextChars * 0.8 ? (
              <span className={cn("tabular-nums", remainingChars < 0 && "text-bad")}>
                {session.input.length} of {aiChatMaxUserTextChars}
              </span>
            ) : undefined
          }
        >
          <Textarea
            autoGrow
            rows={2}
            className="max-h-40"
            maxLength={aiChatMaxUserTextChars}
            disabled={session.isStreaming || exhausted}
            placeholder="Ask Pip about your habits, or ask to change one"
            value={session.input}
            onChange={(event) => session.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("type-small", exhausted ? "text-bad" : "text-fg-3")}>
            {exhausted ? exhaustedMessage : "Nothing changes until you confirm."}
          </p>
          <div className="flex items-center gap-2">
            {session.isStreaming ? (
              <Button variant="secondary" size="sm" onClick={() => void session.stop()}>
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                variant={awaitingConfirmation ? "secondary" : "primary"}
                size="sm"
                disabled={exhausted}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
