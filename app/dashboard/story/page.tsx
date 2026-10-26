import type { Metadata } from "next";

import { ProofOutcome } from "@/components/product/proof-outcome";
import { SetupGate } from "@/components/product/setup-gate";
import { WeeklyStoryForm } from "@/components/product/weekly-story-form";
import { FeatureChip } from "@/components/ui/feature-chip";
import { Notice } from "@/components/ui/notice";
import { Breadcrumb, Page, PageHeader, PageLead, PageTitle, Prose, Statement } from "@/components/ui/page";
import { ActionRow, DetailRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { getWeeklyStoryDataForUser, type WeeklyStory } from "@/lib/pulse/story";
import { requireUserId } from "@/lib/pulse/dashboard";
import { formatLocalDateForLocale } from "@/lib/pulse/local-date-core";
import { getUserLocalDateContextForUser } from "@/lib/pulse/user-settings";

export const metadata: Metadata = {
  title: "Story · Pulse",
  description: "Your week, written up.",
};

function weekLabel(range: { weekStart: string; weekEnd: string } | { start: string; end: string }, locale: string) {
  const start = "weekStart" in range ? range.weekStart : range.start;
  const end = "weekEnd" in range ? range.weekEnd : range.end;
  const f = (d: string) => formatLocalDateForLocale(d, locale, { month: "short", day: "numeric" });
  return `${f(start)} to ${f(end)}`;
}

function StoryLetter({ story }: { story: WeeklyStory }) {
  const paragraphs = story.letterBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="grid gap-6">
      <h2 className="type-heading text-balance">{story.title}</h2>
      <Statement>{story.summary}</Statement>
      <Prose>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Prose>
      <Section title="Patterns">
        <RowList>
          {story.patternBullets.map((pattern) => (
            <DetailRow key={pattern} label={pattern} />
          ))}
        </RowList>
      </Section>
      <Section title="Next week's one quest">
        <Statement>{story.nextQuest}</Statement>
      </Section>
    </article>
  );
}

export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<{ story?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedStoryId = Array.isArray(params.story) ? params.story[0] : params.story;
  const userId = await requireUserId();
  const dateContext = await getUserLocalDateContextForUser(userId);
  const data = await getWeeklyStoryDataForUser(userId, dateContext, selectedStoryId);

  if (!data.isSetupComplete) {
    return <SetupGate isSetupComplete={false}>{null}</SetupGate>;
  }

  const locale = dateContext.locale;
  const hasSource = data.currentWeekProof.length > 0 || data.currentWeekJournal.length > 0;
  const story = data.selectedStory;
  const writtenCaption = data.currentWeekStory
    ? `Written ${new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(data.currentWeekStory.updatedAt)}.`
    : hasSource
      ? "Nothing written for this week yet."
      : "Check in or write an entry this week first.";

  return (
    <Page>
      <PageHeader>
        <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
        <PageTitle>Weekly story</PageTitle>
        <PageLead>{story ? weekLabel(story, locale) : weekLabel(data.week, locale)}</PageLead>
      </PageHeader>

      {story ? (
        <StoryLetter story={story} />
      ) : (
        <Notice>
          {hasSource
            ? "This week's story has not been written yet."
            : "Once this week has a check-in or a journal entry, Pulse can write its story."}
        </Notice>
      )}

      <WeeklyStoryForm
        disabled={!hasSource}
        hasStory={Boolean(data.currentWeekStory)}
        caption={writtenCaption}
      />

      <Section title="This week's source">
        <RowList>
          <DetailRow
            label="Week"
            control={<span className="type-body text-fg-2">{weekLabel(data.week, locale)}</span>}
          />
          <DetailRow
            label="Check-ins"
            control={<span className="type-body text-fg-2 tabular-nums">{data.currentWeekProof.length}</span>}
          />
          <DetailRow
            label="Journal entries"
            control={<span className="type-body text-fg-2 tabular-nums">{data.currentWeekJournal.length}</span>}
          />
        </RowList>
        {data.currentWeekProof.length > 0 ? (
          <RowList>
            {data.currentWeekProof.map((entry) => (
              <ActionRow
                key={entry.id}
                leading={<FeatureChip feature="proof" />}
                title={entry.questTitle}
                caption={entry.note ? `${entry.localDate}: ${entry.note}` : entry.localDate}
                actions={<ProofOutcome outcome={entry.outcome} />}
              />
            ))}
          </RowList>
        ) : null}
      </Section>

      <Section title="Past stories">
        {data.stories.length > 0 ? (
          <RowList>
            {data.stories.map((item) => (
              <NavRow
                key={item.id}
                href={`/dashboard/story?story=${item.id}`}
                feature="story"
                title={item.title}
                caption={weekLabel(item, locale)}
                current={story?.id === item.id}
              />
            ))}
          </RowList>
        ) : (
          <Notice>Stories you write will be kept here.</Notice>
        )}
      </Section>
    </Page>
  );
}
