import type { Metadata } from "next";
import Link from "next/link";

import { ReviewStatement } from "@/components/product/review-statement";
import { SetupGate } from "@/components/product/setup-gate";
import { WeeklyRecapForm } from "@/components/product/weekly-recap-form";
import { Button } from "@/components/ui/button";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Notice } from "@/components/ui/notice";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle, Prose, RelatedLinks, Statement } from "@/components/ui/page";
import { ActionRow, DetailRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { requireUserId } from "@/lib/pulse/dashboard";
import { getIdentityTimelineDataForUser } from "@/lib/pulse/identity";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getWeeklyStoryDataForUser, type WeeklyStory } from "@/lib/pulse/story";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Review - Pulse",
  description: "Your weekly recap and who you are becoming.",
};

function weekLabel(start: string, end: string, locale: string) {
  const f = (d: string) => formatLocalDateForLocale(d, locale, { month: "short", day: "numeric" });
  return `${f(start)} to ${f(end)}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function Recap({ story }: { story: WeeklyStory }) {
  const paragraphs = story.letterBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <article className="grid gap-6">
      <h3 className="type-heading text-balance">{story.title}</h3>
      <Statement>{story.summary}</Statement>
      <Prose>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Prose>
      <div className="grid gap-3">
        <h4 className="type-section">Patterns</h4>
        <RowList>
          {story.patternBullets.map((pattern) => (
            <DetailRow key={pattern} label={pattern} />
          ))}
        </RowList>
      </div>
      <div className="grid gap-3">
        <h4 className="type-section">One habit for next week</h4>
        <Statement>{story.nextQuest}</Statement>
      </div>
    </article>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ recap?: string | string[]; story?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.recap ?? params.story;
  const recapId = Array.isArray(raw) ? raw[0] : raw;
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const [data, identity] = await Promise.all([
    getWeeklyStoryDataForUser(userId, dateContext, recapId),
    getIdentityTimelineDataForUser(userId, dateContext),
  ]);

  if (!data.isSetupComplete || !identity.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const locale = dateContext.locale;
  const story = data.selectedStory;
  const isPast = Boolean(story && data.currentWeekStory?.id !== story.id);
  const proofCount = data.currentWeekProof.length;
  const journalCount = data.currentWeekJournal.length;
  const hasSource = proofCount > 0 || journalCount > 0;
  const writtenCaption = data.currentWeekStory
    ? `Written ${new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(data.currentWeekStory.updatedAt)}. Based on ${plural(proofCount, "check-in", "check-ins")} and ${plural(journalCount, "journal entry", "journal entries")}.`
    : hasSource
      ? "Not written yet."
      : "Check in or write a journal entry this week first.";
  const recapWeekName = data.isPreviousWeek ? "Last week" : "This week";

  const view = identity.views.all;
  const statement = identity.latestSnapshot?.identityStatement ?? view.fallbackSnapshot.identityStatement;
  const milestones = view.milestones.slice(0, 5);
  const shortDate = (date: string) => formatLocalDateForLocale(date, locale, { day: "numeric", month: "short" });

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Review</PageTitle>
        <PageLead>{weekLabel(data.week.start, data.week.end, locale)}</PageLead>
      </PageHeader>

      <Section
        title={story && isPast ? `Recap for ${weekLabel(story.weekStart, story.weekEnd, locale)}` : `${recapWeekName}'s recap`}
        action={
          isPast ? (
            <Button variant="text" size="sm" asChild>
              <Link href="/dashboard/review">Back to this week</Link>
            </Button>
          ) : null
        }
      >
        {story ? (
          <Recap story={story} />
        ) : hasSource ? (
          <Notice>{recapWeekName}&apos;s recap has not been written yet.</Notice>
        ) : (
          <Notice action={{ label: "Go to today", href: "/dashboard" }}>
            Once you check in or write a journal entry this week, Pulse can write your recap.
          </Notice>
        )}
        {!isPast ? (
          <WeeklyRecapForm
            disabled={!hasSource}
            hasRecap={Boolean(data.currentWeekStory)}
            isPreviousWeek={data.isPreviousWeek}
            caption={writtenCaption}
          />
        ) : null}
      </Section>

      <Section title="Who you are becoming">
        <ReviewStatement
          statement={statement}
          updatedAt={identity.latestSnapshot?.updatedAt ?? null}
          canRefresh={identity.hasAiGatewayKey && view.nodes.length > 0}
          aiAvailable={identity.hasAiGatewayKey}
          locale={locale}
        />
      </Section>

      <Section title="Milestones">
        {milestones.length > 0 ? (
          <RowList>
            {milestones.map((milestone) => (
              <ActionRow
                key={milestone.id}
                leading={<FeatureChip feature="review" />}
                title={milestone.title}
                caption={milestone.detail}
                actions={<span className="type-small text-fg-3">{shortDate(milestone.localDate)}</span>}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Milestones appear as you keep checking in.</Notice>
        )}
      </Section>

      <Section title="Past recaps">
        {data.stories.length > 0 ? (
          <RowList>
            {data.stories.map((item) => (
              <NavRow
                key={item.id}
                href={`/dashboard/review?recap=${item.id}`}
                feature="review"
                title={item.title}
                caption={weekLabel(item.weekStart, item.weekEnd, locale)}
                current={story?.id === item.id}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Recaps you write are kept here.</Notice>
        )}
      </Section>

      <RelatedLinks>
        <NavRow href="/dashboard/journal" feature="journal" title="Journal" caption="Write about today." />
      </RelatedLinks>
    </Page>
  );
}
