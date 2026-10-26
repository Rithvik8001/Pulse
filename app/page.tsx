import { CoachSample, FeatureSections } from "@/components/landing/feature-sections";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { ProductView } from "@/components/landing/product-view";
import { PublicHeader } from "@/components/product/public-header";
import { HowItWorks, Page, RelatedLinks, Statement } from "@/components/ui/page";
import { NavRow } from "@/components/ui/row";

export default function LandingPage() {
  return (
    <>
      <PublicHeader cta="demo" width="wide" logo={false} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-page-wide flex-1 px-5 py-10 outline-none max-sm:px-4"
      >
        <Page className="gap-14">
          <Hero />
          <ProductView />
          <HowItWorks
            steps={[
              { title: "Say who you are becoming", body: "I am a writer, a runner, an early riser." },
              { title: "Check in each day", body: "Mark each habit Done or Skipped. Skipping is allowed." },
              { title: "Look back each week", body: "Pulse writes a short recap of what your days show." },
            ]}
          />
          <FeatureSections />
          <CoachSample />
          <Statement>Each small thing you do shows who you are becoming.</Statement>
          <RelatedLinks title="Start">
            <NavRow href="/onboarding" feature="today" title="Try the demo" caption="No account. Nothing is saved." />
            <NavRow href="/sign-up" feature="history" title="Create an account" caption="Keep your check-ins." />
          </RelatedLinks>
        </Page>
      </main>
      <Footer />
    </>
  );
}
