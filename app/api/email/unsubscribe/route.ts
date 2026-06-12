import { NextResponse, type NextRequest } from "next/server";

import { unsubscribeProductEmails } from "@/lib/email/preferences";

export async function GET(request: NextRequest) {
  return handleUnsubscribe(request);
}

export async function POST(request: NextRequest) {
  return handleUnsubscribe(request);
}

async function handleUnsubscribe(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const preference = await unsubscribeProductEmails(token);

  if (!preference) {
    return new NextResponse(
      renderUnsubscribePage("This unsubscribe link is invalid."),
      {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 400,
      },
    );
  }

  return new NextResponse(
    renderUnsubscribePage("You are unsubscribed from Pulse product emails."),
    {
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

function renderUnsubscribePage(message: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pulse email preferences</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f7f5; color: #181512; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { width: 100%; max-width: 480px; background: white; border: 1px solid #e8e2dc; border-radius: 12px; padding: 28px; }
      p { color: #756f69; line-height: 1.6; }
      a { color: #bf4f1f; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <strong>Pulse</strong>
        <h1>Email preferences updated</h1>
        <p>${escapeHtml(message)}</p>
        <p><a href="/dashboard">Return to Pulse</a></p>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
