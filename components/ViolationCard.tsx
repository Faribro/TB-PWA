'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, ArrowRight, ShieldAlert } from 'lucide-react';
import type { IntegrityViolation } from '@/hooks/useTruthEngine';

interface ViolationCardProps {
  violation: IntegrityViolation;
  onResolve: (violation: IntegrityViolation) => void;
  /** Index used to stagger the entrance animation */
  index?: number;
}

// Severity-keyed style tokens — defined outside component to avoid re-creation
const SEVERITY_STYLES = {
  high: {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: 'text-red-500',
    violation: 'text-red-700',
    cardBorder: 'border-red-100',
    suggestion: 'bg-red-50 border-red-100 text-red-800',
  },
  medium: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'text-amber-500',
    violation: 'text-amber-700',
    cardBorder: 'border-amber-100',
    suggestion: 'bg-amber-50 border-amber-100 text-amber-800',
  },
} as const;

export const ViolationCard = memo(function ViolationCard({
  violation,
  onResolve,
  index = 0,
}: ViolationCardProps) {
  const styles = SEVERITY_STYLES[violation.severity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.4),
        duration: 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        relative flex overflow-hidden
        bg-white rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)] hover:-translate-y-px
        transition-all duration-200 cursor-default
        ${styles.cardBorder}
      `}
    >
      {/* ── Left severity bar ───────────────────────────────────────────── */}
      <div className={`w-1 shrink-0 ${styles.bar}`} />

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-5 min-w-0">

        {/* Row 1: Patient name + severity badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className={`w-4 h-4 shrink-0 ${styles.icon}`} />
            <span className="font-semibold text-slate-900 text-sm truncate">
              {violation.patient.inmate_name || 'Unknown Patient'}
            </span>
          </div>
          <span
            className={`
              shrink-0 text-[10px] font-bold uppercase tracking-widest
              px-2.5 py-1 rounded-full border
              ${styles.badge}
            `}
          >
            {violation.severity}
          </span>
        </div>

        {/* Row 2: Facility + Unique ID (meta row) */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono -mt-1">
          {violation.patient.facility_name && (
            <span className="truncate">{violation.patient.facility_name}</span>
          )}
          {violation.patient.unique_id && (
            <>
              <span className="text-slate-200">·</span>
              <span className="truncate">{violation.patient.unique_id}</span>
            </>
          )}
        </div>

        {/* Row 3: Violation description */}
        <p className={`text-sm font-medium leading-relaxed ${styles.violation}`}>
          {violation.violation}
        </p>

        {/* Row 4: Quick Fix suggestion */}
        <div
          className={`
            flex items-start gap-2.5 px-3.5 py-3
            rounded-xl border text-xs leading-relaxed
            ${styles.suggestion}
          `}
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
          <span>
            <span className="font-semibold">Quick Fix: </span>
            {violation.suggestion}
          </span>
        </div>

        {/* Row 5: Impact score bar + Resolve button */}
        <div className="flex items-center justify-between gap-4 pt-0.5">

          {/* Mini impact score indicator */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              Impact
            </span>
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${violation.impactScore}%` }}
                transition={{ delay: index * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${styles.bar}`}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 shrink-0">
              {violation.impactScore}
            </span>
          </div>

          {/* Resolve CTA */}
          <motion.button
            type="button"
            onClick={() => onResolve(violation)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="
              flex items-center gap-1.5
              px-4 py-2 rounded-xl
              bg-slate-900 hover:bg-slate-700
              text-white text-xs font-semibold
              shadow-[0_2px_8px_rgba(15,23,42,0.25)]
              transition-colors duration-150 shrink-0
            "
          >
            Resolve
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});
