"use client";

import type { UIMessage } from "ai";
import { Check } from "@phosphor-icons/react";

import {
  type ConfirmationState,
  type ParsedProposal,
  type ProposalAction,
  redactPrivateIdentifiers,
} from "@/components/product/assistant/assistant-proposals";
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
  parseProposal,
  part,
  pendingText,
}: {
  confirmation: ConfirmationState | undefined;
  disabled: boolean;
  feature: Feature;
  onCancel: (toolCallId: string) => void;
  onConfirm: (toolCallId: string, action: ProposalAction) => void;
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

  return (
    <div
      className={cn(
        "grid w-full max-w-measure gap-3 rounded-notice bg-fill p-4",
        isConfirmed && "bg-ok-bg",
      )}
    >
      <div className="flex items-start gap-3">
        {isConfirmed ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-inner bg-ok text-on-brand">
            <Check size={20} weight="bold" aria-hidden />
          </span>
        ) : (
          <FeatureChip feature={feature} />
        )}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="type-body font-medium">
              {redactPrivateIdentifiers(proposal.title)}
            </span>
            <span
              className={cn(
                "type-small",
                isConfirmed ? "text-ok" : proposal.destructive ? "text-bad" : "text-fg-3",
              )}
            >
              {isConfirmed ? "Confirmed" : proposal.actionLabel}
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
            isConfirmed && "text-ok",
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
