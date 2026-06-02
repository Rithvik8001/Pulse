import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Home01Icon,
  Logout03Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { signOutAction } from "@/app/(auth)/auth/actions";
import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/sign-in?next=/dashboard");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Signed in";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link
            href="/dashboard"
            aria-label="Pulse dashboard"
            className="flex size-9 items-center justify-center rounded-md"
          >
            <Mascot width={29} height={29} />
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <HugeiconsIcon icon={Home01Icon} size={14} strokeWidth={1.7} />
                Dashboard
              </Link>
            </Button>
            <Button
              aria-disabled="true"
              className="hidden opacity-55 sm:inline-flex"
              size="sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon
                icon={Target01Icon}
                size={14}
                strokeWidth={1.7}
              />
              Quests
            </Button>
          </nav>
          <div className="ml-auto hidden min-w-0 items-center gap-2 text-xs text-muted-foreground md:flex">
            <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={1.7} />
            <span className="truncate">{email}</span>
          </div>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              <HugeiconsIcon
                icon={Logout03Icon}
                size={14}
                strokeWidth={1.7}
              />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
