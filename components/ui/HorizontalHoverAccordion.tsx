'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HorizontalHoverAccordionProps {
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
  isAttentionRequired?: boolean;
  completionLabel?: string;
  pendingLabel?: string;
  children: React.ReactNode;
}

export function HorizontalHoverAccordion({
  title,
  icon,
  isComplete,
  isAttentionRequired = false,
  completionLabel = 'Complete',
  pendingLabel = 'Pending',
  children,
}: HorizontalHoverAccordionProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative flex-1 min-w-[60px] h-full rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
      style={{
        background: isComplete ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.05)',
        border: isComplete ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.15)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ flex: 6 }}
      initial={{ flex: 1 }}
    >
      {/* Vertical title when collapsed */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap"
        style={{
          opacity: isHovered ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          {title}
        </span>
      </motion.div>

      {/* Content when expanded */}
      <motion.div
        className="absolute inset-0 p-4 flex flex-col justify-end"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease',
          transitionDelay: '0.1s',
          backdropFilter: 'blur(5px)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        }}
      >
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
            isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>

        {/* Status */}
        <p className="text-xs text-white/80 mb-3">
          {isComplete ? completionLabel : pendingLabel}
        </p>

        {/* Form fields */}
        <div className="space-y-3">{children}</div>
      </motion.div>

      {/* Attention indicator */}
      {isAttentionRequired && !isHovered && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      )}

      {/* Complete indicator */}
      {isComplete && !isHovered && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
      )}
    </motion.div>
  );
}
