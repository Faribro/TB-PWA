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

// Severity-keyed style tokens — AWWWARDS REFINED
const SEVERITY_STYLES = {
  high: {
    bar: 'bg-gradient-to-b from-red-500 to-red-600',
    badge: 'bg-red-500/10 text-red-700 border-red-500/20 backdrop-blur-sm',
    icon: 'text-red-500',
    violation: 'text-red-700',
    cardBorder: 'border-red-500/20 hover:border-red-500/30',
    suggestion: 'bg-red-500/10 border-red-500/20 text-red-800',
  },
  medium: {
    bar: 'bg-gradient-to-b from-amber-400 to-amber-500',
    badge: 'bg-amber-500/10 text-amber-700 border-amber-500/20 backdrop-blur-sm',
    icon: 'text-amber-500',
    violation: 'text-amber-700',
    cardBorder: 'border-amber-500/20 hover:border-amber-500/30',
    suggestion: 'bg-amber-500/10 border-amber-500/20 text-amber-800',
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, height: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.5),
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={`
        group relative flex overflow-hidden
        bg-white/80 backdrop-blur-sm rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] 
        transition-all duration-300 cursor-default
        ${styles.cardBorder}
      `}
    >
      {/* ── Left severity bar ───────────────────────────────────────────── */}
      <motion.div 
        className={`w-1 shrink-0 ${styles.bar}`}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
        style={{ originY: 0 }}
      />

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2.5 p-4 min-w-0">

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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.3, duration: 0.4 }}
          className={`
            flex items-start gap-2.5 px-3.5 py-3
            rounded-xl border text-xs leading-relaxed backdrop-blur-sm
            ${styles.suggestion}
          `}
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
          <span>
            <span className="font-semibold">Quick Fix: </span>
            {violation.suggestion}
          </span>
        </motion.div>

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
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            className="
              group/btn relative flex items-center gap-1.5
              px-4 py-2 rounded-xl
              bg-gradient-to-br from-slate-900 to-slate-800
              hover:from-slate-800 hover:to-slate-700
              text-white text-xs font-semibold
              shadow-[0_4px_16px_rgba(15,23,42,0.3)]
              hover:shadow-[0_6px_24px_rgba(15,23,42,0.4)]
              transition-all duration-300 shrink-0 overflow-hidden
            "
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
            <span className="relative z-10">Resolve</span>
            <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover/btn:translate-x-0.5 transition-transform" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});
