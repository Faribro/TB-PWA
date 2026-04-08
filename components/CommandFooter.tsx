"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function CommandFooter() {
  const [syncMinutes, setSyncMinutes] = useState(2);
  const [hintIndex, setHintIndex] = useState(0);

  const HINTS = ["⌘K  Command Palette", "⌘D  Toggle Theme", "⌘S  Sync Now"];

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncMinutes((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % HINTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [HINTS.length]);

  const dataQuality = 98.4;
  const dataQualityColor =
    dataQuality > 95 ? "#10b981" : dataQuality >= 80 ? "#f59e0b" : "#ef4444";

  return (
    <>
      <style jsx>{`
        @keyframes status-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.45);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes hint-fade {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px);
          }
        }

        .pulse-emerald {
          animation: status-pulse 2s ease-in-out infinite;
        }

        .pulse-amber {
          animation: status-pulse 1.5s ease-in-out infinite;
        }

        .spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .hint-text {
          animation: hint-fade 5s ease-in-out infinite;
        }

        .indicator-label {
          transition: color 0.2s ease;
        }

        .indicator-group:hover .indicator-label {
          color: rgba(30, 41, 59, 0.92) !important;
        }
      `}</style>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-3 md:px-6">
          <div className="grid gap-3 md:gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/Images/Logo/samadhaan_os_final.svg"
                alt="SAMADHAAN Logo"
                width={100}
                height={32}
                className="h-7 w-auto object-contain"
                unoptimized
              />
              <div className="mx-2 h-3 w-px bg-slate-300/70" />
              <span className="hidden truncate font-mono text-[9px] tracking-[0.1em] text-slate-500 md:inline">
                National Integrated Health OS
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-4">
              <div className="indicator-group flex items-center gap-2">
                <div className="pulse-emerald h-2 w-2 rounded-full bg-emerald-500" />
                <div className="flex flex-col">
                  <span className="indicator-label font-mono text-[8px] tracking-widest text-slate-500">
                    AI ENGINE
                  </span>
                  <span className="font-mono text-[9px] font-bold text-emerald-600">
                    ONLINE
                  </span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300/50" />

              <div className="indicator-group flex items-center gap-2">
                <div className="spin-slow flex h-[10px] w-[10px] items-center justify-center font-mono text-[10px] text-indigo-500">
                  ↻
                </div>
                <div className="flex flex-col">
                  <span className="indicator-label font-mono text-[8px] tracking-widest text-slate-500">
                    LAST SYNC
                  </span>
                  <span className="font-mono text-[9px] text-slate-700">
                    {syncMinutes}m ago
                  </span>
                </div>
              </div>

              <div className="hidden h-4 w-px bg-slate-300/50 sm:block" />

              <div className="indicator-group hidden items-center gap-2 sm:flex">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <div className="flex flex-col">
                  <span className="indicator-label font-mono text-[8px] tracking-widest text-slate-500">
                    FACILITIES
                  </span>
                  <span className="font-mono text-[9px] font-bold text-teal-600">
                    23 ACTIVE
                  </span>
                </div>
              </div>

              <div className="hidden h-4 w-px bg-slate-300/50 md:block" />

              <div className="indicator-group hidden items-center gap-2 md:flex">
                <div className="pulse-amber h-2 w-2 rounded-full bg-amber-500" />
                <div className="flex flex-col">
                  <span className="indicator-label font-mono text-[8px] tracking-widest text-slate-500">
                    ALERTS
                  </span>
                  <span className="font-mono text-[9px] font-bold text-amber-600">
                    2 PENDING
                  </span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300/50" />

              <div className="indicator-group flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: dataQualityColor }}
                />
                <div className="flex flex-col">
                  <span className="indicator-label font-mono text-[8px] tracking-widest text-slate-500">
                    DATA QUALITY
                  </span>
                  <span
                    className="font-mono text-[9px] font-bold"
                    style={{ color: dataQualityColor }}
                  >
                    {dataQuality}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-self-start lg:justify-self-end">
              <div className="flex items-center gap-2">
                <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-700/20 bg-slate-900/5 font-mono text-[8px] font-bold text-slate-700">
                  FS
                </div>
                <span className="font-mono text-[9px] tracking-wider text-slate-600">
                  FARID · ADMIN
                </span>
              </div>

              <div className="h-3 w-px bg-slate-300/70" />

              <span className="font-mono text-[8px] tracking-wider text-slate-500">
                v2.4.1-stable
              </span>

              <div className="hidden h-3 w-px bg-slate-300/70 md:block" />

              <span
                key={hintIndex}
                className="hint-text hidden font-mono text-[8px] tracking-wider text-slate-600 md:inline"
              >
                {HINTS[hintIndex]}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
