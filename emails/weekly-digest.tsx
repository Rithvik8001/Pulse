import {
  EmailButton,
  EmailText,
  PulseEmailLayout,
  UnsubscribeFooter,
} from "@/emails/components/layout";

export type WeeklyDigestEmailProps = {
  characterName: string;
  weekLabel: string;
  totalProof: number;
  winCount: number;
  passCount: number;
  strongestQuest: string | null;
  needsAttentionQuest: string | null;
  storyTitle: string | null;
  storySummary: string | null;
  dashboardUrl: string;
  storyUrl: string;
  unsubscribeUrl: string;
};

export default function WeeklyDigestEmail({
  characterName,
  weekLabel,
  totalProof,
  winCount,
  passCount,
  strongestQuest,
  needsAttentionQuest,
  storyTitle,
  storySummary,
  dashboardUrl,
  storyUrl,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  return (
    <PulseEmailLayout
      preview={`You checked in ${totalProof} ${totalProof === 1 ? "time" : "times"} from ${weekLabel}.`}
      title={`${characterName}'s week`}
      footer={<UnsubscribeFooter href={unsubscribeUrl} />}
    >
      <EmailText>
        Last week you checked in {totalProof}{" "}
        {totalProof === 1 ? "time" : "times"}: {winCount} done and {passCount}{" "}
        skipped.
      </EmailText>
      {strongestQuest ? (
        <EmailText>Most consistent: {strongestQuest}.</EmailText>
      ) : null}
      {needsAttentionQuest ? (
        <EmailText>Worth a look: {needsAttentionQuest}.</EmailText>
      ) : null}
      {storyTitle && storySummary ? (
        <EmailText>
          Your weekly recap, &quot;{storyTitle}&quot;, says: {storySummary}
        </EmailText>
      ) : (
        <EmailText>Your weekly recap is ready to write when you are.</EmailText>
      )}
      <EmailButton href={storyTitle ? storyUrl : dashboardUrl}>
        {storyTitle ? "Read your recap" : "Open Pulse"}
      </EmailButton>
    </PulseEmailLayout>
  );
}
