"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, RefreshIcon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { AssistantMessage } from "@/components/product/assistant/assistant-message";
import {
  type ConfirmationState,
  type ParsedProposal,
  type ProposalAction,
} from "@/components/product/assistant/assistant-proposals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  emptyDescription: string;
  emptyIcon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  emptyTitle: string;
  inputPlaceholder: string;
  label: string;
  mutationNotice: string;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
  starterIcon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
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
        <div className="text-xs font-medium text-muted-foreground">
          {config.label}
        </div>
        {hasMessages ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Clear ${config.label} chat`}
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
              <HugeiconsIcon
                icon={config.emptyIcon}
                size={22}
                strokeWidth={1.7}
              />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">
                {config.emptyTitle}
              </h3>
              <p className="mx-auto mt-1 max-w-[34ch] text-xs/relaxed text-muted-foreground">
                {config.emptyDescription}
              </p>
            </div>
            <div className="grid gap-2">
              {config.starterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                  onClick={() => submitPrompt(prompt)}
                >
                  {config.starterIcon ? (
                    <HugeiconsIcon
                      icon={config.starterIcon}
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
                parseProposal={config.parseProposal}
                proposalPendingText={config.proposalPendingText}
                onCancel={cancelProposal}
                onConfirm={confirmProposal}
              />
            ))}
            {session.isStreaming ? (
              <div className="justify-self-start rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {config.streamingText}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {session.error ? (
        <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {session.error.message || `${config.label} could not respond.`}
        </div>
      ) : null}

      <form className="grid gap-2 border-t p-3" onSubmit={submitMessage}>
        <Textarea
          aria-label={`Message ${config.label}`}
          className="max-h-28 min-h-16 resize-none text-sm"
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {config.mutationNotice}
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
