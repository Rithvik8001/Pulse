import "server-only";

import type { ReactElement } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailDeliveries, type EmailDeliveryType } from "@/lib/db/schema";
import { buildUnsubscribeUrl } from "@/lib/email/email-core";
import {
  getProductEmailFrom,
  getResendClient,
  getSiteUrl,
} from "@/lib/email/resend";

type ProductEmailInput = {
  userId: string;
  type: EmailDeliveryType;
  dedupeKey: string;
  to: string;
  subject: string;
  react: ReactElement;
  unsubscribeToken: string;
};

export type ProductEmailResult =
  | { status: "sent"; resendId: string | null }
  | { status: "skipped"; reason: "duplicate" }
  | { status: "error"; error: string };

export async function sendProductEmail(
  input: ProductEmailInput,
): Promise<ProductEmailResult> {
  const reserved = await reserveDelivery(input);

  if (!reserved) {
    return { status: "skipped", reason: "duplicate" };
  }

  try {
    const resend = getResendClient();
    const unsubscribeUrl = buildUnsubscribeUrl(
      getSiteUrl(),
      input.unsubscribeToken,
    );
    const { data, error } = await resend.emails.send(
      {
        from: getProductEmailFrom(),
        to: input.to,
        subject: input.subject,
        react: input.react,
        replyTo: process.env.EMAIL_REPLY_TO,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      {
        headers: {
          "Idempotency-Key": input.dedupeKey,
        },
      },
    );

    if (error) {
      await markDeliveryError(reserved.id, error.message);
      return { status: "error", error: error.message };
    }

    const resendId = data?.id ?? null;
    await db
      .update(emailDeliveries)
      .set({
        resendId,
        status: "sent",
        updatedAt: new Date(),
      })
      .where(eq(emailDeliveries.id, reserved.id));

    return { status: "sent", resendId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    await markDeliveryError(reserved.id, message);

    return { status: "error", error: message };
  }
}

async function reserveDelivery(input: ProductEmailInput) {
  const [existing] = await db
    .select({
      id: emailDeliveries.id,
      status: emailDeliveries.status,
    })
    .from(emailDeliveries)
    .where(eq(emailDeliveries.dedupeKey, input.dedupeKey))
    .limit(1);

  if (existing) {
    if (existing.status !== "error") {
      return null;
    }

    const [reserved] = await db
      .update(emailDeliveries)
      .set({
        recipient: input.to,
        status: "pending",
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(emailDeliveries.id, existing.id))
      .returning({ id: emailDeliveries.id });

    return reserved ?? null;
  }

  const [reserved] = await db
    .insert(emailDeliveries)
    .values({
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey,
      recipient: input.to,
      status: "pending",
      updatedAt: new Date(),
    })
    .onConflictDoNothing({
      target: emailDeliveries.dedupeKey,
    })
    .returning({ id: emailDeliveries.id });

  return reserved ?? null;
}

async function markDeliveryError(deliveryId: string, error: string) {
  await db
    .update(emailDeliveries)
    .set({
      status: "error",
      error,
      updatedAt: new Date(),
    })
    .where(eq(emailDeliveries.id, deliveryId));
}
