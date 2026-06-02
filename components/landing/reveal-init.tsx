"use client";

import { useEffect } from "react";

export function RevealInit() {
  useEffect(() => {
    const html = document.documentElement;
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }

    html.classList.add("pl-anim");

    function revealInView() {
      const vh = window.innerHeight || 800;
      els.forEach((e) => {
        if (!e.classList.contains("in")) {
          const r = e.getBoundingClientRect();
          if (r.top < vh * 0.92) e.classList.add("in");
        }
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );

    els.forEach((e) => io.observe(e));
    requestAnimationFrame(revealInView);
    window.addEventListener("scroll", revealInView, { passive: true });

    window.addEventListener("load", () => {
      revealInView();
      setTimeout(() => els.forEach((e) => e.classList.add("in")), 1500);
    });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", revealInView);
    };
  }, []);

  return null;
}
