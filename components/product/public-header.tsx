import Link from "next/link";

import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The sticky header for signed-out pages. */
export function PublicHeader({
  cta = "sign-up",
  width = "page",
  logo = true,
}: {
  cta?: "sign-up" | "demo";
  width?: "page" | "wide";
  logo?: boolean;
}) {
  return (
    <header className="sticky top-0 z-(--z-bar) bg-bg">
      <div
        className={cn(
          "mx-auto flex h-header w-full items-center gap-2 px-5 max-sm:px-4",
          width === "wide" ? "max-w-page-wide" : "max-w-page",
        )}
      >
        {logo ? (
          <Link href="/" aria-label="Pulse home" className="flex items-center rounded-inner py-1 pr-2 outline-none">
            <Mascot width={28} height={28} />
          </Link>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="text" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          {cta === "sign-up" ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/sign-up">Create an account</Link>
            </Button>
          ) : (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/onboarding">Try the demo</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
