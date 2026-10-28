"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveReminderSettingsAction,
  sendTestReminderAction,
} from "@/app/dashboard/settings/actions";
import {
  disablePush,
  enablePush,
  usePushDevice,
} from "@/components/product/reminders/push-client";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { DetailRow, RowList } from "@/components/ui/row";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReminderSettingsValues } from "@/lib/pulse/reminders-core";

export type ReminderSlot = { value: number; label: string };

const stackOnPhone = "max-sm:flex-col max-sm:items-stretch";

export function RemindersSettings({
  publicKey,
  initialSettings,
  slots,
  devices,
  suggestion,
}: {
  publicKey: string | null;
  initialSettings: ReminderSettingsValues;
  slots: ReminderSlot[];
  devices: { endpoint: string; deviceLabel: string }[];
  suggestion: { typicalLabel: string; suggestedMinute: number; suggestedLabel: string } | null;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [testing, startTesting] = useTransition();
  const { support, subscribed, setSupport, setSubscribed } = usePushDevice(
    devices.map((device) => device.endpoint),
  );

  const labelFor = (minute: number) =>
    slots.find((slot) => slot.value === minute)?.label ?? "";
  const otherDevices = devices.length - (subscribed ? 1 : 0);
  const anyEnabled = settings.dailyEnabled || settings.eveningEnabled;

  async function save(next: ReminderSettingsValues) {
    const previous = settings;
    setSettings(next);
    const result = await saveReminderSettingsAction(next);
    if (result.status === "error") {
      setSettings(previous);
      toast.error(result.message);
    }
  }

  function changeDailyMinute(value: string) {
    const dailyMinute = Number(value);
    const eveningMinute =
      settings.eveningMinute > dailyMinute
        ? settings.eveningMinute
        : slots.find((slot) => slot.value > dailyMinute)?.value ?? settings.eveningMinute;
    if (eveningMinute <= dailyMinute) {
      toast.error("Pick an earlier daily time so the last call can come after it.");
      return;
    }
    void save({ ...settings, dailyMinute, eveningMinute });
  }

  async function turnOn() {
    if (!publicKey) return;
    setDeviceBusy(true);
    const result = await enablePush(publicKey);
    setDeviceBusy(false);
    setSupport(result.support);

    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    setSubscribed(true);
    if (!anyEnabled) {
      const dailyMinute = suggestion?.suggestedMinute ?? settings.dailyMinute;
      await save({
        ...settings,
        dailyEnabled: true,
        dailyMinute,
        eveningMinute: Math.max(settings.eveningMinute, dailyMinute + 15),
      });
      toast.success(`Reminders on. Daily reminder at ${labelFor(dailyMinute)}.`);
      return;
    }
    toast.success("Reminders on for this device");
  }

  async function turnOff() {
    setDeviceBusy(true);
    await disablePush();
    setDeviceBusy(false);
    setSubscribed(false);
    toast.success("Reminders off for this device");
  }

  function sendTest() {
    startTesting(async () => {
      const result = await sendTestReminderAction();
      if (result.status === "error") toast.error(result.message);
      else toast.success("Test reminder sent. It can take a few seconds to arrive.");
    });
  }

  const canUseDevice = publicKey !== null && (support === "default" || support === "granted");
  const deviceCaption =
    support === "checking"
      ? "Checking this browser"
      : subscribed
        ? "On for this device"
        : "Off for this device";
  const otherCaption =
    otherDevices > 0
      ? `. Also on ${otherDevices === 1 ? "1 other device" : `${otherDevices} other devices`}.`
      : ".";

  return (
    <div data-highlight-id="reminders" className="grid gap-3">
      <RowList>
        <DetailRow
          label="This device"
          caption={`${deviceCaption}${otherCaption}`}
          control={
            subscribed ? (
              <Button variant="text" onClick={turnOff} pending={deviceBusy} pendingLabel="Turning off">
                Turn off
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={turnOn}
                disabled={!canUseDevice}
                pending={deviceBusy}
                pendingLabel="Turning on"
              >
                Turn on
              </Button>
            )
          }
        />
        <DetailRow
          label="Daily reminder"
          caption="Only sent if a habit due today is still open."
          className={stackOnPhone}
          control={
            <>
              <Select
                label="Daily reminder time"
                labelHidden
                className="w-36 max-sm:flex-1"
                value={String(settings.dailyMinute)}
                onValueChange={changeDailyMinute}
                options={slots
                  .filter((slot) => slot.value < slots[slots.length - 1].value)
                  .map((slot) => ({ value: String(slot.value), label: slot.label }))}
              />
              <Switch
                aria-label="Daily reminder"
                checked={settings.dailyEnabled}
                onCheckedChange={(dailyEnabled) => void save({ ...settings, dailyEnabled })}
              />
            </>
          }
        />
        <DetailRow
          label="Last call"
          caption="A later reminder if something is still open. Pip writes it, using 1 of your daily AI uses."
          className={stackOnPhone}
          control={
            <>
              <Select
                label="Last call time"
                labelHidden
                className="w-36 max-sm:flex-1"
                value={String(settings.eveningMinute)}
                onValueChange={(value) => void save({ ...settings, eveningMinute: Number(value) })}
                options={slots
                  .filter((slot) => slot.value > settings.dailyMinute)
                  .map((slot) => ({ value: String(slot.value), label: slot.label }))}
              />
              <Switch
                aria-label="Last call"
                checked={settings.eveningEnabled}
                onCheckedChange={(eveningEnabled) => void save({ ...settings, eveningEnabled })}
              />
            </>
          }
        />
        {suggestion && suggestion.suggestedMinute !== settings.dailyMinute ? (
          <DetailRow
            label={`You usually check in around ${suggestion.typicalLabel}`}
            caption="A reminder a little earlier can help."
            control={
              <Button
                variant="text"
                onClick={() =>
                  void save({
                    ...settings,
                    dailyEnabled: true,
                    dailyMinute: suggestion.suggestedMinute,
                  })
                }
              >
                Use {suggestion.suggestedLabel}
              </Button>
            }
          />
        ) : null}
        <DetailRow
          label="Test reminder"
          caption="Check that reminders reach this device."
          control={
            <Button onClick={sendTest} disabled={!subscribed} pending={testing} pendingLabel="Sending">
              Send a test
            </Button>
          }
        />
      </RowList>
      <RemindersNotice
        publicKey={publicKey}
        support={support}
        subscribed={subscribed}
        anyEnabled={anyEnabled}
        hasDevices={devices.length > 0}
      />
    </div>
  );
}

function RemindersNotice({
  publicKey,
  support,
  subscribed,
  anyEnabled,
  hasDevices,
}: {
  publicKey: string | null;
  support: string;
  subscribed: boolean;
  anyEnabled: boolean;
  hasDevices: boolean;
}) {
  if (!publicKey) {
    return <Notice tone="warn">Reminders aren&apos;t set up on this server yet.</Notice>;
  }
  if (support === "ios-needs-install") {
    return (
      <Notice>
        To get reminders on iPhone or iPad, tap Share, then Add to Home Screen, then open Pulse
        from your Home Screen.
      </Notice>
    );
  }
  if (support === "unsupported") {
    return (
      <Notice>This browser can&apos;t show reminders. Try Chrome, Edge, Firefox or Safari.</Notice>
    );
  }
  if (support === "denied") {
    return (
      <Notice tone="warn">
        Notifications are blocked for this site. Allow them in your browser&apos;s site settings,
        then reload.
      </Notice>
    );
  }
  if (anyEnabled && !subscribed && !hasDevices) {
    return <Notice>Turn on this device to start getting reminders.</Notice>;
  }
  return (
    <Notice>
      Pulse sends at most two reminders a day, and none once everything due is checked in.
    </Notice>
  );
}
