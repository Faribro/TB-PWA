"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Target, Shield, Clock, HeartPulse, Filter, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface SummaryData {
  total: number;
  pending: number;
  suspected: number;
  diagnosed: number;
  onTreatment: number;
  todayScreened: number;
  todaySuspected: number;
  todayDiagnosed: number;
  todayPending: number;
}

interface UnifiedCommandCenterProps {
  summaryData?: SummaryData;
  activeFilterCount: number;
  onOpenFilters: () => void;
  isLoading?: boolean;
}

type MetricKey = "screened" | "suspected" | "diagnosed" | "pending" | "treatment";

const METRICS_CONFIG: Record<MetricKey, {
  id: MetricKey;
  label: string;
  icon: any;
  color: string;
  bgGradient: string;
  glow: string;
  textGradient: string;
  getTotal: (d: SummaryData) => number;
  getToday: (d: SummaryData) => number | null;
  desc: string;
}> = {
  screened: {
    id: "screened",
    label: "Total Screened",
    icon: Activity,
    color: "text-blue-600",
    bgGradient: "from-blue-300/50 via-cyan-200/30 to-indigo-300/20",
    glow: "bg-blue-500",
    textGradient: "from-slate-900 via-blue-900 to-blue-600",
    getTotal: (d) => d.total,
    getToday: (d) => d.todayScreened,
    desc: "Cumulative inmates passed through the primary X-Ray and AI screening protocol.",
  },
  suspected: {
    id: "suspected",
    label: "Suspected TB",
    icon: Target,
    color: "text-amber-600",
    bgGradient: "from-amber-300/50 via-orange-200/30 to-yellow-300/20",
    glow: "bg-amber-500",
    textGradient: "from-slate-900 via-amber-900 to-amber-600",
    getTotal: (d) => d.suspected,
    getToday: (d) => d.todaySuspected,
    desc: "Inmates flagged via X-Ray architecture requiring expedited CBNAAT confirmatory testing.",
  },
  diagnosed: {
    id: "diagnosed",
    label: "Confirmed Diagnosed",
    icon: Shield,
    color: "text-emerald-600",
    bgGradient: "from-emerald-300/50 via-teal-200/30 to-green-300/20",
    glow: "bg-emerald-500",
    textGradient: "from-slate-900 via-emerald-900 to-emerald-600",
    getTotal: (d) => d.diagnosed,
    getToday: (d) => d.todayDiagnosed,
    desc: "Patients presenting a definitively positive TB diagnosis verified via Truenat/CBNAAT.",
  },
  pending: {
    id: "pending",
    label: "Pending Action",
    icon: Clock,
    color: "text-indigo-600",
    bgGradient: "from-indigo-300/50 via-purple-200/30 to-fuchsia-300/20",
    glow: "bg-indigo-500",
    textGradient: "from-slate-900 via-indigo-900 to-indigo-600",
    getTotal: (d) => d.pending,
    getToday: (d) => d.todayPending,
    desc: "Critical pipeline blockage. Patients awaiting referral, definitive outcomes, or registration.",
  },
  treatment: {
    id: "treatment",
    label: "On Treatment",
    icon: HeartPulse,
    color: "text-pink-600",
    bgGradient: "from-pink-300/50 via-rose-200/30 to-red-300/20",
    glow: "bg-pink-500",
    textGradient: "from-slate-900 via-pink-900 to-pink-600",
    getTotal: (d) => d.onTreatment,
    getToday: () => null,
    desc: "Active therapeutic cohorts currently undergoing initiated Anti-TB Treatment algorithms.",
  },
};

