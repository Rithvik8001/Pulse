import "server-only";

import { and, eq, sql } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";

import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { logInfo, logWarn } from "@/lib/observability/logger";
import {
  describeDevice,
  type PushSubscriptionInput,
  type ReminderPayload,
} from "@/lib/pulse/reminders-core";

const maxFailures = 5;

let configured = false;

export function hasPushKeys() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureWebPush() {
  if (configured) return true;
  if (!hasPushKeys()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;

  return true;
}

export type PushSendResult = {
  sent: number;
  removed: number;
  failed: number;
};

export async function sendPushToUser(
  userId: string,
  payload: ReminderPayload,
  options: { ttl: number; topic: string },
): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, removed: 0, failed: 0 };
  if (!configureWebPush()) return result;

  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  const body = JSON.stringify(payload);

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: options.ttl, topic: options.topic, urgency: "normal" },
        );
        result.sent += 1;
        await db
          .update(pushSubscriptions)
          .set({ failureCount: 0, lastSuccessAt: new Date(), updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, row.id));
      } catch (error) {
        const status = error instanceof WebPushError ? error.statusCode : null;
        const expired = status === 404 || status === 410;

        if (expired || row.failureCount + 1 >= maxFailures) {
          result.removed += 1;
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
          logInfo({
            event: "push_subscription_removed",
            message: "Removed a push subscription that can no longer receive reminders.",
            feature: "reminders",
            userId,
            metadata: { status, expired },
          });
          return;
        }

        result.failed += 1;
        await db
          .update(pushSubscriptions)
          .set({
            failureCount: sql`${pushSubscriptions.failureCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(pushSubscriptions.id, row.id));
        logWarn({
          event: "reminder_push_failed",
          message: "Sending a push notification failed.",
          feature: "reminders",
          userId,
          error,
          metadata: { status },
        });
      }
    }),
  );

  return result;
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent: string | null,
) {
  const now = new Date();

  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceLabel: describeDevice(userAgent),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceLabel: describeDevice(userAgent),
        failureCount: 0,
        updatedAt: now,
      },
    });
}

export async function replacePushSubscription(
  oldEndpoint: string,
  subscription: PushSubscriptionInput,
) {
  const [row] = await db
    .update(pushSubscriptions)
    .set({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      failureCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(pushSubscriptions.endpoint, oldEndpoint))
    .returning({ id: pushSubscriptions.id });

  return Boolean(row);
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function listPushDevices(userId: string) {
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      deviceLabel: pushSubscriptions.deviceLabel,
      lastSuccessAt: pushSubscriptions.lastSuccessAt,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(pushSubscriptions.createdAt);
}
