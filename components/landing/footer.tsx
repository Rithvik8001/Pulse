import { Mascot } from "./mascot";

export function Footer() {
  return (
    <footer className="pl-footer">
      <div className="pl-foot-in">
        <div className="pl-foot-brand">
          <a className="pl-brand" href="#hero">
            <Mascot width={28} height={28} />
            Pulse
          </a>
          <p>
            The AI habit tracker for people who&apos;d rather build an identity
            than chase a streak.
          </p>
          <div className="pl-foot-social">
            <a
              href="https://github.com/Rithvik8001"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
              </svg>
            </a>
          </div>
        </div>
        <nav className="pl-foot-col" aria-label="Sections">
          <h5>Explore</h5>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#insights">AI reflections</a>
          <a href="#dashboard">Dashboard</a>
        </nav>
      </div>
      <div className="pl-foot-bottom">
        <span className="pl-made">
          Made with <span className="pl-heart">&hearts;</span> by{" "}
          <a
            href="https://github.com/Rithvik8001"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rithvik
          </a>
        </span>
      </div>
    </footer>
  );
}
