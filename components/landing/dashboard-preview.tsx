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
            accumulating proof of who you are becoming.
          </p>
        </div>

        <div className="pl-browser" data-reveal>
          <div className="pl-bro-bar">
            <span className="pl-dot" />
            <span className="pl-dot" />
            <span className="pl-dot" />
            <span className="pl-bro-url">app.pulse.so/character/writer</span>
          </div>
          <div className="pl-bro-body">
            <aside className="pl-bro-side">
              <div className="pl-si pl-on">
                <span className="pl-sq" />
                Today
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Character
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Journal
              </div>
              <div className="pl-si">
                <span className="pl-sq" />
                Story
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
                    214 proof days · 2 quests waiting today
                  </div>
                </div>
                <a className="pl-btn pl-btn-primary" href="#">
                  Check in <span className="pl-arr">→</span>
                </a>
              </div>
              <div className="pl-bm-cards">
                <div className="pl-bm-card">
                  <div className="pl-lab">Momentum</div>
                  <div className="pl-val">
                    87<small>/100</small>
                  </div>
                </div>
                <div className="pl-bm-card">
                  <div className="pl-lab">Wins this week</div>
                  <div className="pl-val">
                    5<small>of 7</small>
                  </div>
                </div>
                <div className="pl-bm-card">
                  <div className="pl-lab">Proof days</div>
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
                  <span className="pl-tag2">proves · writer</span>
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
                  <span className="pl-tag2">proves · calm</span>
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
                  <span className="pl-tag2">proves · reader</span>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
