import Link from "next/link";

import { Mascot } from "@/components/landing/mascot";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid justify-items-center gap-6 pt-10 pb-4 text-center max-sm:pt-6"
    >
      <Mascot width={80} />
      <h1 id="hero-title" className="type-display max-w-measure text-balance">
        A habit tracker for{" "}
        <span className="underline-wipe">who you are becoming.</span>
      </h1>
      <p className="max-w-lead type-body text-fg-2 text-pretty">
        Pulse is a daily habit app. Say who you want to be, check in on one to
        three small habits each day, and get a short weekly recap written from
        your own check-ins.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" asChild>
          <Link href="/onboarding">Try the demo</Link>
        </Button>
        <Button variant="text" asChild>
          <Link href="/sign-up">Create an account</Link>
        </Button>
      </div>
    </section>
  );
}
