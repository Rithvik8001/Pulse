import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { passwordResetIntentCookie } from "@/lib/auth/auth-core";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose new password · Pulse",
  description: "Choose a new password for your Pulse account.",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims ||
    cookieStore.get(passwordResetIntentCookie)?.value !== "1"
  ) {
    redirect("/forgot-password");
  }

  return <ResetPasswordForm />;
}
