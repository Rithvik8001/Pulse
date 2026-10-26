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
              { title: "Choose your character", body: "One sentence about who you are becoming." },
              { title: "Check in with wins", body: "Each day, mark each quest as a win or a pass." },
              { title: "Watch your proof grow", body: "Weeks of check-ins become evidence." },
            ]}
          />
          <FeatureSections />
          <CoachSample />
          <Statement>
            Every quest you complete is proof of the person you are becoming.
          </Statement>
          <RelatedLinks title="Start">
            <NavRow href="/onboarding" feature="today" title="Try the demo" caption="No account. Nothing is saved." />
            <NavRow href="/sign-up" feature="proof" title="Create an account" caption="Keep your proof for real." />
          </RelatedLinks>
        </Page>
      </main>
      <Footer />
    </>
  );
}
