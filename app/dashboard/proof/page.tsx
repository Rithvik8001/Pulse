import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { PageHeader } from "@/components/product/page-header";
import { ProofArchive } from "@/components/product/proof-archive";
import { SectionLabel } from "@/components/product/section-label";
import {
  StatGridCard,
  type StatTile,
} from "@/components/product/stat-grid-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/pulse/dashboard";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getProofArchiveDataForUser } from "@/lib/pulse/proof";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Proof · Pulse",
  description: "Search, edit, and revisit your saved Pulse Proof.",
};

export default async function ProofPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getProofArchiveDataForUser(userId, dateContext);

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

  const statTiles: StatTile[] = [
    {
      label: "Total Proof",
      value: data.stats.total.toString(),
      dotClassName: "bg-primary",
    },
    {
      label: "Wins",
      value: data.stats.winCount.toString(),
      dotClassName: "bg-emerald-500",
    },
    {
      label: "Passes",
      value: data.stats.passCount.toString(),
      dotClassName: "bg-amber-500",
    },
    {
      label: "Most-proven",
      value: data.stats.mostProvenQuest?.title ?? "No Proof yet",
      hint: data.stats.mostProvenQuest
        ? `${data.stats.mostProvenQuest.proofCount} Check-ins`
        : undefined,
      dotClassName: "bg-sky-500",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <PageHeader
        title={`Review what ${data.character.name} has proven.`}
        description="A searchable 90-day record of saved Check-ins across active and archived Quests."
        action={
          <>
            <Badge variant="outline">
              {formatShortDate(data.range.start, dateContext.locale)}-
              {formatShortDate(data.range.end, dateContext.locale)}
            </Badge>
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

      <section className="grid gap-3">
        <SectionLabel icon={CheckmarkCircle01Icon}>Overview</SectionLabel>
        <StatGridCard tiles={statTiles} />
      </section>

      <ProofArchive
        days={data.days}
        entries={data.entries}
        questOptions={data.questOptions}
      />
    </div>
  );
}

function formatShortDate(date: string, locale: string) {
  return formatLocalDateForLocale(date, locale, {
    month: "short",
    day: "numeric",
  });
}
