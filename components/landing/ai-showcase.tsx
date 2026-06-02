import { Mascot } from "./mascot";

export function AiShowcase() {
  return (
    <section className="pl-sec pl-sec-pad" id="insights">
      <div className="pl-inner">
        <div className="pl-showcase">
          <div data-reveal>
            <div className="pl-chat-card">
              <div className="pl-chat-top">
                <Mascot width={26} height={26} className="pl-ava" />
                <b>Pulse</b> · journal
                <span className="pl-live">
                  <span className="pl-pd" />
                  live
                </span>
              </div>
              <div className="pl-chat-body">
                <div className="pl-bubble pl-ai">
                  <span className="pl-k">PULSE</span>
                  You showed up 5 of 7 days this week. The two you missed were
                  both Mondays. Want to make Monday lighter instead of heavier?
                </div>
                <div className="pl-bubble pl-me">
                  Yeah, Mondays are rough. Let&apos;s do a 5-minute version.
                </div>
                <div className="pl-bubble pl-ai">
                  <span className="pl-k">PULSE</span>
                  Nice. I shrank Monday&apos;s quest, not your character.
                  You&apos;re still a writer — just one who&apos;s kind to their
                  Mondays. ✍︎
                </div>
              </div>
            </div>
          </div>

          <div data-reveal>
            <span className="pl-eyebrow">
              <span className="pl-dot" />
              Journal magic
            </span>
            <h2 className="pl-h-sec" style={{ margin: "16px 0 14px" }}>
              It notices what you&apos;d miss.
            </h2>
            <p className="pl-sub" style={{ marginBottom: "26px" }}>
              Pulse reads between your check-ins. Instead of a cold percentage,
              you get the kind of observation a thoughtful friend would make.
            </p>
            <div className="pl-insight-list">
              <div className="pl-insight">
                <div className="pl-ih">
                  <span className="pl-sq" />
                  Pattern spotted
                </div>
                <p>
                  &ldquo;Your best writing days follow a morning walk. Three
                  weeks running — want to pair them on purpose?&rdquo;
                </p>
              </div>
              <div className="pl-insight">
                <div className="pl-ih">
                  <span className="pl-sq" />
                  Reframe
                </div>
                <p>
                  &ldquo;You didn&apos;t &lsquo;break&rsquo; anything. You took
                  two rest days and came back. That&apos;s exactly what a
                  consistent person does.&rdquo;
                </p>
              </div>
              <div className="pl-insight">
                <div className="pl-ih">
                  <span className="pl-sq" />
                  This week&apos;s one quest
                </div>
                <p>
                  &ldquo;If you do one thing: read 10 pages tonight. It&apos;s
                  the smallest move with the biggest character payoff.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
