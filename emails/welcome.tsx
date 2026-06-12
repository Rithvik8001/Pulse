import {
  EmailButton,
  EmailText,
  PulseEmailLayout,
  UnsubscribeFooter,
} from "@/emails/components/layout";

export default function WelcomeEmail({
  characterName,
  dashboardUrl,
  unsubscribeUrl,
}: {
  characterName: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}) {
  return (
    <PulseEmailLayout
      preview="Your first Pulse setup is ready."
      title={`Welcome, ${characterName}.`}
      footer={<UnsubscribeFooter href={unsubscribeUrl} />}
    >
      <EmailText>
        Your Character and first Quests are set. From here, each Win or Pass is
        just Proof for the identity you are building.
      </EmailText>
      <EmailText>
        No streak pressure. No shame for missed days. Just honest evidence and a
        small next action.
      </EmailText>
      <EmailButton href={dashboardUrl}>Go to dashboard</EmailButton>
    </PulseEmailLayout>
  );
}
