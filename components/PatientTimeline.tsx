"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle,
  CheckCircle2,
  Clock,
  Microscope,
  ScanLine,
  Shield,
  Truck,
} from "lucide-react";

type StepStatus = 'complete' | 'active' | 'pending';

interface TimelineStep {
  id: number;
  dayLabel: string;
  title: string;
  description: string;
  stat: string;
  icon: React.ReactNode;
  status: StepStatus;
  completedAt?: string;
  completedBy?: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 1,
    dayLabel: "Day 0",
    title: "Barrack Deployment",
    description: "Mobile X-Ray van arrives at barrack. Patient registered, consent taken, biometric ID tagged in real time.",
    stat: "~4 min/patient",
    icon: <Truck className="w-4 h-4" />,
    status: "complete",
    completedAt: "Apr 11, 2025",
    completedBy: "Dr. Sharma",
  },
  {
    id: 2,
    dayLabel: "Day 0",
    title: "X-Ray Capture",
    description: "Chest X-Ray acquired on-site. Image compressed and transmitted to AI inference server in under 30 seconds.",
    stat: "< 30 sec",
    icon: <ScanLine className="w-4 h-4" />,
    status: "complete",
    completedAt: "Apr 11, 2025",
  },
  {
    id: 3,
    dayLabel: "Day 0 +1h",
    title: "AI Analysis",
    description: "Neural network scores the radiograph. TB probability, confidence band, and lesion heatmap returned to clinician.",
    stat: "99.2% accuracy",
    icon: <Brain className="w-4 h-4" />,
    status: "complete",
    completedAt: "Apr 11, 2025",
  },
  {
    id: 4,
    dayLabel: "Day 1",
    title: "Triage Decision",
    description: "High-probability suspects surfaced for medical officer review. Priority queue generated. Field team alerted.",
    stat: "342 flagged",
    icon: <AlertCircle className="w-4 h-4" />,
    status: "active",
  },
  {
    id: 5,
    dayLabel: "Day 2–3",
    title: "CBNAAT / Truenat",
    description: "Sputum sample collected and processed. Microbiological confirmation via WHO-approved rapid molecular test.",
    stat: "< 2h result",
    icon: <Microscope className="w-4 h-4" />,
    status: "pending",
  },
  {
    id: 6,
    dayLabel: "Day 3–5",
    title: "Treatment Initiated",
    description: "Confirmed cases enrolled in RNTCP. DOTS therapy initiated. District nodal officer and NIKSHAY portal notified.",
    stat: "89 confirmed",
    icon: <CheckCircle className="w-4 h-4" />,
    status: "pending",
  },
];


