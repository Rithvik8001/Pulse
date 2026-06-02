import { Mascot } from "./mascot";

function generateHabitGrid(seed = 7, cells = 130): number[] {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: cells }, () => {
    const v = rnd();
    return v < 0.34 ? 0 : v < 0.55 ? 1 : v < 0.74 ? 2 : v < 0.9 ? 3 : 4;
  });
}

const GRID_DATA = generateHabitGrid();

export function Hero() {
  return (
    <header className="pl-hero" id="hero" data-bg="on">
      <div className="pl-hero-grid-bg" />
      <div className="pl-hero-in">
        <h1 className="pl-hero-title" data-reveal>
          <span className="pl-b">Stop counting streaks.</span>
          <span className="pl-b">
            Start building <em>identity.</em>
          </span>
        </h1>
        <p className="pl-hero-sub" data-reveal>
          Pulse is the AI habit tracker that cares less about the number on a
          calendar and more about who you&apos;re becoming. Show up, reflect,
          and watch the proof of identity stack up.
        </p>
        <div className="pl-hero-cta" data-reveal>
          <a className="pl-btn pl-btn-primary pl-btn-lg" href="#">
            Start building free <span className="pl-arr">→</span>
          </a>
          <a className="pl-btn pl-btn-ghost pl-btn-lg" href="#how">
            See how it works
          </a>
        </div>
        <p className="pl-hero-note" data-reveal>
          No credit card · Free forever for one identity
        </p>

        <div className="pl-stage" data-reveal>
          {/* Variant A: mascot (default active) */}
          <div className="pl-stage-variant is-active" data-variant="mascot">
            <div className="pl-mascot-stage">
              <span className="pl-pulse-ring" />
              <span className="pl-pulse-ring r2" />
              <span className="pl-pulse-ring r3" />
              <Mascot width={188} height={188} className="pl-mascot-float" />
            </div>
          </div>

          {/* Variant B: pulse wave */}
          <div className="pl-stage-variant" data-variant="wave">
            <div className="pl-wave-card">
              <div className="pl-wave-head">
                <span className="pl-d" />
                <span className="pl-d" />
                <span className="pl-d" />
                <span style={{ marginLeft: 8 }}>consistency.live</span>
              </div>
              <div className="pl-wave-body">
                <svg
                  className="pl-wave-svg"
                  viewBox="0 0 760 160"
                  preserveAspectRatio="none"
                >
                  <path
                    className="pl-wave-path"
                    d="M0 80 H120 l18 0 14 -46 16 92 14 -62 12 40 10 -20 H300 l16 0 12 -52 15 96 13 -58 11 34 H470 l20 0 14 -44 15 88 13 -60 12 36 10 -16 H760"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Variant C: habit grid */}
          <div className="pl-stage-variant" data-variant="grid">
            <div className="pl-grid-card">
              <div className="pl-gc-top">
                <span className="pl-t">
                  Identity: &ldquo;I am a writer&rdquo;
                </span>
                <span className="pl-s">214 days of proof</span>
              </div>
              <div className="pl-habit-grid">
                {GRID_DATA.map((level, i) => (
                  <i key={i} {...(level > 0 ? { "data-l": level } : {})} />
                ))}
              </div>
              <div className="pl-legend">
                less <i style={{ background: "#f4f4f5" }} />
                <i style={{ background: "#dcdcde" }} />
                <i style={{ background: "#a8a8ad" }} />
                <i style={{ background: "#5c5c61" }} />
                <i style={{ background: "#171719" }} /> more
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
