"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollProgressBar() {
  useGSAP(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const fill = document.querySelector(".scroll-progress-fill") as HTMLElement;
      if (fill) fill.style.width = "100%";
      return;
    }

    gsap.to(".scroll-progress-fill", {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  });

  return (
    <div className="fixed top-0 left-0 z-[9999] w-full h-[3px] bg-transparent pointer-events-none">
      <div className="scroll-progress-fill h-full w-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400" />
    </div>
  );
}
