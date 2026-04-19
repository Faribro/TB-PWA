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
    bgGradient: "from-blue-200/40 via-cyan-100/20 to-transparent",
    glow: "bg-blue-500",
    textGradient: "from-blue-900 to-blue-600",
    getTotal: (d) => d.total,
    getToday: (d) => d.todayScreened,
    desc: "Cumulative inmates passed through the primary X-Ray and AI screening protocol.",
  },
  suspected: {
    id: "suspected",
    label: "Suspected TB",
    icon: Target,
    color: "text-amber-600",
    bgGradient: "from-amber-200/40 via-orange-100/20 to-transparent",
    glow: "bg-amber-500",
    textGradient: "from-amber-900 to-amber-600",
    getTotal: (d) => d.suspected,
    getToday: (d) => d.todaySuspected,
    desc: "Inmates flagged via X-Ray architecture requiring expedited CBNAAT confirmatory testing.",
  },
  diagnosed: {
    id: "diagnosed",
    label: "Confirmed Diagnosed",
    icon: Shield,
    color: "text-emerald-600",
    bgGradient: "from-emerald-200/40 via-teal-100/20 to-transparent",
    glow: "bg-emerald-500",
    textGradient: "from-emerald-900 to-emerald-600",
    getTotal: (d) => d.diagnosed,
    getToday: (d) => d.todayDiagnosed,
    desc: "Patients presenting a definitively positive TB diagnosis verified via Truenat/CBNAAT.",
  },
  pending: {
    id: "pending",
    label: "Pending Action",
    icon: Clock,
    color: "text-indigo-600",
    bgGradient: "from-indigo-200/40 via-purple-100/20 to-transparent",
    glow: "bg-indigo-500",
    textGradient: "from-indigo-900 to-indigo-600",
    getTotal: (d) => d.pending,
    getToday: (d) => d.todayPending,
    desc: "Critical pipeline blockage. Patients awaiting referral, definitive outcomes, or registration.",
  },
  treatment: {
    id: "treatment",
    label: "On Treatment",
    icon: HeartPulse,
    color: "text-pink-600",
    bgGradient: "from-pink-200/40 via-rose-100/20 to-transparent",
    glow: "bg-pink-500",
    textGradient: "from-pink-900 to-pink-600",
    getTotal: (d) => d.onTreatment,
    getToday: () => null,
    desc: "Active therapeutic cohorts currently undergoing initiated Anti-TB Treatment algorithms.",
  },
};

// Local component to handle number counting animation via framer motion
const AnimatedNumber = ({ value }: { value: number }) => {
  return (
    <motion.span
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="inline-block"
    >
      {value.toLocaleString()}
    </motion.span>
  );
};

export default function UnifiedCommandCenter({
  summaryData,
  activeFilterCount,
  onOpenFilters,
}: UnifiedCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<MetricKey>("screened");

  const config = METRICS_CONFIG[activeTab];
  const Icon = config.icon;

  const totalValue = summaryData ? config.getTotal(summaryData) : 0;
  const todayValue = summaryData ? config.getToday(summaryData) : null;

  return (
    <div className="relative w-full rounded-[2.5rem] bg-white/80 backdrop-blur-3xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] overflow-hidden group">
      
      {/* High-Fidelity Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E)" }}
      />

      {/* Dynamic Ambient Blur Glows - Follows Active Tab */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.2, x: -50 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className={cn("absolute -top-[30%] -right-[10%] w-[800px] h-[800px] rounded-full blur-[120px] bg-gradient-to-br", config.bgGradient)}
          />
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-[440px]">
        
        {/* LEFT NAV/TABS */}
        <div className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/50 bg-slate-50/40 p-6 sm:p-8 flex flex-col gap-8 shadow-[inset_-10px_0_20px_-20px_rgba(0,0,0,0.05)]">
          
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black tracking-[0.25em] uppercase text-slate-400">Command Center</h2>
            
            <button
              onClick={onOpenFilters}
              className="relative flex items-center justify-center px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-slate-300 transition-all group/filter"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-600 transition-transform group-hover/filter:scale-110" />
                <span className="text-[11px] font-bold text-slate-600">Filters</span>
              </div>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shadow-md tabular-nums px-1.5 min-w-[18px]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar mask-edges">
            {(Object.keys(METRICS_CONFIG) as MetricKey[]).map((key) => {
              const tab = METRICS_CONFIG[key];
              const isActive = activeTab === key;
              const TabIcon = tab.icon;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "relative flex items-center gap-3.5 px-4 py-3.5 rounded-[1.25rem] transition-all duration-500 text-left min-w-[200px] lg:min-w-0 z-10 overflow-hidden",
                    isActive ? "text-slate-900 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)] bg-white/90 backdrop-blur-md" : "hover:bg-slate-200/50 text-slate-500 hover:text-slate-700"
                  )}
                >
                  {/* Subtle active background glow */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-white z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 relative z-10 shadow-sm", 
                    isActive ? `${tab.glow} shadow-inner` : "bg-slate-100 border border-slate-200/60"
                  )}>
                    <TabIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                  </div>
                  
                  <span className={cn("text-[13px] font-bold tracking-wide relative z-10 transition-colors", isActive ? "text-slate-900" : "")}>
                    {tab.label}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicatorLine"
                      className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-l-full", tab.glow)}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl relative z-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 border border-slate-200/50 backdrop-blur-sm mb-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                <Sparkles className={cn("w-3.5 h-3.5", config.color)} />
                <h3 className={cn("text-[10px] font-bold uppercase tracking-[0.2em] leading-none translate-y-[0.5px]", config.color)}>
                  {config.label}
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-baseline gap-4 sm:gap-8 mb-6">
                <div className="flex items-baseline gap-2">
                  <h1 className={cn(
                    "text-7xl sm:text-[100px] font-black tracking-tighter tabular-nums drop-shadow-sm leading-none bg-clip-text text-transparent bg-gradient-to-br",
                    config.textGradient
                  )}>
                    <AnimatePresence mode="popLayout">
                      <AnimatedNumber key={`total-${activeTab}`} value={totalValue} />
                    </AnimatePresence>
                  </h1>
                  <span className="text-[15px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total</span>
                </div>
                
                {todayValue !== null && (
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-slate-300 to-transparent rotate-[15deg]" />
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                        <AnimatePresence mode="popLayout">
                          <AnimatedNumber key={`today-${activeTab}`} value={todayValue} />
                        </AnimatePresence>
                      </h2>
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 border px-2 py-0.5 rounded border-slate-200 bg-slate-50/50">Today</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[17px] text-slate-500 font-medium leading-relaxed max-w-lg mb-10 selection:bg-slate-200">
                {config.desc}
              </p>

              <div className="flex items-center gap-4">
                <Link href="/dashboard/vertex" className="group relative flex items-center gap-2 px-7 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[13px] font-bold text-white shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-4px_rgba(0,0,0,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                  <span className="relative z-10 tracking-wide">Dive In</span>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center relative z-10 transition-transform group-hover:translate-x-1">
                    <ChevronRight className="w-3.5 h-3.5 text-white/80" />
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
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
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
