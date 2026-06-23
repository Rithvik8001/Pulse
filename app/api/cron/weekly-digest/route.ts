import { NextResponse, type NextRequest } from "next/server";

import {
  createRequestId,
  logInfo,
  logWarn,
} from "@/lib/observability/logger";
import { sendWeeklyDigestBatch } from "@/lib/email/weekly-digest";

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request.headers);

  if (!isAuthorizedCronRequest(request)) {
    logWarn({
      event: "cron_unauthorized",
      message: "Unauthorized weekly digest cron request.",
      route: "/api/cron/weekly-digest",
      requestId,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigestBatch();
  logInfo({
    event: "weekly_digest_cron_completed",
    message: "Weekly digest cron completed.",
    route: "/api/cron/weekly-digest",
    requestId,
    metadata: result,
  });

  return NextResponse.json(result);
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return authorization === `Bearer ${secret}` || querySecret === secret;
}
