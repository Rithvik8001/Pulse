import { Mascot } from "./mascot";

export function Nav() {
  return (
    <nav className="pl-nav">
      <div className="pl-nav-in">
        <a className="pl-brand" href="#" aria-label="Pulse">
          <Mascot width={30} height={30} />
          <span className="sr-only">Pulse</span>
        </a>
        <div className="pl-nav-links">
          <a href="#features">Product</a>
          <a href="#how">How it works</a>
          <a href="#insights">AI</a>
        </div>
        <div className="pl-nav-right">
          <a
            className="pl-signin"
            href="/sign-in"
            aria-label="Sign in"
          >
            Sign in
          </a>
          <a className="pl-btn pl-btn-primary" href="/onboarding">
            Try demo <span className="pl-arr">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
