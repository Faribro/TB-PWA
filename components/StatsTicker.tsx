"use client";

import { Users, AlertCircle, CheckCircle, MapPin, Truck, Activity } from "lucide-react";

const STATS = [
  { label: "Inmates Screened", value: "12,847", icon: Users, color: "text-emerald-500" },
  { label: "TB Suspects Flagged", value: "342", icon: AlertCircle, color: "text-amber-500" },
  { label: "Confirmed Cases", value: "89", icon: CheckCircle, color: "text-rose-500" },
  { label: "Facilities Active", value: "23", icon: MapPin, color: "text-indigo-500" },
  { label: "X-Ray Units Deployed", value: "7", icon: Truck, color: "text-blue-500" },
  { label: "AI Accuracy Rate", value: "96.4%", icon: Activity, color: "text-purple-500" },
];

const DOUBLED_STATS = [...STATS, ...STATS];

export default function StatsTicker() {
  return (
    <>
      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          animation: ticker-scroll 28s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
      <div className="w-full overflow-x-hidden bg-white/40 backdrop-blur-sm border-y border-indigo-100/60 py-3 my-4">
        <div className="ticker-track flex">
          {DOUBLED_STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="inline-flex items-center gap-2.5 mx-5 md:mx-8 whitespace-nowrap">
                <Icon size={16} className={stat.color} />
                <span className="font-bold text-sm text-indigo-900">{stat.value}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
