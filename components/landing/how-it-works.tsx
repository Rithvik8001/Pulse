export function HowItWorks() {
  return (
    <section className="pl-sec pl-sec-pad" id="how">
      <div className="pl-inner">
        <div className="pl-fhead" data-reveal>
          <span className="pl-eyebrow">
            <span className="pl-dot" />
            How it works
          </span>
          <h2 className="pl-h-sec">Three moves. One stronger character.</h2>
        </div>
        <div className="pl-steps">
          <div className="pl-step" data-reveal>
            <div className="pl-num">01</div>
            <h3>Choose your character</h3>
            <p>
              Skip the metrics. Tell Pulse who you&apos;re becoming — reader,
              runner, calm parent — and pick the quests that prove it.
            </p>
          </div>
          <div className="pl-step" data-reveal>
            <div className="pl-num">02</div>
            <h3>Check in with wins</h3>
            <p>
              A two-tap check-in plus one honest journal line. Wins build
              momentum. Passes keep the story honest.
            </p>
          </div>
          <div className="pl-step" data-reveal>
            <div className="pl-num">03</div>
            <h3>Watch your proof grow</h3>
            <p>
              No fragile streaks. Just an archive of evidence that quietly
              rewrites the story you tell yourself.
            </p>
          </div>
        </div>
        <div className="pl-how-cta" data-reveal>
          <a className="pl-btn pl-btn-primary pl-btn-lg" href="/onboarding">
            Try the demo <span className="pl-arr">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
