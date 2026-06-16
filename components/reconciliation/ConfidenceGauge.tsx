'use client';

import { motion } from 'framer-motion';

interface ConfidenceGaugeProps {
  score: number;
  label?: string;
  tier?: 'high' | 'medium' | 'low';
}

export function ConfidenceGauge({ score, label = 'Confidence', tier }: ConfidenceGaugeProps) {
  const pct = Math.round(score * 100);
  
  const color = tier
    ? tier === 'high'
      ? 'bg-emerald-500'
      : tier === 'medium'
        ? 'bg-amber-500'
        : 'bg-slate-400'
    : pct >= 85
      ? 'bg-emerald-500'
      : pct >= 55
        ? 'bg-amber-500'
        : 'bg-slate-400';

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold text-slate-500 min-w-[32px] text-right">
        {pct}%
      </span>
    </div>
  );
}
