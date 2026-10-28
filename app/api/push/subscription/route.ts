import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createRequestId, logWarn } from "@/lib/observability/logger";
import { replacePushSubscription } from "@/lib/pulse/push";
import { pushSubscriptionSchema } from "@/lib/pulse/reminders-core";

export const runtime = "nodejs";

const bodySchema = z.object({
  oldEndpoint: z.string().min(1).max(2048),
  subscription: pushSubscriptionSchema,
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    const replaced = await replacePushSubscription(
      parsed.data.oldEndpoint,
      parsed.data.subscription,
    );
    return NextResponse.json({ replaced }, { status: replaced ? 200 : 404 });
  } catch (error) {
    logWarn({
      event: "push_subscription_replace_failed",
      message: "Replacing a push subscription failed.",
      route: "/api/push/subscription",
      requestId: createRequestId(request.headers),
      error,
    });
    return NextResponse.json({ error: "Could not update subscription" }, { status: 500 });
  }
}
