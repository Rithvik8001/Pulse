import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  createRequestId,
  logError,
  logInfo,
  logWarn,
} from "@/lib/observability/logger";
import { sendReminderBatch } from "@/lib/pulse/reminders";

export const runtime = "nodejs";
export const maxDuration = 300;

const route = "/api/cron/reminders";
const budgetMs = 250_000;

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request.headers);

  if (!isAuthorizedCronRequest(request)) {
    logWarn({
      event: "cron_unauthorized",
      message: "Unauthorized reminders cron request.",
      route,
      requestId,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendReminderBatch({
      now: readNow(request),
      deadlineMs: Date.now() + budgetMs,
    });
    logInfo({
      event: "reminders_cron_completed",
      message: "Reminders cron completed.",
      route,
      requestId,
      metadata: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    logError({
      event: "reminders_cron_failed",
      message: "Reminders cron failed.",
      route,
      requestId,
      error,
    });
    return NextResponse.json({ error: "Reminders failed" }, { status: 500 });
  }
}

function readNow(request: NextRequest) {
  const override = request.nextUrl.searchParams.get("now");
  if (process.env.NODE_ENV === "production" || !override) return new Date();
  const parsed = new Date(override);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");

  return expected.length === received.length && timingSafeEqual(expected, received);
}
