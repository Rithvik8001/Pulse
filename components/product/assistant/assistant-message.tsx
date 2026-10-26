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
import type { Feature } from "@/components/ui/features";
import { cn } from "@/lib/utils";

export function AssistantMessage({
  confirmations,
  disabled,
  feature,
  message,
  onCancel,
  onConfirm,
  parseProposal,
  proposalPendingText,
}: {
  confirmations: Record<string, ConfirmationState>;
  disabled: boolean;
  feature: Feature;
  message: UIMessage;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: ProposalAction) => void;
  parseProposal: (output: unknown) => ParsedProposal | null;
  proposalPendingText: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("grid gap-2", isUser ? "justify-items-end" : "justify-items-start")}>
      {message.parts.map((part, index) => {
        if (part.type === "text" && part.text.trim()) {
          return isUser ? (
            <div
              key={`${message.id}-${index}`}
              className="max-w-[88%] rounded-row bg-fill-2 px-4 py-2.5 type-body whitespace-pre-wrap"
            >
              <span className="sr-only">You said </span>
              {part.text}
            </div>
          ) : (
            <div key={`${message.id}-${index}`} className="max-w-measure type-body">
              <span className="sr-only">Assistant said </span>
              <AssistantMarkdown text={part.text} />
            </div>
          );
        }

        if (isToolPart(part)) {
          return (
            <AssistantProposalCard
              key={`${message.id}-${index}`}
              confirmation={confirmations[part.toolCallId]}
              disabled={disabled}
              feature={feature}
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
        h1: ({ children }) => <h3 className="mb-2 type-heading">{children}</h3>,
        h2: ({ children }) => (
          <h3 className="mt-3 mb-2 type-subhead first:mt-0">{children}</h3>
        ),
        h3: ({ children }) => (
          <h4 className="mt-3 mb-1.5 type-body font-semibold first:mt-0">{children}</h4>
        ),
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="not-italic text-fg-2">{children}</em>,
        ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => (
          <ol className="my-2 ml-5 list-decimal space-y-1 tabular-nums">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-rule pl-3 text-fg-2">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded-key bg-fill px-1 py-0.5 type-small">{children}</code>
        ),
        a: ({ children, href }) => (
          <a
            className="font-medium text-brand-fg underline-offset-4 hover:underline"
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
