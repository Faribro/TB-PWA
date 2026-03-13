'use client';

import { motion } from 'framer-motion';
import { DESIGN_TOKENS } from '@/lib/designTokens';

interface ColorLegendProps {
  className?: string;
}

const LEGEND_ITEMS = [
  {
    color: 'rgb(16, 185, 129)',
    label: 'High Yield (>10%)',
    description: 'Optimal Performance',
    emoji: '🟢',
  },
  {
    color: 'rgb(253, 224, 71)',
    label: 'Standard (5-10%)',
    description: 'On Track',
    emoji: '🟡',
  },
  {
    color: 'rgb(249, 115, 22)',
    label: 'Warning (2-5%)',
    description: 'Needs Review',
    emoji: '🟠',
  },
  {
    color: 'rgb(239, 68, 68)',
    label: 'Critical (<2%)',
    description: 'Quality Alert',
    emoji: '🔴',
  },
  {
    color: 'rgb(153, 27, 27)',
    label: 'SLA Breach (>80%)',
    description: 'Immediate Action Required',
    emoji: '🩸',
  },
];

export function ColorLegend({ className = '' }: ColorLegendProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`
        ${DESIGN_TOKENS.borderRadius.panel}
        ${DESIGN_TOKENS.border.inactive}
        ${DESIGN_TOKENS.background.panelLight}
        p-4
        ${className}
      `}
    >
      <div className={`${DESIGN_TOKENS.text.label} mb-4`}>
        Yield Performance Scale
      </div>

      <div className="space-y-5">
        {LEGEND_ITEMS.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-start gap-3"
          >
            {/* Color Circle */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: item.color }}
            />

            {/* Label + Description */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-white mb-0.5">
                {item.emoji} {item.label}
              </div>
              <div className="text-[10px] text-slate-400">
                {item.description}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="text-[10px] text-slate-500">
          <span className="font-semibold text-slate-400">Yield:</span> Sputum Tests / Total Screened
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Height = Patient Volume
        </div>
      </div>

      {/* Task 4: Choropleth Gradient Bar */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className={`${DESIGN_TOKENS.text.label} mb-3`}>
          District SLA Breach Rate
        </div>
        
        {/* Horizontal Gradient Bar */}
        <div className="relative h-8 rounded-lg overflow-hidden" style={{
          background: 'linear-gradient(to right, rgb(16, 185, 129), rgb(34, 197, 94), rgb(253, 224, 71), rgb(249, 115, 22), rgb(153, 27, 27))'
        }}>
          {/* Tick marks */}
          <div className="absolute inset-0 flex justify-between items-end pb-1 px-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <div key={val} className="flex flex-col items-center">
                <div className="w-px h-2 bg-white/40" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        
        <div className="text-[10px] text-slate-500 mt-2">
          Click district floor to filter & fly
        </div>
      </div>
    </motion.div>
  );
}
