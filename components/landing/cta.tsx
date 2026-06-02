import { Mascot } from "./mascot";

export function CtaSection() {
  return (
    <section className="pl-sec pl-sec-pad pl-cta-big">
      <div className="pl-inner" data-reveal>
        <Mascot width={120} height={120} className="pl-cta-mark" />
        <h2>You already know who you want to be.</h2>
        <div className="pl-cta-row">
          <a className="pl-btn pl-btn-primary pl-btn-lg" href="#">
            Start building identity <span className="pl-arr">→</span>
          </a>
          <a className="pl-btn pl-btn-ghost pl-btn-lg" href="#">
            Talk to the team
          </a>
        </div>
      </div>
    </section>
  );
}
