"use client";

import type { UIMessage } from "ai";

import {
  type ConfirmationState,
  formatConfirmedLine,
  type ParsedProposal,
  type ProposalAction,
  type ProposalTarget,
  redactPrivateIdentifiers,
} from "@/components/product/assistant/assistant-proposals";
import { Pip } from "@/components/product/pip";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import type { Feature } from "@/components/ui/features";
import { cn } from "@/lib/utils";

export function AssistantProposalCard({
  confirmation,
  disabled,
  feature,
  onCancel,
  onConfirm,
  onShow,
  parseProposal,
  part,
  pendingText,
}: {
  confirmation: ConfirmationState | undefined;
  disabled: boolean;
  feature: Feature;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: ProposalAction) => void;
  onShow: (target: ProposalTarget) => void;
  parseProposal: (output: unknown) => ParsedProposal | null;
  part: Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
  pendingText: string;
}) {
  const proposal = parseProposal(part.output);
  const isPending = part.state !== "output-available";

  if (isPending) {
    return <p className="type-small text-fg-3">{pendingText}</p>;
  }

  if (!proposal) return null;

  const isFinal = Boolean(confirmation);
  const isConfirmed = confirmation?.status === "confirmed";
  const isCanceled = confirmation?.status === "canceled";
  const isError = confirmation?.status === "error";

  if (isConfirmed) {
    const target = confirmation?.target;

    return (
      <div className="flex w-full max-w-measure items-center gap-3 rounded-notice bg-fill px-3 py-2.5">
        <Pip size={24} />
        <p className="min-w-0 flex-1 truncate type-small font-medium" aria-live="polite">
          {redactPrivateIdentifiers(formatConfirmedLine(proposal))}
        </p>
        {target ? (
          <Button size="xs" variant="text" onClick={() => onShow(target)}>
            Show
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="grid w-full max-w-measure gap-3 rounded-notice bg-fill p-4"
    >
      <div className="flex items-start gap-3">
        <FeatureChip feature={feature} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="type-body font-medium">
              {redactPrivateIdentifiers(proposal.title)}
            </span>
            <span
              className={cn(
                "type-small",
                proposal.destructive ? "text-bad" : "text-fg-3",
              )}
            >
              {proposal.actionLabel}
            </span>
          </div>
          <p className="type-caption text-fg-2">{redactPrivateIdentifiers(proposal.summary)}</p>
        </div>
      </div>

      {proposal.preview ? (
        <blockquote className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-inner bg-bg p-3 type-small text-ink">
          {proposal.preview}
        </blockquote>
      ) : null}

      {confirmation ? (
        <p
          aria-live="polite"
          className={cn(
            "type-small",
            isError && "text-bad",
            isCanceled && "text-fg-2",
          )}
        >
          {confirmation.message}
        </p>
      ) : null}

      {!isFinal || isError ? (
        <div className="flex flex-wrap justify-end gap-3">
          <Button disabled={disabled} size="sm" variant="text" onClick={() => onCancel(part.toolCallId)}>
            Cancel
          </Button>
          <Button
            disabled={disabled}
            size="sm"
            variant={proposal.destructive ? "destructive" : "primary"}
            onClick={() => onConfirm(part.toolCallId, proposal.action)}
          >
            {isError ? "Try again" : "Confirm"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
