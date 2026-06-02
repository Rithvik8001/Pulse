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
  type AuthFormState,
  signInAction,
  signUpAction,
} from "@/app/(auth)/auth/actions";
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

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  nextPath?: string;
};

const copy = {
  "sign-in": {
    title: "Sign in",
    description: "Return to your Character, Quests, and Momentum.",
    submit: "Sign in",
    pending: "Signing in",
    footerText: "New to Pulse?",
    footerHref: "/sign-up",
    footerAction: "Create account",
  },
  "sign-up": {
    title: "Create account",
    description: "Start saving proof once your email is confirmed.",
    submit: "Create account",
    pending: "Creating account",
    footerText: "Already have an account?",
    footerHref: "/sign-in",
    footerAction: "Sign in",
  },
} as const;

export function AuthForm({ mode, nextPath = "/dashboard" }: AuthFormProps) {
  const initialState: AuthFormState = {
    status: "idle",
    fields: {
      next: nextPath,
    },
  };
  const [state, action, pending] = useActionState(
    mode === "sign-in" ? signInAction : signUpAction,
    initialState,
  );
  const labels = copy[mode];
  const email = state.fields?.email ?? "";
  const next = state.fields?.next ?? nextPath;

  if (mode === "sign-up" && state.status === "success") {
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
          <CardTitle className="text-lg">{labels.title}</CardTitle>
          <CardDescription className="mx-auto max-w-[31ch] text-center text-sm/relaxed">
            {labels.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <input type="hidden" name="next" value={next} />
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
            <Field
              icon={AiLockIcon}
              label="Password"
              error={state.errors?.password}
            >
              <Input
                aria-invalid={Boolean(state.errors?.password)}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                className="h-10 pl-9 text-sm"
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
            </Field>
            {state.message ? (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-xs/relaxed",
                  state.status === "error"
                    ? "border-destructive/25 bg-destructive/5 text-destructive"
                    : "border-primary/25 bg-primary/5 text-primary",
                )}
              >
                {state.message}
              </div>
            ) : null}
            <Button
              className="h-10 w-full text-sm"
              disabled={pending}
              type="submit"
            >
              {pending ? labels.pending : labels.submit}
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={15}
                strokeWidth={1.8}
              />
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {labels.footerText}{" "}
            <Link className="font-medium text-primary" href={labels.footerHref}>
              {labels.footerAction}
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#fafafa_100%)] px-5 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(#ececed_1px,transparent_1px),linear-gradient(90deg,#ececed_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(ellipse_72%_64%_at_50%_42%,#000_28%,transparent_78%)]"
      />
      <div className="relative w-full max-w-[440px]">
        {children}
      </div>
    </main>
  );
}

function Field({
  children,
  error,
  icon,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <span className="relative block">
        <HugeiconsIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          icon={icon}
          size={15}
          strokeWidth={1.7}
        />
        {children}
      </span>
      {error ? (
        <span className="block text-xs text-destructive">{error}</span>
      ) : null}
    </label>
  );
}
