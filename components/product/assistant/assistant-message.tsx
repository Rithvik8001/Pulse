"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AssistantProposalCard } from "@/components/product/assistant/assistant-proposal-card";
import {
  type ConfirmationState,
  isToolPart,
  type ParsedProposal,
  type ProposalAction,
  redactPrivateIdentifiers,
} from "@/components/product/assistant/assistant-proposals";
import { cn } from "@/lib/utils";

export function AssistantMessage({
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
            <AssistantProposalCard
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
