import { OnboardingForm } from "@/components/product/onboarding-form";
import { PublicHeader } from "@/components/product/public-header";

export const metadata = {
  title: "Try Pulse",
  description: "Pick who you are becoming and a few habits. Nothing is saved.",
};

export default function OnboardingPage() {
  return (
    <>
      <PublicHeader cta="sign-up" />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-page flex-1 px-5 py-10 outline-none max-sm:px-4"
      >
        <OnboardingForm />
      </main>
    </>
  );
}
