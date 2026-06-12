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
      preview={`${totalProof} pieces of Proof from ${weekLabel}.`}
      title={`${characterName}'s week in Proof`}
      footer={<UnsubscribeFooter href={unsubscribeUrl} />}
    >
      <EmailText>
        Last week, you logged {totalProof} piece{totalProof === 1 ? "" : "s"} of
        Proof: {winCount} Win{winCount === 1 ? "" : "s"} and {passCount} Pass
        {passCount === 1 ? "" : "es"}.
      </EmailText>
      {strongestQuest ? (
        <EmailText>Strongest signal: {strongestQuest}.</EmailText>
      ) : null}
      {needsAttentionQuest ? (
        <EmailText>Worth attention: {needsAttentionQuest}.</EmailText>
      ) : null}
      {storyTitle && storySummary ? (
        <EmailText>
          Your latest Story, &quot;{storyTitle}&quot;, noticed this:{" "}
          {storySummary}
        </EmailText>
      ) : (
        <EmailText>
          You have enough context to reflect on the week whenever you are ready.
        </EmailText>
      )}
      <EmailButton href={storyTitle ? storyUrl : dashboardUrl}>
        {storyTitle ? "Read your Story" : "Open Pulse"}
      </EmailButton>
    </PulseEmailLayout>
  );
}
