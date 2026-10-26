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
      preview="Your habits are set up."
      title={`Welcome, ${characterName}.`}
      footer={<UnsubscribeFooter href={unsubscribeUrl} />}
    >
      <EmailText>
        Your habits are ready. Each day, open Pulse and mark each one done or
        skipped. Skipping is fine. It keeps the record honest.
      </EmailText>
      <EmailText>
        Once a week, Pulse writes a short recap of what your check-ins show.
      </EmailText>
      <EmailButton href={dashboardUrl}>Check in today</EmailButton>
    </PulseEmailLayout>
  );
}
