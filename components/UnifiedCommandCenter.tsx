"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Target, Shield, Clock, HeartPulse, Filter, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  getTotal: (d: SummaryData) => number;
  getToday: (d: SummaryData) => number | null;
  desc: string;
}> = {
  screened: {
    id: "screened",
    label: "Total Screened",
    icon: Activity,
    color: "text-blue-600",
    bgGradient: "from-blue-500/20 to-cyan-500/5",
    glow: "bg-blue-500",
    getTotal: (d) => d.total,
    getToday: (d) => d.todayScreened,
    desc: "Total inmates passed through the initial X-ray screening protocol.",
  },
  suspected: {
    id: "suspected",
    label: "Suspected TB",
    icon: Target,
    color: "text-amber-600",
    bgGradient: "from-amber-500/20 to-orange-500/5",
    glow: "bg-amber-500",
    getTotal: (d) => d.suspected,
    getToday: (d) => d.todaySuspected,
    desc: "Inmates flagged via X-Ray or AI analysis requiring confirmatory testing.",
  },
  diagnosed: {
    id: "diagnosed",
    label: "Confirmed Diagnosed",
    icon: Shield,
    color: "text-emerald-600",
    bgGradient: "from-emerald-500/20 to-teal-500/5",
    glow: "bg-emerald-500",
    getTotal: (d) => d.diagnosed,
    getToday: (d) => d.todayDiagnosed,
    desc: "Inmates with a confirmed positive TB diagnosis via CBNAAT/Truenat.",
  },
  pending: {
    id: "pending",
    label: "Pending Action",
    icon: Clock,
    color: "text-indigo-600",
    bgGradient: "from-indigo-500/20 to-purple-500/5",
    glow: "bg-indigo-500",
    getTotal: (d) => d.pending,
    getToday: (d) => d.todayPending,
    desc: "Patients awaiting referral, diagnosis outcome, or RNTCP registration.",
  },
  treatment: {
    id: "treatment",
    label: "On Treatment",
    icon: HeartPulse,
    color: "text-pink-600",
    bgGradient: "from-pink-500/20 to-rose-500/5",
    glow: "bg-pink-500",
    getTotal: (d) => d.onTreatment,
    getToday: () => null, // Treatment naturally spans longer; today is less relevant
    desc: "Active inmates currently undergoing initiated Anti-TB Treatment (ATT).",
  },
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
    <div className="relative w-full rounded-[2.5rem] bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group">
      {/* Ambient background shift based on active tab */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] opacity-40 bg-gradient-to-br", config.bgGradient)}
          />
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* LEFT NAV/TABS */}
        <div className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 p-6 sm:p-8 flex flex-col gap-8">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest uppercase text-slate-400">Command Center</h2>
            
            <button
              onClick={onOpenFilters}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group/filter"
            >
              <Filter className="w-4 h-4 text-slate-600 transition-transform group-hover/filter:scale-110" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar mask-edges">
            {(Object.keys(METRICS_CONFIG) as MetricKey[]).map((key) => {
              const tab = METRICS_CONFIG[key];
              const isActive = activeTab === key;
              const TabIcon = tab.icon;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 text-left min-w-[180px] lg:min-w-0",
                    isActive ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50" : "hover:bg-slate-100/80 text-slate-500"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", isActive ? `${tab.color} ${tab.glow} bg-opacity-10` : "bg-transparent text-slate-400")}>
                    <TabIcon className="w-4 h-4" />
                  </div>
                  <span className={cn("text-[13px] font-bold tracking-wide", isActive ? "text-slate-900" : "text-slate-500")}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full", tab.glow)}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT MAIN DISPLAY */}
        <div className="flex-1 p-8 sm:p-12 lg:p-16 flex flex-col justify-center min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-white border border-slate-100", config.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className={cn("text-sm font-bold uppercase tracking-[0.2em]", config.color)}>
                  {config.label}
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-baseline gap-4 sm:gap-6 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl sm:text-8xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                    {totalValue.toLocaleString()}
                  </span>
                  <span className="text-lg font-bold text-slate-400 tracking-widest uppercase ml-2">Total</span>
                </div>
                
                {todayValue !== null && (
                  <>
                    <div className="hidden sm:block w-1.5 h-12 bg-slate-200 rounded-full rotate-12 mx-2" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-700 tracking-tighter tabular-nums text-opacity-80">
                        {todayValue.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-slate-400 tracking-widest uppercase ml-2">Today</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg mb-10">
                {config.desc}
              </p>

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-slate-800 hover:scale-[1.02] transition-all">
                  View Detailed Cohort
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
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
