import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { PageHeader } from "@/components/product/page-header";
import { QuestManager } from "@/components/product/quest-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getQuestManagerDataForUser } from "@/lib/pulse/quests";

export const metadata: Metadata = {
  title: "Quests · Pulse",
  description: "Manage the Quests that build your Pulse proof.",
};

export default async function QuestsPage() {
  const userId = await requireUserId();
  const data = await getQuestManagerDataForUser(userId);

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Quest setup
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before managing Quests.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Quests are the repeatable actions that prove who you are becoming.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <PageHeader
        title={`Shape the proof for ${data.character.name}.`}
        description="Add, edit, order, archive, and restore the Quests that appear in daily Check-ins."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/dashboard">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={14}
                strokeWidth={1.7}
              />
              Today&apos;s Check-ins
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.34fr_1fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={Target01Icon} size={18} strokeWidth={1.7} />
            </div>
            <CardTitle>How Quests work</CardTitle>
            <CardDescription>
              Keep your active list focused. Archive old Quests without losing
              their Proof.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {[
              `Keep up to ${data.activeQuestLimit} active Quests.`,
              "Active Quests appear in today's Check-ins.",
              "Archived Quests leave daily Check-ins but keep their history.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <HugeiconsIcon
                  className="mt-0.5 text-primary"
                  icon={CheckmarkCircle01Icon}
                  size={15}
                  strokeWidth={1.7}
                />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <QuestManager
          activeQuestLimit={data.activeQuestLimit}
          activeQuests={data.activeQuests}
          archivedQuests={data.archivedQuests}
        />
      </section>
    </div>
  );
}
