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

export function DashboardPreview() {
  return (
    <section
      className="pl-sec pl-sec-pad"
      id="dashboard"
      style={{ paddingBottom: 0 }}
    >
      <div className="pl-inner">
        <div
          className="pl-fhead"
          data-reveal
          style={{
            alignItems: "center",
            textAlign: "center",
            margin: "0 auto 8px",
          }}
        >
          <span className="pl-eyebrow" style={{ justifyContent: "center" }}>
            <span className="pl-dot" />
            The dashboard
          </span>
          <h2 className="pl-h-sec">Your proof, in one calm view.</h2>
          <p className="pl-sub" style={{ margin: "0 auto" }}>
            No leaderboards. No anxiety-inducing red numbers. Just the quiet,
            accumulating evidence of who you are.
          </p>
        </div>

        <div className="pl-browser" data-reveal>
          <div className="pl-bro-bar">
            <span className="pl-dot" />
            <span className="pl-dot" />
            <span className="pl-dot" />
            <span className="pl-bro-url">app.pulse.so/identity/writer</span>
          </div>
          <div className="pl-bro-body">
            <aside className="pl-bro-side">
              <div className="pl-si pl-on">
                <span className="pl-sq" />
                Today
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Identities
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Reflections
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Recaps
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Settings
              </div>
            </aside>
            <main className="pl-bro-main">
              <div className="pl-bm-h">
                <div>
                  <h4>Good morning. You&apos;re a writer.</h4>
                  <div className="pl-sub2">
                    214 days of proof · 2 votes left today
                  </div>
                </div>
                <a className="pl-btn pl-btn-primary" href="#">
                  Check in <span className="pl-arr">→</span>
                </a>
              </div>
              <div className="pl-bm-cards">
                <div className="pl-bm-card">
                  <div className="pl-lab">Identity strength</div>
                  <div className="pl-val">
                    87<small>/100</small>
                  </div>
                </div>
                <div className="pl-bm-card">
                  <div className="pl-lab">Votes this week</div>
                  <div className="pl-val">
                    5<small>of 7</small>
                  </div>
                </div>
                <div className="pl-bm-card">
                  <div className="pl-lab">Days of proof</div>
                  <div className="pl-val">214</div>
                </div>
              </div>
              <div className="pl-bm-rows">
                <div className="pl-bm-row">
                  <div className="pl-mini">
                    <i className="f" />
                    <i className="f" />
                    <i className="h" />
                    <i className="f" />
                    <i className="f" />
                    <i />
                    <i className="f" />
                  </div>
                  <span className="pl-name">Write 500 words</span>
                  <span className="pl-tag2">votes for · writer</span>
                </div>
                <div className="pl-bm-row">
                  <div className="pl-mini">
                    <i className="f" />
                    <i className="f" />
                    <i className="f" />
                    <i className="f" />
                    <i className="h" />
                    <i className="f" />
                    <i className="f" />
                  </div>
                  <span className="pl-name">Morning walk</span>
                  <span className="pl-tag2">votes for · calm</span>
                </div>
                <div className="pl-bm-row">
                  <div className="pl-mini">
                    <i className="f" />
                    <i />
                    <i className="f" />
                    <i className="f" />
                    <i className="f" />
                    <i className="h" />
                    <i className="f" />
                  </div>
                  <span className="pl-name">Read 10 pages</span>
                  <span className="pl-tag2">votes for · reader</span>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
