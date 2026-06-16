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
      className="relative bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-50/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* HEADER */}
      <div className="relative px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                Clinical Protocol
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
              From Screening to Treatment
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
              A structured 5-day clinical protocol — barrack deployment to RNTCP enrollment.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900">
                  {completedSteps}/{totalSteps}
                </span>
                <span className="text-xs font-medium text-slate-500">Complete</span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {progressPercent}% Progress
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={isVisible ? { width: `${progressPercent}%` } : { width: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>
      </div>

      {/* TIMELINE BODY */}
      <div className="relative px-8 py-8">
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ 
                delay: index * 0.08, 
                duration: 0.5, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="flex gap-5 relative"
            >
              {/* LEFT: Node indicator + connector */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Node circle */}
                <div
                  className={`
                    relative w-11 h-11 rounded-full flex items-center
                    justify-center flex-shrink-0 z-10 transition-all duration-300
                    ${step.status === 'complete'
                      ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                      : step.status === 'active'
                      ? 'bg-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]'
                      : 'bg-slate-100 border-2 border-slate-200'}
                  `}
                >
                  {/* Pulsing ring for active */}
                  {step.status === 'active' && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-amber-400"
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* Icon */}
                  <span className={`relative z-10 ${
                    step.status === 'complete' ? 'text-white'
                      : step.status === 'active' ? 'text-white'
                      : 'text-slate-400'
                  }`}>
                    {step.status === 'complete'
                      ? <CheckCircle2 className="w-5 h-5" />
                      : step.icon
                    }
                  </span>
                </div>

                {/* Connector line */}
                {index < TIMELINE_STEPS.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[48px] mt-2">
                    <motion.div
                      className="w-full h-full rounded-full origin-top"
                      style={{
                        background: step.status === 'complete'
                          ? 'linear-gradient(to bottom, #10B981, #D1FAE5)'
                          : '#E2E8F0'
                      }}
                      initial={{ scaleY: 0 }}
                      animate={isVisible ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{ delay: index * 0.08 + 0.3, duration: 0.6 }}
                    />
                  </div>
                )}
              </div>

              {/* RIGHT: Content card */}
              <div className={`
                flex-1 mb-6 rounded-2xl p-5 border transition-all duration-300
                ${step.status === 'complete'
                  ? 'bg-emerald-50/50 border-emerald-200/60 hover:bg-emerald-50 hover:shadow-sm'
                  : step.status === 'active'
                  ? 'bg-amber-50/50 border-amber-200/60 hover:bg-amber-50 hover:shadow-sm'
                  : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-50 hover:shadow-sm'}
              `}>
                {/* Top row: Day badge + Title */}
                <div className="flex items-center gap-3 mb-3">
                  {/* Day badge */}
                  <span className={`
                    text-[10px] font-bold uppercase tracking-[0.12em]
                    px-2.5 py-1 rounded-lg flex-shrink-0
                    ${step.status === 'complete'
                      ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                      : step.status === 'active'
                      ? 'text-amber-700 bg-amber-100 border border-amber-200'
                      : 'text-slate-600 bg-slate-100 border border-slate-200'}
                  `}>
                    {step.dayLabel}
                  </span>

                  <h3 className={`
                    text-base font-bold tracking-tight flex-1
                    ${step.status === 'complete' ? 'text-slate-900'
                      : step.status === 'active' ? 'text-slate-900'
                      : 'text-slate-500'}
                  `}>
                    {step.title}
                  </h3>

                  {/* Status chip */}
                  {step.status === 'complete' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 flex-shrink-0">
                      Done
                    </span>
                  )}
                  {step.status === 'active' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1 flex-shrink-0">
                      Current
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className={`
                  text-sm font-medium leading-relaxed mb-4
                  ${step.status === 'complete' ? 'text-slate-600'
                    : step.status === 'active' ? 'text-slate-700'
                    : 'text-slate-500'}
                `}>
                  {step.description}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Stat badge */}
                  <div className="flex items-center gap-2">
                    <span className={`
                      w-1.5 h-1.5 rounded-full
                      ${step.status === 'complete' ? 'bg-emerald-500'
                        : step.status === 'active' ? 'bg-amber-400'
                        : 'bg-slate-400'}
                    `} />
                    <span className="text-xs font-semibold text-slate-600">
                      {step.stat}
                    </span>
                  </div>

                  {step.completedAt && (
                    <>
                      <span className="w-px h-4 bg-slate-200" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">
                          {step.completedAt}
                        </span>
                      </div>
                    </>
                  )}

                  {step.completedBy && (
                    <>
                      <span className="w-px h-4 bg-slate-200" />
                      <span className="text-xs font-medium text-slate-500">
                        {step.completedBy}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FOOTER STRIP */}
      <div className="relative px-8 pb-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">
                Complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-slate-600">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-600">
                Pending
              </span>
            </div>
          </div>

          {/* RNTCP badge */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              RNTCP Protocol
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}