import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  NotebookIcon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { JournalEditor } from "@/components/product/journal-editor";
import { PageHeader } from "@/components/product/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getJournalDataForUser, journalHistoryDays } from "@/lib/pulse/journal";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Journal · Pulse",
  description: "Reflect on your daily Proof in Pulse.",
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedDate = Array.isArray(params.date)
    ? params.date[0]
    : params.date;
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getJournalDataForUser(userId, dateContext, selectedDate);

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Journal
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before writing Journal entries.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Journal reflections pair with Proof to help Pulse write better
            Weekly Stories.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <PageHeader
        title={`Reflect with ${data.character.name}.`}
        description="Capture proof, drift, and one next move. Pulse uses current-week Journal entries when writing your Weekly Story."
        action={
          <>
            <Badge variant="outline">{journalHistoryDays}-day history</Badge>
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
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <JournalInfoCard
          label="Daily rhythm"
          title="One entry per day"
          description="Revisiting the same date updates that day's reflection."
        />
        <JournalInfoCard
          label="Proof context"
          title={`${data.selectedProof.length} Check-in${
            data.selectedProof.length === 1 ? "" : "s"
          }`}
          description="Wins and Passes from the selected day stay visible while you write."
        />
        <JournalInfoCard
          label="Story source"
          title="Weekly Story"
          description="Current-week Journal entries are included with your Proof."
        />
      </section>

      <JournalEditor
        history={data.history}
        selectedDate={data.selectedDate}
        selectedEntry={data.selectedEntry}
        selectedProof={data.selectedProof}
      />
    </div>
  );
}

function JournalInfoCard({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={NotebookIcon} size={16} strokeWidth={1.7} />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs/relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
