import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Page, PageHeader, PageLead, PageTitle } from "@/components/ui/page";
import { Bone } from "@/components/ui/skeleton";

export function DashboardPageSkeleton({
  chart = false,
  listRows = 4,
}: {
  cards?: number;
  chart?: boolean;
  listRows?: number;
}) {
  return (
    <Page aria-busy aria-label="Loading">
      <div className="grid gap-3">
        <Bone className="h-5 w-16" />
        <Bone className="h-8 w-56" />
        <Bone className="h-5 w-full max-w-lead" />
      </div>
      {chart ? <Bone className="h-64 w-full" /> : null}
      <div className="grid gap-3">
        <Bone className="h-4 w-20" />
        <ul className="grid list-none p-0 [&>*+*]:hairline">
          {Array.from({ length: listRows }).map((_, index) => (
            <li key={index} className="flex items-center gap-4 py-3.5">
              <Bone className="size-10" />
              <div className="grid flex-1 gap-2">
                <Bone className="h-4 w-1/2" />
                <Bone className="h-3.5 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}

export function DashboardRouteError({
  message = "Check your connection, then try again.",
  reset,
}: {
  message?: string;
  reset: () => void;
}) {
  return (
    <Page>
      <PageHeader>
        <PageTitle>This page didn&apos;t load</PageTitle>
        <PageLead>{message}</PageLead>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Button variant="text" asChild>
          <Link href="/dashboard">Go to today</Link>
        </Button>
      </div>
    </Page>
  );
}
