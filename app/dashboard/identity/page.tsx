import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  CheckmarkCircle01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { IdentityTimeline } from "@/components/product/identity-timeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIdentityTimelineDataForUser } from "@/lib/pulse/identity";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Identity · Pulse",
  description: "Review the evidence for who you are becoming.",
};

export default async function IdentityPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getIdentityTimelineDataForUser(userId, dateContext);

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Identity setup
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before Pulse can map identity evidence.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Identity is built from saved Proof, Journal reflections, and Weekly
            Stories.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  const hasEvidence = data.views["90d"].nodes.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Identity Timeline
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            You are becoming someone who...
          </h1>
          <p className="max-w-[62ch] text-sm/relaxed text-muted-foreground">
            Pulse turns Proof, Journal reflections, and Weekly Stories into an
            evidence graph for {data.character.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={14}
              strokeWidth={1.7}
            />
            Today&apos;s Check-ins
          </Link>
        </Button>
      </section>

      {hasEvidence ? (
        <IdentityTimeline data={data} locale={dateContext.locale} />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[0.36fr_1fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={18}
                  strokeWidth={1.8}
                />
              </div>
              <CardTitle>Identity needs evidence</CardTitle>
              <CardDescription>
                Save one Check-in or Journal entry to start the timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    size={14}
                    strokeWidth={1.7}
                  />
                  Build today&apos;s Proof
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>No identity graph yet</CardTitle>
              <CardDescription>
                Pulse will map milestones, strongest signals, recurring themes,
                and AI snapshots once evidence exists.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}
