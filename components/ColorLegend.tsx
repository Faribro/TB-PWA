'use client';

import { motion } from 'framer-motion';

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
    <div className={`flex items-center gap-4 ${className}`}>
      {LEGEND_ITEMS.map((item, index) => (
        <div key={item.label} className="flex items-center gap-1.5 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
          <div
            className="w-2 h-2 rounded-[1px] shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[9px] font-bold tracking-widest uppercase text-[#999]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
