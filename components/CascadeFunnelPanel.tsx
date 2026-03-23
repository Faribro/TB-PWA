'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        glow: 'shadow-blue-500/20'
      },
      {
        label: 'Diagnosed',
        count: diagnosed,
        percentage: screened > 0 ? (diagnosed / screened) * 100 : 0,
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
        glow: 'shadow-rose-500/20',
        attrition: screened - diagnosed,
        attritionLabel: 'not diagnosed',
      },
      {
        label: 'Initiated ATT',
        count: initiated,
        percentage: screened > 0 ? (initiated / screened) * 100 : 0,
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        glow: 'shadow-amber-500/20',
        attrition: diagnosed - initiated,
        attritionLabel: 'not initiated',
      },
      {
        label: 'Completed',
        count: completed,
        percentage: screened > 0 ? (completed / screened) * 100 : 0,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        glow: 'shadow-emerald-500/20',
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
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-[800px] pointer-events-auto"
    >
      <div className="glass-light border border-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-[40px] p-8 relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-2xl">
              <TrendingDown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Treatment Cascade</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Global Success Efficiency:</span>
                <span className="text-base font-black text-emerald-600 tracking-tighter">{completionRate}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-all hover:rotate-90 active:scale-95 shadow-sm"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Funnel Table */}
        <div className="grid grid-cols-4 gap-6">
          {cascadeData.map((stage, idx) => (
            <motion.div 
              key={stage.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col"
            >
              {/* Stage Bar */}
              <div className="flex-1 flex flex-col justify-end min-h-[180px] relative p-1">
                {/* Attrition Floating Indicator */}
                {stage.attrition !== undefined && stage.attrition > 0 && (
                   <div className="absolute top-0 left-0 w-full flex flex-col items-center">
                     <div className="text-[11px] font-black text-rose-500/60 uppercase tracking-tighter mb-1">
                       -{stage.attrition.toLocaleString()}
                     </div>
                     <div className="w-px h-10 bg-gradient-to-b from-rose-500/20 to-transparent" />
                   </div>
                )}

                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${stage.percentage}%` }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.1 }}
                  className={cn(
                    "w-full rounded-[24px] relative group overflow-hidden shadow-2xl",
                    stage.color,
                    stage.glow
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                    <span className="text-xl font-black text-white drop-shadow-md">
                      {stage.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Subtle Grain Overlay */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </motion.div>
              </div>

              {/* Label Info */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1.5">{stage.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-950 tracking-tighter">{stage.count.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Case Units</span>
                </div>
                <div className={cn("h-1.5 w-8 rounded-full mt-3", stage.color)} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Cascade Projection • Live Intelligence</p>
        </div>
      </div>
    </motion.div>
  );
});
