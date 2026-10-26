"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Icon } from "@phosphor-icons/react";

import { AssistantMessage } from "@/components/product/assistant/assistant-message";
import {
  type ConfirmationState,
  isToolPart,
  type ParsedProposal,
  type ProposalAction,
} from "@/components/product/assistant/assistant-proposals";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature } from "@/components/ui/features";
import { Field, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { toast } from "@/components/ui/toast";

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
  setConfirmations: React.Dispatch<
    React.SetStateAction<Record<string, ConfirmationState>>
  >;
  setInput: (value: string) => void;
  setMessages: (messages: UIMessage[]) => void;
  startConfirming: (callback: () => void) => void;
  stop: () => void;
};

export type AssistantPaneConfig = {
  api: string;
  feature: Feature;
  emptyDescription: string;
  emptyIcon: Icon;
  emptyTitle: string;
  inputPlaceholder: string;
  label: string;
  mutationNotice: string;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
  starterPrompts: string[];
  streamingText: string;
};

export function useAssistantChat(api: string): AssistantSession {
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

export function AssistantPane({
  config,
  confirmAction,
  session,
}: {
  config: AssistantPaneConfig;
  confirmAction: (
    action: ProposalAction,
  ) => Promise<{ status: "success" | "error"; message: string }>;
  session: AssistantSession;
}) {
  const router = useRouter();
  const hasMessages = session.messages.length > 0;
  const logRef = React.useRef<HTMLDivElement>(null);

  // A proposal waiting on the user takes the primary slot from Send.
  const awaitingConfirmation = session.messages.some((message) =>
    message.parts.some(
      (part) =>
        isToolPart(part) &&
        part.state === "output-available" &&
        !session.confirmations[part.toolCallId],
    ),
  );

  // Keep the latest message in view, but leave the empty state at the top.
  React.useEffect(() => {
    const el = logRef.current;
    if (!el || !hasMessages) return;
    el.scrollTop = el.scrollHeight;
  }, [hasMessages, session.messages, session.isStreaming]);

  function submitPrompt(prompt: string) {
    void session.sendMessage({ text: prompt });
  }

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = session.input.trim();
    if (!text || session.isStreaming) return;
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
      [toolCallId]: {
        status: "canceled",
        message: "Cancelled. Nothing was changed.",
      },
    }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={`${config.label} conversation`}
        className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"
      >
        {!hasMessages ? (
          <div className="grid gap-4 py-1">
            <div className="grid justify-items-center gap-3 text-center">
              <FeatureChip feature={config.feature} size="lg" />
              <div className="grid gap-1">
                <h3 className="type-subhead">{config.emptyTitle}</h3>
                <p className="mx-auto max-w-lead type-caption text-fg-2">
                  {config.emptyDescription}
                </p>
              </div>
            </div>
            <ul className="grid list-none p-0 [&>*+*]:hairline">
              {config.starterPrompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="-mx-3 flex min-h-control w-[calc(100%+1.5rem)] items-center rounded-row px-3 py-2.5 text-left type-body font-medium outline-none transition-colors duration-(--dur-1) hover:bg-fill"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-4 py-1">
            <div className="flex justify-end">
              <Button variant="text" size="xs" onClick={clearChat}>
                Clear conversation
              </Button>
            </div>
            {session.messages.map((message) => (
              <AssistantMessage
                key={message.id}
                confirmations={session.confirmations}
                disabled={session.disabled}
                feature={config.feature}
                message={message}
                parseProposal={config.parseProposal}
                proposalPendingText={config.proposalPendingText}
                onCancel={cancelProposal}
                onConfirm={confirmProposal}
              />
            ))}
            {session.isStreaming ? (
              <p className="type-small text-fg-3" aria-live="polite">
                {config.streamingText}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {session.error ? (
        <Notice
          tone="bad"
          action={{ label: "Try again", onClick: () => void session.regenerate() }}
        >
          {session.error.message || `The ${config.label.toLowerCase()} could not respond.`}
        </Notice>
      ) : null}

      <form className="grid gap-3" onSubmit={submitMessage}>
        <Field label={`Message ${config.label.toLowerCase()}`} labelHidden>
          <Textarea
            autoGrow
            rows={2}
            className="max-h-40"
            disabled={session.isStreaming}
            placeholder={config.inputPlaceholder}
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
          <p className="type-small text-fg-3">{config.mutationNotice}</p>
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
