'use client';

import { motion } from 'framer-motion';
import { Users, UserCheck, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveMetric = 'screened' | 'diagnosed' | 'initiated' | 'completed' | 'breaches';

interface MapKPIOverlayProps {
  activeMetric: ActiveMetric;
  onMetricChange: (metric: ActiveMetric) => void;
}

const METRICS = [
  { value: 'screened' as const, label: 'Throughput', icon: Users, color: 'blue' },
  { value: 'diagnosed' as const, label: 'Detection', icon: UserCheck, color: 'emerald' },
  { value: 'initiated' as const, label: 'Initiation', icon: Activity, color: 'indigo' },
  { value: 'completed' as const, label: 'Success', icon: CheckCircle, color: 'emerald' },
  { value: 'breaches' as const, label: 'SLA Alerts', icon: AlertTriangle, color: 'rose' },
];

export function MapKPIOverlay({ activeMetric, onMetricChange }: MapKPIOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className="absolute top-8 right-8 z-40 font-outfit"
    >
      <div className="glass-light border border-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-[32px] p-6 w-56 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] relative z-10">Intelligence Layer</div>
        
        <div className="flex flex-col gap-3 relative z-10">
          {METRICS.map((metric, idx) => {
            const isActive = metric.value === activeMetric;
            const Icon = metric.icon;

            return (
              <motion.button
                key={metric.value}
                onClick={() => onMetricChange(metric.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-3 border shadow-sm",
                  isActive 
                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20" 
                    : "bg-white/50 text-slate-500 border-slate-200/60 hover:bg-white hover:border-slate-300 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-white/20" : "bg-slate-100"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{metric.label}</span>
                {isActive && (
                   <motion.div 
                     layoutId="metric-dot"
                     className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" 
                   />
                )}
              </motion.button>
            );
          })}
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Map Feed: Synchronized</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
