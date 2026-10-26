import Link from "next/link";

import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="grid gap-6 py-6">
      <Mascot width={96} />
      <h1 id="hero-title" className="type-display max-w-measure text-balance">
        Stop counting streaks.{" "}
        <span className="underline-wipe">Start building character.</span>
      </h1>
      <p className="max-w-lead type-body text-fg-2 text-pretty">
        Pulse cares less about the number on a calendar and more about who you
        are becoming. Show up, reflect, and watch your proof build.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" asChild>
          <Link href="/onboarding">Try the demo</Link>
        </Button>
        <Button variant="text" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </section>
  );
}
