"use client";

import Link from "next/link";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiLockIcon,
  AiMail01Icon,
  ArrowRight02Icon,
  MailValidation01Icon,
} from "@hugeicons/core-free-icons";

import {
  requestPasswordResetAction,
  type PasswordResetRequestState,
  type PasswordUpdateState,
  updatePasswordAction,
} from "@/app/(auth)/auth/actions";
import { AuthFrame, Field } from "@/components/auth/auth-form";
import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const initialState: PasswordResetRequestState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const email = state.fields?.email ?? "";

  if (state.status === "success") {
    return (
      <AuthFrame>
        <Card className="w-full gap-7 rounded-lg px-2 py-7 shadow-sm">
          <CardHeader className="items-center justify-items-center text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon
                icon={MailValidation01Icon}
                size={21}
                strokeWidth={1.8}
              />
            </div>
            <CardTitle className="text-lg">Check your email</CardTitle>
            <CardDescription className="mx-auto max-w-[31ch] text-center text-sm/relaxed">
              {state.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/35 px-3 py-2 text-center text-xs text-muted-foreground">
              {email}
            </div>
            <Button asChild className="h-10 w-full text-sm">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Card className="w-full gap-7 rounded-lg px-2 py-7 shadow-sm">
        <CardHeader className="items-center justify-items-center text-center">
          <Link
            href="/"
            aria-label="Pulse"
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md"
          >
            <Mascot width={42} height={42} />
          </Link>
          <CardTitle className="text-lg">Reset password</CardTitle>
          <CardDescription className="mx-auto max-w-[31ch] text-center text-sm/relaxed">
            Send a reset link to the email for your Pulse account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <Field
              icon={AiMail01Icon}
              label="Email"
              error={state.errors?.email}
            >
              <Input
                aria-invalid={Boolean(state.errors?.email)}
                autoComplete="email"
                className="h-10 pl-9 text-sm"
                defaultValue={email}
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </Field>
            {state.message ? (
              <AuthMessage status={state.status}>{state.message}</AuthMessage>
            ) : null}
            <Button
              className="h-10 w-full text-sm"
              disabled={pending}
              type="submit"
            >
              {pending ? "Sending link" : "Send reset link"}
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={15}
                strokeWidth={1.8}
              />
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link className="font-medium text-primary" href="/sign-in">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

export function ResetPasswordForm() {
  const initialState: PasswordUpdateState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <AuthFrame>
      <Card className="w-full gap-7 rounded-lg px-2 py-7 shadow-sm">
        <CardHeader className="items-center justify-items-center text-center">
          <Link
            href="/"
            aria-label="Pulse"
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md"
          >
            <Mascot width={42} height={42} />
          </Link>
          <CardTitle className="text-lg">Choose a new password</CardTitle>
          <CardDescription className="mx-auto max-w-[31ch] text-center text-sm/relaxed">
            Create a new password for your Pulse account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <Field
              icon={AiLockIcon}
              label="New password"
              error={state.errors?.password}
            >
              <Input
                aria-invalid={Boolean(state.errors?.password)}
                autoComplete="new-password"
                className="h-10 pl-9 text-sm"
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
            </Field>
            <Field
              icon={AiLockIcon}
              label="Confirm password"
              error={state.errors?.confirmPassword}
            >
              <Input
                aria-invalid={Boolean(state.errors?.confirmPassword)}
                autoComplete="new-password"
                className="h-10 pl-9 text-sm"
                name="confirmPassword"
                placeholder="Repeat your password"
                required
                type="password"
              />
            </Field>
            {state.message ? (
              <AuthMessage status={state.status}>{state.message}</AuthMessage>
            ) : null}
            <Button
              className="h-10 w-full text-sm"
              disabled={pending}
              type="submit"
            >
              {pending ? "Updating password" : "Update password"}
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={15}
                strokeWidth={1.8}
              />
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

function AuthMessage({
  children,
  status,
}: {
  children: React.ReactNode;
  status: "idle" | "success" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs/relaxed",
        status === "error"
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "border-primary/25 bg-primary/5 text-primary",
      )}
    >
      {children}
    </div>
  );
}
