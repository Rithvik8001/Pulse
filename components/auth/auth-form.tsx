"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";

import { type AuthFormState, signInAction, signUpAction } from "@/app/(auth)/auth/actions";
import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { TrayDone } from "@/components/ui/tray";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  nextPath?: string;
  resetSuccess?: boolean;
};

const copy = {
  "sign-in": {
    title: "Sign in",
    lead: "Pick up where you left off.",
    submit: "Sign in",
    pending: "Signing in",
    footerText: "New to Pulse?",
    footerHref: "/sign-up",
    footerAction: "Create an account",
  },
  "sign-up": {
    title: "Create an account",
    lead: "Start checking in once your email is confirmed.",
    submit: "Create account",
    pending: "Creating account",
    footerText: "Already have an account?",
    footerHref: "/sign-in",
    footerAction: "Sign in",
  },
} as const;

export function AuthFrame({
  title,
  lead,
  children,
}: {
  title?: React.ReactNode;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className="relative flex min-h-dvh flex-col bg-bg px-5 py-16 outline-none max-sm:px-4">
      <div className="absolute top-4 left-4">
        <IconButton label="Back to home" icon={ArrowLeft} asChild>
          <Link href="/" />
        </IconButton>
      </div>
      <div className="mx-auto grid w-full max-w-tray gap-8">
        <div className="grid justify-items-center gap-4 text-center">
          <Link href="/" aria-label="Pulse home" className="rounded-inner outline-none">
            <Mascot width={40} height={40} />
          </Link>
          {title ? (
            <div className="grid gap-2">
              <h1 className="type-title">{title}</h1>
              {lead ? <p className="type-body text-fg-2">{lead}</p> : null}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}

export function AuthDone({ message, email }: { message?: string; email: string }) {
  return (
    <AuthFrame>
      <TrayDone
        thumbnail={
          <span className="inline-flex size-14 items-center justify-center rounded-item bg-fill-2 text-fg-2">
            <EnvelopeSimple size={24} aria-hidden />
          </span>
        }
        heading="Email sent"
        meta={email}
      >
        {message ? <p className="max-w-lead type-body text-fg-2">{message}</p> : null}
      </TrayDone>
      <Button variant="text" fullWidth asChild>
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </AuthFrame>
  );
}

export function AuthForm({ mode, nextPath = "/dashboard", resetSuccess = false }: AuthFormProps) {
  const initialState: AuthFormState = { status: "idle", fields: { next: nextPath } };
  const [state, action] = useActionState(
    mode === "sign-in" ? signInAction : signUpAction,
    initialState,
  );
  const labels = copy[mode];
  const email = state.fields?.email ?? "";
  const next = state.fields?.next ?? nextPath;

  if (mode === "sign-up" && state.status === "success") {
    return <AuthDone message={state.message} email={email} />;
  }

  return (
    <AuthFrame title={labels.title} lead={labels.lead}>
      <form action={action} className="grid gap-5">
        <input type="hidden" name="next" value={next} />
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
        <Field
          label="Password"
          error={state.errors?.password}
          hint={mode === "sign-up" ? "At least 8 characters." : undefined}
        >
          <Input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            name="password"
            required
            type="password"
          />
        </Field>
        {resetSuccess && state.status === "idle" ? (
          <Notice tone="ok" role="status">
            Password updated. Sign in with your new password.
          </Notice>
        ) : null}
        {state.message ? (
          <Notice tone={state.status === "error" ? "bad" : "ok"}>{state.message}</Notice>
        ) : null}
        <SubmitButton variant="primary" fullWidth pendingLabel={labels.pending}>
          {labels.submit}
        </SubmitButton>
        <div className="grid gap-1">
          {mode === "sign-in" ? (
            <Button variant="text" fullWidth asChild>
              <Link href="/forgot-password">Forgot your password?</Link>
            </Button>
          ) : null}
          <Button variant="text" fullWidth asChild>
            <Link href={labels.footerHref}>
              <span className="text-fg-3">{labels.footerText}</span> {labels.footerAction}
            </Link>
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
