'use client';

import { motion } from 'framer-motion';
import { Layers, Globe, Building2, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepthSegmentedControlProps {
  value: 'auto' | 'state' | 'district' | 'facility';
  onChange: (value: 'auto' | 'state' | 'district' | 'facility') => void;
}

const DEPTH_OPTIONS = [
  { value: 'state' as const, label: 'State', icon: Globe },
  { value: 'district' as const, label: 'District', icon: Building2 },
  { value: 'facility' as const, label: 'Facility', icon: Hospital },
];

export function DepthSegmentedControl({ value, onChange }: DepthSegmentedControlProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute bottom-10 left-12 z-40 font-outfit"
    >
      <div className="glass-light border border-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-[32px] p-2 flex items-center gap-1.5 border-2">
        <div className="px-4 py-2 mr-2 border-r border-slate-100 flex items-center gap-3">
           <Layers className="w-4 h-4 text-slate-400" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution</span>
        </div>
        
        {DEPTH_OPTIONS.map((option) => {
          const isActive = option.value === value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative h-11 px-6 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-wider transition-all group",
                isActive ? "text-slate-950" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDepth"
                  className="absolute inset-0 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}

              <Icon className={cn(
                "w-4 h-4 relative z-10 transition-transform duration-300",
                isActive ? "text-blue-600 scale-110" : "group-hover:text-blue-400"
              )} />
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
