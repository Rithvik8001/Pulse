import { NextResponse, type NextRequest } from "next/server";

import { syncEmailPreference } from "@/lib/email/preferences";
import { createClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data } = await supabase.auth.getClaims();
      if (
        typeof data?.claims?.sub === "string" &&
        typeof data.claims.email === "string"
      ) {
        await syncEmailPreference(data.claims.sub, data.claims.email);
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in", request.url));
}
