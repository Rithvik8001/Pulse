import "./landing.css";
import { MascotDefs } from "@/components/landing/mascot-defs";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LogoCloud } from "@/components/landing/logo-cloud";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AiShowcase } from "@/components/landing/ai-showcase";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { QuoteBand } from "@/components/landing/quote-band";
import { CtaSection } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { RevealInit } from "@/components/landing/reveal-init";

export default function LandingPage() {
  return (
    <div className="pl-root">
      <MascotDefs />
      <Nav />
      <Hero />
      <LogoCloud />
      <Features />
      <div className="pl-divider" />
      <HowItWorks />
      <div className="pl-divider" />
      <AiShowcase />
      <DashboardPreview />
      <QuoteBand />
      <div className="pl-divider" />
      <CtaSection />
      <Footer />
      <RevealInit />
    </div>
  );
}
