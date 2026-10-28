"use client";

import * as React from "react";

import { getAiQuotaAction } from "@/app/dashboard/actions";
import { Tip } from "@/components/ui/tooltip";
import type { AiQuota } from "@/lib/pulse/ai-limits-core";
import { cn } from "@/lib/utils";

type AiQuotaContextValue = {
  quota: AiQuota | null;
  refresh: () => void;
};

const AiQuotaContext = React.createContext<AiQuotaContextValue>({
  quota: null,
  refresh: () => {},
});

const lowQuotaThreshold = 5;

export function AiQuotaProvider({
  initialQuota,
  children,
}: {
  initialQuota: AiQuota | null;
  children: React.ReactNode;
}) {
  const [quota, setQuota] = React.useState(initialQuota);

  const refresh = React.useCallback(() => {
    void getAiQuotaAction()
      .then(setQuota)
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!quota) return;
    const delay = new Date(quota.resetAt).getTime() - Date.now();
    if (delay <= 0) return refresh();
    const timer = window.setTimeout(refresh, Math.min(delay + 1000, 2 ** 31 - 1));
    return () => window.clearTimeout(timer);
  }, [quota, refresh]);

  const value = React.useMemo(() => ({ quota, refresh }), [quota, refresh]);

  return <AiQuotaContext.Provider value={value}>{children}</AiQuotaContext.Provider>;
}

export function useAiQuota() {
  const { quota, refresh } = React.useContext(AiQuotaContext);
  const exhausted = quota !== null && quota.remaining <= 0;

  return {
    quota,
    refresh,
    exhausted,
    exhaustedMessage: quota ? aiQuotaExhaustedMessage(quota) : "",
  };
}

export function formatAiQuotaReset(quota: AiQuota) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(quota.resetAt),
  );
}

export function aiQuotaExhaustedMessage(quota: AiQuota) {
  return `You have used today's ${quota.limit} AI uses. They reset at ${formatAiQuotaReset(quota)}.`;
}

export function AiQuotaChip({ className }: { className?: string }) {
  const { quota } = useAiQuota();

  if (!quota) return null;

  const label = `${quota.remaining} of ${quota.limit} AI uses left today. Resets at ${formatAiQuotaReset(quota)}.`;
  const tone =
    quota.remaining <= 0 ? "bad" : quota.remaining <= lowQuotaThreshold ? "warn" : "neutral";

  return (
    <Tip label={label}>
      <span
        tabIndex={0}
        role="status"
        aria-label={label}
        className={cn(
          "inline-flex h-control-xs shrink-0 items-center rounded-pill px-2.5 type-small font-medium tabular-nums outline-none transition-colors duration-(--dur-1)",
          tone === "neutral" && "bg-fill text-fg-2",
          tone === "warn" && "bg-warn-bg text-warn",
          tone === "bad" && "bg-bad-bg text-bad",
          className,
        )}
      >
        {quota.remaining} left
      </span>
    </Tip>
  );
}

export function useRefreshAiQuotaOnChange(value: unknown) {
  const { refresh } = useAiQuota();
  const previous = React.useRef(value);

  React.useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    refresh();
  }, [value, refresh]);
}
