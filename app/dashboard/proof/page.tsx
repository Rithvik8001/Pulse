import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  NotebookIcon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { ProofArchive } from "@/components/product/proof-archive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProofArchiveData } from "@/lib/pulse/proof";

export const metadata: Metadata = {
  title: "Proof · Pulse",
  description: "Search, edit, and revisit your saved Pulse Proof.",
};

export default async function ProofPage() {
  const data = await getProofArchiveData();

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Proof archive
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before saving Proof.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Proof is built from the Wins and Passes you save on Quests.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Proof archive
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Review what {data.character.name} has proven.
          </h1>
          <p className="max-w-[62ch] text-sm/relaxed text-muted-foreground">
            A searchable 90-day record of saved Check-ins across active and
            archived Quests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Badge variant="outline">
            {formatShortDate(data.range.start)}-{formatShortDate(data.range.end)}
          </Badge>
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
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProofStatCard
          icon={NotebookIcon}
          label="Total Proof"
          value={data.stats.total.toString()}
        />
        <ProofStatCard
          icon={CheckmarkCircle01Icon}
          label="Wins"
          value={data.stats.winCount.toString()}
        />
        <ProofStatCard
          icon={Calendar03Icon}
          label="Passes"
          value={data.stats.passCount.toString()}
        />
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Most-proven Quest</CardDescription>
            <CardTitle className="truncate text-base">
              {data.stats.mostProvenQuest?.title ?? "No Proof yet"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {data.stats.mostProvenQuest ? (
                <>
                  <span>
                    {data.stats.mostProvenQuest.proofCount} Check-in
                    {data.stats.mostProvenQuest.proofCount === 1 ? "" : "s"}
                  </span>
                  {data.stats.mostProvenQuest.status === "archived" ? (
                    <Badge variant="outline">Archived</Badge>
                  ) : null}
                </>
              ) : (
                <span>Save a Check-in to start the archive.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <ProofArchive
        days={data.days}
        entries={data.entries}
        questOptions={data.questOptions}
      />
    </div>
  );
}

function ProofStatCard({
  icon,
  label,
  value,
}: {
  icon: typeof NotebookIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
