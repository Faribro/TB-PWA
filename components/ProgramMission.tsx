"use client";

import { useRef } from "react";
import { ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function ProgramMission() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReduced) {
        gsap.set([containerRef.current, ".pm-shield-bg", ".pm-eyebrow", ".pm-text-line", ".pm-subtext"], {
          opacity: 1,
          y: 0,
          x: 0,
          filter: "blur(0px)",
          scale: 1,
          clipPath: "inset(0% 0 0 0)",
          skewX: 0,
        });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.fromTo(
        containerRef.current,
        { opacity: 0, y: 28, filter: "blur(12px)", scale: 0.98 },
        { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 1.6 }
      );

      tl.fromTo(
        ".pm-shield-bg",
        { opacity: 0, x: 40 },
        { opacity: 0.6, x: 0, duration: 1.2 },
        "-=1.3"
      );

      tl.fromTo(
        ".pm-eyebrow",
        { opacity: 0, clipPath: "inset(100% 0 0 0)", y: 10 },
        { opacity: 1, clipPath: "inset(0% 0 0 0)", y: 0, duration: 0.65 },
        "-=0.9"
      );

      tl.fromTo(
        ".pm-text-line",
        { opacity: 0, y: 22, skewX: 1 },
        { opacity: 1, y: 0, skewX: 0, duration: 0.72, stagger: 0.16 },
        "-=0.45"
      );

      tl.fromTo(
        ".pm-subtext",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.55 },
        "-=0.2"
      );

      gsap.to(".pm-orb", {
        scale: 1.2,
        opacity: 0.5,
        duration: 5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="w-full rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#f0f0ff] via-[#ede9fe] to-[#e0e7ff] border border-indigo-100/80 shadow-[0_8px_40px_rgba(79,70,229,0.10)] px-5 py-6 md:px-10 md:py-9"
    >
      <div className="pm-orb absolute right-0 top-0 w-72 h-72 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />

      <ShieldCheck
        size={180}
        className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-100 opacity-60 pointer-events-none select-none pm-shield-bg hidden md:block"
      />

      <div className="relative z-10">
        <div className="pm-eyebrow inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          <ShieldCheck size={12} />
          Prison Healthcare Program • AI-Assisted TB Detection
        </div>

        <div className="space-y-1">
          <p className="pm-text-line text-[1.1rem] md:text-[1.45rem] font-bold leading-snug text-indigo-950 tracking-tight">
            Our mission is to support community action
          </p>
          <p className="pm-text-line text-[1.1rem] md:text-[1.45rem] font-bold leading-snug text-indigo-950 tracking-tight">
            to prevent HIV infection, meet the challenges of AIDS,
          </p>
          <p className="pm-text-line text-[1.1rem] md:text-[1.45rem] font-bold leading-snug text-indigo-950 tracking-tight">
            and build healthier communities.
          </p>
        </div>

        <div className="pm-subtext text-sm text-indigo-400 font-medium mt-5 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          National Integrated Health OS • Powered by Alliance India • Real-Time
          Surveillance Active
        </div>
      </div>
    </div>
  );
}
