"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type PasswordResetRequestState,
  type PasswordUpdateState,
  updatePasswordAction,
} from "@/app/(auth)/auth/actions";
import { AuthDone, AuthFrame } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const initialState: PasswordResetRequestState = { status: "idle" };
  const [state, action] = useActionState(requestPasswordResetAction, initialState);
  const email = state.fields?.email ?? "";

  if (state.status === "success") {
    return <AuthDone message={state.message} email={email} />;
  }

  return (
    <AuthFrame title="Reset your password" lead="We will send a link to your email.">
      <form action={action} className="grid gap-5">
        <Field label="Email" error={state.errors?.email}>
          <Input
            autoComplete="email"
            defaultValue={email}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </Field>
        {state.message && state.status === "error" ? (
          <Notice tone="bad">{state.message}</Notice>
        ) : null}
        <SubmitButton variant="primary" fullWidth pendingLabel="Sending link">
          Send reset link
        </SubmitButton>
        <Button variant="text" fullWidth asChild>
          <Link href="/sign-in">
            <span className="text-fg-3">Remembered it?</span> Sign in
          </Link>
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ResetPasswordForm() {
  const initialState: PasswordUpdateState = { status: "idle" };
  const [state, action] = useActionState(updatePasswordAction, initialState);

  return (
    <AuthFrame title="Choose a new password" lead="Use at least 8 characters.">
      <form action={action} className="grid gap-5">
        <Field label="New password" error={state.errors?.password}>
          <Input autoComplete="new-password" name="password" required type="password" />
        </Field>
        <Field label="Confirm password" error={state.errors?.confirmPassword}>
          <Input autoComplete="new-password" name="confirmPassword" required type="password" />
        </Field>
        {state.message ? <Notice tone="bad">{state.message}</Notice> : null}
        <SubmitButton variant="primary" fullWidth pendingLabel="Saving password">
          Save password
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}
