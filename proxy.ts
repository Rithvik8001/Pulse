import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const authRoutes = new Set(["/sign-in", "/sign-up", "/forgot-password"]);

function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { isAuthenticated, response } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === "/" && isAuthenticated) {
    return redirectWithSessionCookies(
      new URL("/dashboard", request.url),
      response,
    );
  }

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return redirectWithSessionCookies(redirectUrl, response);
  }

  if (authRoutes.has(pathname) && isAuthenticated) {
    return redirectWithSessionCookies(
      new URL("/dashboard", request.url),
      response,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ],
};
