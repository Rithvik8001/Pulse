import Link from "next/link";

import { FeatureSections, HowItWorksRow } from "@/components/landing/feature-sections";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { ProductView } from "@/components/landing/product-view";
import { PublicHeader } from "@/components/product/public-header";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <>
      <PublicHeader cta="demo" width="wide" logo={false} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-page-wide flex-1 gap-20 px-5 py-10 outline-none max-sm:gap-14 max-sm:px-4"
      >
        <Hero />
        <ProductView />
        <HowItWorksRow />
        <FeatureSections />
        <section
          aria-labelledby="closing-title"
          className="grid justify-items-center gap-6 py-6 text-center"
        >
          <h2 id="closing-title" className="type-title max-w-measure text-balance">
            Each small thing you do shows who you are becoming.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" asChild>
              <Link href="/onboarding">Try the demo</Link>
            </Button>
            <Button variant="text" asChild>
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
