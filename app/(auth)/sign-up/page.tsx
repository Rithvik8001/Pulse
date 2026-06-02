import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create account · Pulse",
  description: "Create your Pulse account.",
};

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return <AuthForm mode="sign-up" />;
}
