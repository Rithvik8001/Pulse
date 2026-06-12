"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cookies } from "next/headers";

import {
  buildAuthRedirectOrigin,
  isValidEmail,
  normalizeEmail,
  normalizePassword,
  passwordResetIntentCookie,
  passwordMinLength,
  safeRedirectPath,
  validatePasswordUpdate,
} from "@/lib/auth/auth-core";
import { syncEmailPreference } from "@/lib/email/preferences";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fields?: {
    email?: string;
    next?: string;
  };
  errors?: {
    email?: string;
    password?: string;
  };
};

export type PasswordResetRequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  fields?: {
    email?: string;
  };
  errors?: {
    email?: string;
  };
};

export type PasswordUpdateState = {
  status: "idle" | "error";
  message?: string;
  errors?: {
    password?: string;
    confirmPassword?: string;
  };
};

function validateCredentials(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizePassword(formData.get("password"));
  const errors: AuthFormState["errors"] = {};

  if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (password.length < passwordMinLength) {
    errors.password = `Use at least ${passwordMinLength} characters.`;
  }

  return {
    email,
    password,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

async function getSiteOrigin() {
  const headerStore = await headers();

  return buildAuthRedirectOrigin({
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

export async function signInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeRedirectPath(formData.get("next"));
  const { email, password, errors, isValid } = validateCredentials(formData);

  if (!isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: { email, next },
      errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: "error",
      message: "We could not sign you in with those credentials.",
      fields: { email, next },
    };
  }

  const { data } = await supabase.auth.getClaims();
  if (
    typeof data?.claims?.sub === "string" &&
    typeof data.claims.email === "string"
  ) {
    await syncEmailPreference(data.claims.sub, data.claims.email);
  }

  redirect(next);
}

export async function signUpAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, errors, isValid } = validateCredentials(formData);

  if (!isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: { email },
      errors,
    };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "We could not create an account with those credentials.",
      fields: { email },
    };
  }

  await supabase.auth.signOut();

  return {
    status: "success",
    message: "Check your email to confirm your account before signing in.",
    fields: { email },
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function requestPasswordResetAction(
  _state: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = normalizeEmail(formData.get("email"));

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Enter the email address for your Pulse account.",
      fields: { email },
      errors: {
        email: "Enter a valid email address.",
      },
    };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return {
      status: "error",
      message: "We could not send a reset link right now. Try again soon.",
      fields: { email },
    };
  }

  return {
    status: "success",
    message:
      "If that email has a Pulse account, a password reset link is on the way.",
    fields: { email },
  };
}

export async function updatePasswordAction(
  _state: PasswordUpdateState,
  formData: FormData,
): Promise<PasswordUpdateState> {
  const cookieStore = await cookies();

  if (cookieStore.get(passwordResetIntentCookie)?.value !== "1") {
    return {
      status: "error",
      message: "Request a new password reset link before updating.",
    };
  }

  const parsed = validatePasswordUpdate(
    formData.get("password"),
    formData.get("confirmPassword"),
  );

  if (!parsed.isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.password,
  });

  if (error) {
    return {
      status: "error",
      message: "We could not update your password. Request a new reset link.",
    };
  }

  await supabase.auth.signOut();
  cookieStore.delete(passwordResetIntentCookie);
  redirect("/sign-in?reset=success");
}
