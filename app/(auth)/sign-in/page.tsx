import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { isResetSuccessParam, safeRedirectPath } from "@/lib/auth/auth-core";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in · Pulse",
  description: "Sign in to your Pulse dashboard.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <AuthForm
      mode="sign-in"
      nextPath={safeRedirectPath(params.next)}
      resetSuccess={isResetSuccessParam(params.reset)}
    />
  );
}
