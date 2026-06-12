"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

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

const passwordMinLength = 8;

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePassword(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

async function getSiteOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const requestOrigin = host ? `${protocol}://${host}` : null;
  const isLocalRequest =
    host?.startsWith("localhost") ||
    host?.startsWith("127.0.0.1") ||
    host?.startsWith("192.168.");

  if (requestOrigin && isLocalRequest) {
    return requestOrigin;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  return requestOrigin ?? "http://localhost:3000";
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
