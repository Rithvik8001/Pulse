import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const authRoutes = new Set(["/sign-in", "/sign-up"]);

export async function proxy(request: NextRequest) {
  const { isAuthenticated, response } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(redirectUrl);
  }

  if (authRoutes.has(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
