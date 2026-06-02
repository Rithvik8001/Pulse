import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export type AuthState = {
  isAuthenticated: boolean;
  response: NextResponse;
};

export async function updateSession(request: NextRequest): Promise<AuthState> {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  return {
    isAuthenticated: Boolean(data?.claims && !error),
    response,
  };
}
