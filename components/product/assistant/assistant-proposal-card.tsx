"use client";

import type { UIMessage } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ConfirmationState,
  type ParsedProposal,
  type ProposalAction,
  redactPrivateIdentifiers,
} from "@/components/product/assistant/assistant-proposals";
import { cn } from "@/lib/utils";

export function AssistantProposalCard({
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
