"use client";

import { useState } from "react";
import Link from "next/link";
import { BellSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  dismissReminderPromptAction,
  enableDailyReminderAction,
} from "@/app/dashboard/settings/actions";
import { enablePush, usePushDevice } from "@/components/product/reminders/push-client";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";

export function ReminderPromptRow({
  publicKey,
  minute,
  label,
}: {
  publicKey: string;
  minute: number;
  label: string;
}) {
  const { support } = usePushDevice([]);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden || support === "checking" || support === "unsupported" || support === "denied") {
    return null;
  }

  async function dismiss() {
    setHidden(true);
    await dismissReminderPromptAction();
  }

  async function turnOn() {
    setBusy(true);
    const push = await enablePush(publicKey);
    if (push.status === "error") {
      setBusy(false);
      toast.error(push.message);
      return;
    }

    const result = await enableDailyReminderAction(minute);
    setBusy(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    setHidden(true);
    toast.success(`Daily reminder set for ${label}. Change it in Settings.`);
  }

  return (
    <div className="-mx-3 flex items-center gap-4 rounded-inner bg-fill px-3 py-3.5 max-sm:flex-wrap">
      <FeatureChip feature="settings" icon={BellSimple} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="type-body font-medium">Get a reminder at {label}?</div>
        <div className="type-caption text-fg-2">
          {support === "ios-needs-install"
            ? "On iPhone, add Pulse to your Home Screen first."
            : "Only sent when a habit is still open."}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="text" size="sm" onClick={dismiss}>
          Not now
        </Button>
        {support === "ios-needs-install" ? (
          <Button size="sm" asChild>
            <Link href="/dashboard/settings#reminders">Show how</Link>
          </Button>
        ) : (
          <Button size="sm" onClick={turnOn} pending={busy} pendingLabel="Turning on">
            Turn on
          </Button>
        )}
      </div>
    </div>
  );
}
