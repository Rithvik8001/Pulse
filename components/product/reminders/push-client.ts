"use client";

import { useCallback, useEffect, useState } from "react";

import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/app/dashboard/settings/actions";

export type PushSupport =
  | "checking"
  | "unsupported"
  | "ios-needs-install"
  | "denied"
  | "default"
  | "granted";

const endpointKey = "pulse-push-endpoint";

function readStoredEndpoint() {
  try {
    return window.localStorage.getItem(endpointKey);
  } catch {
    return null;
  }
}

function storeEndpoint(endpoint: string | null) {
  try {
    if (endpoint) window.localStorage.setItem(endpointKey, endpoint);
    else window.localStorage.removeItem(endpointKey);
  } catch {
    return;
  }
}

function isIos() {
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || legacy === true;
}

function detectSupport(): PushSupport {
  const hasApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  if (isIos() && !isStandalone()) return "ios-needs-install";
  if (!hasApis) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" ? "granted" : "default";
}

function decodeKey(base64: string) {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

async function getRegistration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

function toInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}

export async function enablePush(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      status: "error" as const,
      support: (permission === "denied" ? "denied" : "default") as PushSupport,
      message:
        permission === "denied"
          ? "Notifications are blocked. Allow them in your browser's site settings, then reload."
          : "Reminders stay off until you allow notifications.",
    };
  }

  try {
    const registration = await getRegistration();
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      }));
    const result = await savePushSubscriptionAction(toInput(subscription));

    if (result.status === "error") {
      return { status: "error" as const, support: "granted" as PushSupport, message: result.message };
    }

    storeEndpoint(subscription.endpoint);
    return { status: "success" as const, support: "granted" as PushSupport };
  } catch {
    return {
      status: "error" as const,
      support: "granted" as PushSupport,
      message: "This browser could not turn on reminders. Reload and try again.",
    };
  }
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint ?? readStoredEndpoint();

  if (subscription) await subscription.unsubscribe();
  if (endpoint) await removePushSubscriptionAction(endpoint);
  storeEndpoint(null);
}

export function usePushDevice(serverEndpoints: string[]) {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const endpointsKey = serverEndpoints.join("\n");

  const refresh = useCallback(async () => {
    const next = detectSupport();
    setSupport(next);

    if (next !== "granted" && next !== "default") {
      setSubscribed(false);
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    const known = endpointsKey.split("\n").filter(Boolean);
    const stored = readStoredEndpoint();

    if (!subscription) {
      if (stored && known.includes(stored)) await removePushSubscriptionAction(stored);
      storeEndpoint(null);
      setSubscribed(false);
      return;
    }

    if (!known.includes(subscription.endpoint)) {
      const result = await savePushSubscriptionAction(toInput(subscription));
      if (result.status === "error") {
        setSubscribed(false);
        return;
      }
    }

    storeEndpoint(subscription.endpoint);
    setSubscribed(true);
  }, [endpointsKey]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => (cancelled ? undefined : refresh()));
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { support, subscribed, setSupport, setSubscribed, refresh };
}
