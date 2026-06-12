import { NextResponse, type NextRequest } from "next/server";

import { syncEmailPreference } from "@/lib/email/preferences";
import {
  passwordResetIntentCookie,
  safeRedirectPath,
} from "@/lib/auth/auth-core";
import { createClient } from "@/lib/supabase/server";

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

      const response = NextResponse.redirect(new URL(next, request.url));

      if (next === "/reset-password") {
        response.cookies.set(passwordResetIntentCookie, "1", {
          httpOnly: true,
          maxAge: 10 * 60,
          path: "/",
          sameSite: "lax",
          secure: requestUrl.protocol === "https:",
        });
      }

      return response;
    }
  }

  return NextResponse.redirect(new URL("/sign-in", request.url));
}
