"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { highlightParam } from "@/components/product/assistant/assistant-proposals";

const highlightMs = 2400;
const retryMs = 150;
const maxAttempts = 40;

function isHydrated(element: HTMLElement) {
  return Object.keys(element).some((key) => key.startsWith("__reactFiber"));
}

function isInView(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight;
}

export function HighlightTarget() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const highlightId = searchParams.get(highlightParam);

  useEffect(() => {
    if (!highlightId) return;

    let attempts = 0;
    let timer = 0;
    let highlighted: HTMLElement | null = null;

    const clearParam = () => {
      const params = new URLSearchParams(window.location.search);
      params.delete(highlightParam);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const finish = () => {
      if (highlighted) delete highlighted.dataset.highlighted;
      clearParam();
    };

    const attempt = () => {
      attempts += 1;
      const element = document.querySelector<HTMLElement>(
        `[data-highlight-id="${CSS.escape(highlightId)}"]`,
      );

      if (element && isHydrated(element) && element.getBoundingClientRect().height > 0) {
        if (!isInView(element)) element.scrollIntoView({ block: "center" });

        if (isInView(element) || attempts >= maxAttempts) {
          highlighted = element;
          element.dataset.highlighted = "true";
          timer = window.setTimeout(finish, highlightMs);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        finish();
        return;
      }

      timer = window.setTimeout(attempt, retryMs);
    };

    timer = window.setTimeout(attempt, retryMs);

    return () => {
      window.clearTimeout(timer);
      if (highlighted) delete highlighted.dataset.highlighted;
    };
  }, [highlightId, pathname, router]);

  return null;
}
