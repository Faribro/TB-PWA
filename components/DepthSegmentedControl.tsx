'use client';

import { motion } from 'framer-motion';
import { Globe, Building2, Hospital } from 'lucide-react';
import { DESIGN_TOKENS } from '@/lib/designTokens';

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
  const activeIndex = DEPTH_OPTIONS.findIndex(opt => opt.value === value);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={`
        ${DESIGN_TOKENS.backdropBlur}
        ${DESIGN_TOKENS.background.panel}
        ${DESIGN_TOKENS.border.inactive}
        ${DESIGN_TOKENS.borderRadius.panel}
        ${DESIGN_TOKENS.shadow.md}
        p-1
        inline-flex items-center gap-1
      `}
    >
      {DEPTH_OPTIONS.map((option, index) => {
        const isActive = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              relative px-4 py-2
              ${DESIGN_TOKENS.borderRadius.button}
              ${DESIGN_TOKENS.transition.fast}
              flex items-center gap-2
              text-sm font-semibold
              hover:-translate-y-0.5 active:scale-95
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
              z-10
            `}
          >
            {/* Active background pill */}
            {isActive && (
              <motion.div
                layoutId="activeDepth"
                className="absolute inset-0 bg-purple-500/30 border-2 border-purple-500/60 rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            {/* Icon + Label */}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
