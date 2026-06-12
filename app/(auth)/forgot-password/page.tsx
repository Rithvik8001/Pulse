import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset password · Pulse",
  description: "Request a Pulse password reset link.",
};

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return <ForgotPasswordForm />;
}
