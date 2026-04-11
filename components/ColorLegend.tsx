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
    <div className={`flex items-center gap-6 ${className}`}>
      {LEGEND_ITEMS.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2 group transition-all cursor-crosshair hover:scale-105">
          <div
            className="w-2.5 h-2.5 rounded-sm shadow-[0_0_15px_currentColor] border border-white/20 transition-all duration-300 group-hover:shadow-[0_0_20px_currentColor] group-hover:bg-white"
            style={{ backgroundColor: item.color, color: item.color }}
          />
          <span className="text-[10px] font-black tracking-widest uppercase text-[#999] group-hover:text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] transition-colors">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
