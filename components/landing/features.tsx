export function Features() {
  return (
    <section className="pl-sec pl-sec-pad" id="features">
      <div className="pl-inner">
        <div className="pl-fhead" data-reveal>
          <span className="pl-eyebrow">
            <span className="pl-dot" />
            The system
          </span>
          <h2 className="pl-h-sec">
            Quests become proof. Pulse shows who they make you.
          </h2>
          <p className="pl-sub">
            Every check-in is evidence for the person you&apos;re deciding to
            be. Pulse turns that evidence into momentum you can actually feel.
          </p>
        </div>

        <div className="pl-feat-grid" data-reveal>
          <div className="pl-feat">
            <div className="pl-ic">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.7"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3.4" />
              </svg>
            </div>
            <h3>Character-based goals</h3>
            <p>
              Don&apos;t set a target — declare a person. &ldquo;I am a
              runner.&rdquo; Pulse anchors every quest to the character it
              reinforces.
            </p>
          </div>
          <div className="pl-feat">
            <div className="pl-ic">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.7"
              >
                <path d="M4 13c4-9 12-9 16 0M4 13c4 9 12 9 16 0" />
                <circle cx="12" cy="13" r="2.6" />
              </svg>
            </div>
            <h3>Journal magic</h3>
            <p>
              A short note after each check-in. Pulse turns your patterns into
              story, not just numbers.
            </p>
          </div>
          <div className="pl-feat">
            <div className="pl-ic">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.7"
              >
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            </div>
            <h3>Adaptive nudges</h3>
            <p>
              Miss a day? No guilt-trip streak reset. Pulse adjusts, reframes
              the slip, and nudges you toward the next quest.
            </p>
          </div>
        </div>

        <div className="pl-feat-grid two" data-reveal>
          <div className="pl-feat">
            <div className="pl-ic">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.7"
              >
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                <path d="M3.5 9h17M8 4.5v4" />
              </svg>
            </div>
            <h3>Proof, not pressure</h3>
            <p>
              Your dashboard isn&apos;t a fragile streak counter waiting to
              break. It&apos;s a growing archive of proof — every entry a
              permanent win for who you are.
            </p>
          </div>
          <div className="pl-feat">
            <div className="pl-ic">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.7"
              >
                <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
              </svg>
            </div>
            <h3>Weekly story</h3>
            <p>
              Every Sunday, Pulse writes you a letter: what you proved, where
              you drifted, and the single quest that matters most this week.
            </p>
          </div>
        </div>

        <div className="pl-stat-strip" data-reveal>
          <div className="pl-stat">
            <div className="pl-n">3×</div>
            <div className="pl-l">
              more likely to keep a quest when it&apos;s tied to character*
            </div>
          </div>
          <div className="pl-stat">
            <div className="pl-n">~40s</div>
            <div className="pl-l">
              average daily check-in, journal note included
            </div>
          </div>
          <div className="pl-stat">
            <div className="pl-n">0</div>
            <div className="pl-l">streaks lost to a single missed day</div>
          </div>
        </div>
      </div>
    </section>
  );
}