export default function PatientTimeline() {
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const completedSteps = TIMELINE_STEPS.filter(s => s.status === 'complete').length;
  const totalSteps = TIMELINE_STEPS.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl shadow-slate-950/50"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* HEADER */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Activity className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-400">
                Clinical Protocol
              </span>
            </div>
            <h2 className="text-[20px] font-black text-white tracking-tight leading-tight">
              From Screening to Treatment
            </h2>
            <p className="text-[12px] text-slate-400 font-medium mt-1">
              A structured 5-day clinical protocol — barrack to RNTCP enrollment.
            </p>
          </div>

          {/* Live stats pill */}
          <div className="flex-shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                {completedSteps}/{totalSteps} Complete
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-semibold text-slate-500">
                {progressPercent}% enrolled
              </span>
            </div>
          </div>
        </div>

        {/* Thin progress bar below header */}
        <div className="mt-4 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{
              boxShadow: '0 0 8px rgba(16,185,129,0.6)'
            }}
            initial={{ width: 0 }}
            animate={isVisible ? { width: `${progressPercent}%` } : { width: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </div>
      </div>

      {/* TIMELINE BODY */}
      <div className="relative px-6 py-6">
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -16 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
              transition={{ 
                delay: index * 0.1, 
                duration: 0.4, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="flex gap-4 relative"
            >
              {/* LEFT: Node indicator + connector */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Node circle */}
                <div
                  className={`
                    relative w-10 h-10 rounded-full flex items-center
                    justify-center flex-shrink-0 z-10
                    ${step.status === 'complete'
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : step.status === 'active'
                      ? 'bg-amber-500/20 border-2 border-amber-400'
                      : 'bg-white/[0.04] border border-white/[0.12]'}
                  `}
                  style={{
                    boxShadow: step.status === 'complete'
                      ? '0 0 0 4px rgba(16,185,129,0.10), 0 0 16px rgba(16,185,129,0.30)'
                      : step.status === 'active'
                      ? '0 0 0 4px rgba(245,158,11,0.10), 0 0 16px rgba(245,158,11,0.30)'
                      : 'none'
                  }}
                >
                  {/* Pulsing ring for active */}
                  {step.status === 'active' && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-amber-400"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Icon */}
                  <span className={`
                    ${step.status === 'complete' ? 'text-emerald-400'
                      : step.status === 'active' ? 'text-amber-400'
                      : 'text-slate-600'}
                  `}>
                    {step.status === 'complete'
                      ? <CheckCircle2 className="w-4 h-4" />
                      : step.icon
                    }
                  </span>
                </div>

                {/* Connector line */}
                {index < TIMELINE_STEPS.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[32px] mt-1">
                    <motion.div
                      className="w-full h-full rounded-full origin-top"
                      style={{
                        background: step.status === 'complete'
                          ? 'linear-gradient(to bottom, #10B981, rgba(16,185,129,0.3))'
                          : 'rgba(255,255,255,0.06)'
                      }}
                      initial={{ scaleY: 0 }}
                      animate={isVisible ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                    />
                  </div>
                )}
              </div>

              {/* RIGHT: Content card */}
              <div className={`
                flex-1 mb-5 rounded-xl p-4 border transition-all duration-200
                ${step.status === 'complete'
                  ? 'bg-emerald-500/[0.05] border-emerald-500/[0.15]'
                  : step.status === 'active'
                  ? 'bg-amber-500/[0.05] border-amber-500/[0.20]'
                  : 'bg-white/[0.02] border-white/[0.06]'}
              `}>
                {/* Top row: Day badge + Title + Status chip */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Day badge */}
                  <span className={`
                    text-[9px] font-extrabold uppercase tracking-[0.1em]
                    px-2 py-0.5 rounded-full border flex-shrink-0
                    ${step.status === 'complete'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : step.status === 'active'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-slate-500 bg-white/[0.04] border-white/[0.08]'}
                  `}>
                    {step.dayLabel}
                  </span>

                  <h3 className={`
                    text-[13px] font-extrabold tracking-tight flex-1
                    ${step.status === 'complete' ? 'text-white'
                      : step.status === 'active' ? 'text-amber-100'
                      : 'text-slate-500'}
                  `}>
                    {step.title}
                  </h3>

                  {/* Status chip */}
                  {step.status === 'complete' && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 flex-shrink-0">
                      Done
                    </span>
                  )}
                  {step.status === 'active' && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 flex-shrink-0 animate-pulse">
                      Current
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className={`
                  text-[12px] font-medium leading-relaxed
                  ${step.status === 'complete' ? 'text-slate-400'
                    : step.status === 'active' ? 'text-amber-200/70'
                    : 'text-slate-600'}
                `}>
                  {step.description}
                </p>

                {/* Metadata row */}
                {step.completedAt && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500">
                      Completed {step.completedAt}
                    </span>
                    {step.completedBy && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                        <span className="text-[10px] font-semibold text-slate-500">
                          {step.completedBy}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Stat badge */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`
                    w-1.5 h-1.5 rounded-full
                    ${step.status === 'complete' ? 'bg-emerald-500'
                      : step.status === 'active' ? 'bg-amber-400'
                      : 'bg-slate-600'}
                  `} />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {step.stat}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FOOTER STRIP */}
      <div className="relative px-6 pb-5 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-semibold text-slate-500">
                Complete
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-500">
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-[10px] font-semibold text-slate-500">
                Pending
              </span>
            </div>
          </div>

          {/* RNTCP badge */}
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <Shield className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              RNTCP Protocol
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}