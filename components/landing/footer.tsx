import Link from "next/link";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

import { Mascot } from "@/components/landing/mascot";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-page-wide flex-wrap items-center justify-between gap-4 px-5 py-8 max-sm:px-4">
        <div className="flex items-center gap-2 type-label font-semibold">
          <Mascot width={24} />
          Pulse
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-1">
          <Link href="/sign-in" className="rounded-inner px-3 py-2 type-label text-fg-2 outline-none hover:text-ink">
            Sign in
          </Link>
          <Link href="/sign-up" className="rounded-inner px-3 py-2 type-label text-fg-2 outline-none hover:text-ink">
            Create an account
          </Link>
          <a
            href="https://github.com/Rithvik8001"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-inner px-3 py-2 type-label text-fg-2 outline-none hover:text-ink"
          >
            <GithubLogo size={16} aria-hidden />
            GitHub
          </a>
        </nav>
        <p className="w-full type-small text-fg-3">Made by Rithvik.</p>
      </div>
    </footer>
  );
}
