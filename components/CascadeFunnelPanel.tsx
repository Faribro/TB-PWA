'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingDown } from 'lucide-react';
import { DESIGN_TOKENS } from '@/lib/designTokens';

interface Patient {
  id: number;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
}

interface CascadeFunnelPanelProps {
  filteredPatients: Patient[];
  onClose: () => void;
}

export const CascadeFunnelPanel = memo(function CascadeFunnelPanel({
  filteredPatients,
  onClose,
}: CascadeFunnelPanelProps) {
  const cascadeData = useMemo(() => {
    const screened = filteredPatients.length;
    const diagnosed = filteredPatients.filter(
      (p) => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y'
    ).length;
    const initiated = filteredPatients.filter((p) => p.att_start_date).length;
    const completed = filteredPatients.filter((p) => p.att_completion_date).length;

    return [
      {
        label: 'Screened',
        count: screened,
        percentage: 100,
        color: 'bg-cyan-400',
        textColor: 'text-cyan-400',
      },
      {
        label: 'Diagnosed',
        count: diagnosed,
        percentage: screened > 0 ? (diagnosed / screened) * 100 : 0,
        color: 'bg-red-400',
        textColor: 'text-red-400',
        attrition: screened - diagnosed,
        attritionLabel: 'not diagnosed',
      },
      {
        label: 'Initiated ATT',
        count: initiated,
        percentage: screened > 0 ? (initiated / screened) * 100 : 0,
        color: 'bg-amber-400',
        textColor: 'text-amber-400',
        attrition: diagnosed - initiated,
        attritionLabel: 'not initiated',
      },
      {
        label: 'Completed',
        count: completed,
        percentage: screened > 0 ? (completed / screened) * 100 : 0,
        color: 'bg-emerald-400',
        textColor: 'text-emerald-400',
        attrition: initiated - completed,
        attritionLabel: 'not completed',
      },
    ];
  }, [filteredPatients]);

  const completionRate = cascadeData[0].count > 0
    ? ((cascadeData[3].count / cascadeData[0].count) * 100).toFixed(1)
    : '0.0';

  return (
    <motion.div
      initial={{ y: 400, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 400, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 ${DESIGN_TOKENS.zIndex.overlay} w-[800px]`}
    >
      <div className={`
        ${DESIGN_TOKENS.backdropBlur}
        ${DESIGN_TOKENS.background.panel}
        ${DESIGN_TOKENS.border.inactive}
        ${DESIGN_TOKENS.borderRadius.panel}
        ${DESIGN_TOKENS.shadow.glow.cyan}
        p-6
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">TB Treatment Cascade</h3>
            <p className="text-xs text-slate-400 mt-1">
              Completion Rate: <span className="text-emerald-400 font-bold">{completionRate}%</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`
              w-8 h-8 bg-slate-800 hover:bg-slate-700
              ${DESIGN_TOKENS.borderRadius.button}
              ${DESIGN_TOKENS.transition.fast}
              hover:-translate-y-1 active:scale-95
              flex items-center justify-center
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            `}
            aria-label="Close cascade panel"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Funnel Stages */}
        <div className="space-y-4">
          {cascadeData.map((stage, idx) => (
            <div key={stage.label}>
              {/* Attrition indicator */}
              {stage.attrition !== undefined && stage.attrition > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 + 0.05 }}
                  className="flex items-center gap-2 mb-2 ml-4"
                >
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400 font-semibold">
                    ▼ {stage.attrition.toLocaleString()} {stage.attritionLabel}
                  </span>
                </motion.div>
              )}

              {/* Stage bar */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{stage.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {stage.count.toLocaleString()} patients
                    </span>
                    <span className={`text-sm font-bold ${stage.textColor}`}>
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className={`w-full h-10 bg-slate-800/50 ${DESIGN_TOKENS.borderRadius.button} overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.percentage}%` }}
                    transition={{
                      duration: 0.8,
                      delay: idx * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`h-full ${stage.color} flex items-center justify-center`}
                  >
                    <span className="text-xs font-bold text-slate-900">
                      {stage.count.toLocaleString()}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
          Cascade reflects current filter selection
        </div>
      </div>
    </motion.div>
  );
});
