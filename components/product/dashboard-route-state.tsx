import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton({
  cards = 3,
  chart = false,
  listRows = 4,
}: {
  cards?: number;
  chart?: boolean;
  listRows?: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="rounded-lg">
            <CardHeader>
              <Skeleton className="mb-2 size-8" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardHeader>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {chart ? <Skeleton className="h-64 w-full" /> : null}
          {Array.from({ length: listRows }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardRouteError({
  message = "Something went wrong while loading this dashboard view.",
  reset,
}: {
  message?: string;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-12 md:px-6">
      <Card>
        <CardHeader>
          <Skeleton className="size-8 bg-destructive/20" />
          <h1 className="font-heading text-xl font-semibold">
            Could not load this view
          </h1>
          <p className="text-sm/relaxed text-muted-foreground">{message}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
