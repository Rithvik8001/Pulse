import Link from "next/link";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

import { Mascot } from "@/components/landing/mascot";

const linkClassName = "rounded-inner px-3 py-2 type-label text-fg-2 outline-none hover:text-ink";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-page-wide flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 max-sm:px-4">
        <div className="flex items-center gap-3">
          <Mascot width={24} />
          <p className="type-small text-fg-3">Made by Rithvik.</p>
        </div>
        <nav aria-label="Footer" className="-mx-3 flex flex-wrap items-center">
          <Link href="/sign-in" className={linkClassName}>
            Sign in
          </Link>
          <Link href="/sign-up" className={linkClassName}>
            Create an account
          </Link>
          <a
            href="https://github.com/Rithvik8001"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 ${linkClassName}`}
          >
            <GithubLogo size={16} aria-hidden />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
