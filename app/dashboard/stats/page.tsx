import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartLineData01Icon,
  CheckmarkCircle01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardSetupForm } from "@/components/product/dashboard-setup-form";
import { PageHeader } from "@/components/product/page-header";
import { StatsDashboard } from "@/components/product/stats-dashboard";
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
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getStatsDataForUser } from "@/lib/pulse/stats";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Stats · Pulse",
  description: "Review Pulse analytics across your Quests and Proof.",
};

export default async function StatsPage() {
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getStatsDataForUser(userId, dateContext);

  if (!data.isSetupComplete) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <section className="grid gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Stats
          </p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Create your Character before reading the pattern.
          </h1>
          <p className="max-w-[58ch] text-sm/relaxed text-muted-foreground">
            Stats are built from the Wins and Passes you save on Quests.
          </p>
        </section>
        <DashboardSetupForm />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <PageHeader
        title={`Read the pattern for ${data.character.name}.`}
        description="Weekly win rates, per-Quest performance, and action signals from your saved Proof."
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

      {data.summary.totalProof > 0 ? (
        <StatsDashboard
          questStats={data.questStats}
          questWeeklyStats={data.questWeeklyStats}
          weeklyTrend={data.weeklyTrend}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[0.34fr_1fr]">
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={ChartLineData01Icon}
                  size={18}
                  strokeWidth={1.7}
                />
              </div>
              <CardTitle>Analytics need Proof</CardTitle>
              <CardDescription>
                Save a few Check-ins and Pulse will turn them into trends.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                "Weekly win rate appears after your first Check-in.",
                "Quest comparisons become useful after 3+ Check-ins.",
                "Archived Quests stay visible when they have Proof.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <HugeiconsIcon
                    className="mt-0.5 text-primary"
                    icon={Target01Icon}
                    size={15}
                    strokeWidth={1.7}
                  />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>No Stats yet</CardTitle>
              <CardDescription>
                Check in on today&apos;s Quests to start building your
                analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="rounded-xl">
                <Link href="/dashboard">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={14}
                    strokeWidth={1.7}
                  />
                  Go to Check-ins
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function formatShortDate(date: string, locale: string) {
  return formatLocalDateForLocale(date, locale, {
    month: "short",
    day: "numeric",
  });
}