const AnimatedNumber = ({ value }: { value: number }) => {
  return (
    <motion.span
      initial={{ opacity: 0, y: 30, filter: "blur(8px)", rotateX: -45 }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", rotateX: 0 }}
      exit={{ opacity: 0, y: -30, filter: "blur(8px)", rotateX: 45 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, mass: 1 }}
      className="inline-block transform-gpu"
      style={{ perspective: "1000px" }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
};

export default function UnifiedCommandCenter({
  summaryData,
  activeFilterCount,
  onOpenFilters,
  isLoading = false,
}: UnifiedCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<MetricKey>("screened");

  const config = METRICS_CONFIG[activeTab];
  const Icon = config.icon;

  const totalValue = summaryData ? config.getTotal(summaryData) : 0;
  const todayValue = summaryData ? config.getToday(summaryData) : null;

  return (
    <div className="relative w-full rounded-[2.5rem] bg-gradient-to-br from-white/90 via-white/50 to-white/90 backdrop-blur-[40px] saturate-[120%] border border-white/80 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(255,255,255,0.3)] overflow-hidden group">

      {/* Liquid Reflection Sweep running across the container */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] skew-x-[-15deg] group-hover:translate-x-[200%] transition-transform duration-[2500ms] ease-in-out pointer-events-none z-0" />

      {/* High-Fidelity Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E)" }}
      />

      {/* Extreme Liquid Glass Morphing Background Blob */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem] z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 0.7, 0.8, 0.7],
              scale: [0.8, 1, 1.1, 1],
              rotate: [0, 90, 180, 270, 360],
              borderRadius: ["40% 60% 70% 30%", "30% 70% 40% 60%", "60% 40% 50% 50%", "40% 60% 70% 30%"]
            }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(40px)" }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
              opacity: { duration: 1 }
            }}
            className={cn("absolute -top-[20%] -right-[10%] w-[900px] h-[900px] blur-[100px] bg-gradient-to-br mix-blend-multiply opacity-70 transition-colors duration-1000", config.bgGradient)}
          />
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-[440px]">
        {/* LEFT NAV/TABS */}
        <div className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/40 bg-white/20 p-6 sm:p-8 flex flex-col gap-8 shadow-[inset_-10px_0_30px_-20px_rgba(0,0,0,0.05)] backdrop-blur-md">

          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black tracking-[0.25em] uppercase text-slate-500/80 drop-shadow-sm">Command Center</h2>

            <button
              onClick={onOpenFilters}
              className="relative flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-b from-white/90 to-white/60 border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_2px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all group/filter backdrop-blur-xl duration-300"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-600 transition-transform group-hover/filter:scale-110" />
                <span className="text-[11px] font-bold text-slate-700">Filters</span>
              </div>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-white text-[9px] font-black flex items-center justify-center shadow-lg tabular-nums ring-2 ring-white/80">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar mask-edges">
            {(Object.keys(METRICS_CONFIG) as MetricKey[]).map((key) => {
              const tab = METRICS_CONFIG[key];
              const isActive = activeTab === key;
              const TabIcon = tab.icon;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "relative flex items-center gap-3.5 px-4 py-3.5 rounded-[1.25rem] transition-all duration-500 text-left min-w-[200px] lg:min-w-0 z-10 overflow-hidden transform-gpu",
                    isActive
                      ? "text-slate-900 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12),inset_0_2px_2px_rgba(255,255,255,0.9)] bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-xl border border-white/80 scale-[1.02]"
                      : "hover:bg-white/40 text-slate-500 hover:text-slate-800 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] border border-transparent hover:border-white/40"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-[0.85rem] flex items-center justify-center transition-all duration-500 relative z-10 shadow-sm",
                    isActive ? `${tab.glow} shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.1)]` : "bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200/60"
                  )}>
                    <TabIcon className={cn("w-4 h-4 transition-transform duration-500", isActive ? "text-white scale-110 drop-shadow-md" : "text-slate-400")} />
                  </div>

                  <span className={cn("text-[13px] font-bold tracking-wide relative z-10 transition-colors", isActive ? "text-slate-900" : "")}>
                    {tab.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="activeIndicatorLine"
                      className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-l-full shadow-[0_0_12px_rgba(var(--color),0.6)]", tab.glow)}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT MAIN DISPLAY */}
        <div className="flex-1 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95, y: 15, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, y: -15, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="max-w-2xl relative z-10"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/70 border border-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)] backdrop-blur-md mb-6 transition-all hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] cursor-default">
                <Sparkles className={cn("w-3.5 h-3.5 drop-shadow-sm", config.color)} />
                <h3 className={cn("text-[10px] font-extrabold uppercase tracking-[0.2em] leading-none translate-y-[0.5px]", config.color)}>
                  {config.label}
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-6 sm:gap-12 mb-8">
                {/* TOTAL SECTION */}
                <div className={cn(
                  "flex flex-col items-start gap-1 transition-opacity duration-300",
                  isLoading ? "opacity-50" : "opacity-100"
                )}>
                  <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-1 drop-shadow-sm">Total</span>
                  <h1 className={cn(
                    "text-7xl sm:text-[110px] font-black tracking-tighter tabular-nums leading-none transition-all duration-700",
                    // Fix: Use solid color + shadow for visibility, instead of transparent gradient which may fail in layout
                    "text-slate-900 drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                  )}>
                    <AnimatePresence mode="popLayout">
                      <AnimatedNumber key={`total-${activeTab}-${totalValue}`} value={totalValue} />
                    </AnimatePresence>
                  </h1>
                </div>
                
                {todayValue !== null && (
                  <div className={cn(
                    "flex items-center gap-8 transition-opacity duration-300",
                    isLoading ? "opacity-50" : "opacity-100"
                  )}>
                    {/* Vertical Divider */}
                    <div className="hidden sm:block w-[2px] h-20 bg-gradient-to-b from-transparent via-slate-200 to-transparent rotate-[12deg]" />
                    
                    {/* TODAY SECTION */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase px-2 py-0.5 rounded-md border border-slate-200/60 bg-slate-100/50 backdrop-blur-md">Today</span>
                      <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                        <AnimatePresence mode="popLayout">
                          <AnimatedNumber key={`today-${activeTab}-${todayValue}`} value={todayValue} />
                        </AnimatePresence>
                      </h2>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[18px] text-slate-600 font-semibold leading-relaxed max-w-lg mb-10 selection:bg-slate-200 drop-shadow-sm">
                {config.desc}
              </p>

              <div className="flex items-center gap-4">
                <Link href="/dashboard/vertex" className="group/btn relative flex items-center gap-3 px-8 py-4.5 bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/60 rounded-2xl text-[14px] font-extrabold text-white shadow-[0_12px_24px_-6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.5)] overflow-hidden transition-all hover:scale-[1.03] hover:shadow-[0_20px_40px_-6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] duration-300">

                  {/* Glossy Button Light Sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

                  {/* Liquid Glow underneath text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />

                  <span className="relative z-10 tracking-widest uppercase drop-shadow-md">Dive In</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center relative z-10 transition-transform group-hover/btn:translate-x-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/10">
                    <ChevronRight className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .mask-edges {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        @media (min-width: 1024px) {
          .mask-edges {
            mask-image: none;
          }
        }
      `}</style>
    </div>
  );
}
