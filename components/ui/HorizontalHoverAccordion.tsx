'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HorizontalHoverAccordionProps {
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
  isCurrent?: boolean;
  isAttentionRequired?: boolean;
  completionLabel?: string;
  pendingLabel?: string;
  currentLabel?: string;
  children: React.ReactNode;
}

export function HorizontalHoverAccordion({
  title,
  icon,
  isComplete,
  isCurrent = false,
  isAttentionRequired = false,
  completionLabel = 'Submitted',
  pendingLabel = 'Pending',
  currentLabel = 'In Progress',
  children,
}: HorizontalHoverAccordionProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine color state
  const colorState = isComplete ? 'complete' : isCurrent ? 'current' : 'pending';
  
  const colors = {
    complete: {
      bg: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(22,163,74,0.15) 100%)',
      border: 'rgba(34,197,94,0.3)',
      shadow: '0 4px 24px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
      hoverShadow: '0 8px 48px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.7)',
      orb1: 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(74,222,128,0.4) 0%, transparent 70%)',
      iconBg: 'bg-emerald-500/25 text-emerald-400 border-emerald-500/40',
      iconShadow: '0 8px 32px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
      badgeDot: 'bg-emerald-400',
      indicator: 'bg-emerald-500',
      indicatorGlow: '0 0 24px rgba(34,197,94,0.7), 0 0 48px rgba(34,197,94,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(74,222,128,0.2))',
    },
    current: {
      bg: 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(202,138,4,0.15) 100%)',
      border: 'rgba(234,179,8,0.35)',
      shadow: '0 4px 24px rgba(234,179,8,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
      hoverShadow: '0 8px 48px rgba(234,179,8,0.3), inset 0 1px 0 rgba(255,255,255,0.7)',
      orb1: 'radial-gradient(circle, rgba(234,179,8,0.5) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)',
      iconBg: 'bg-amber-500/25 text-amber-400 border-amber-500/40',
      iconShadow: '0 8px 32px rgba(234,179,8,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
      badgeDot: 'bg-amber-400',
      indicator: 'bg-amber-500',
      indicatorGlow: '0 0 24px rgba(234,179,8,0.7), 0 0 48px rgba(234,179,8,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(234,179,8,0.45), rgba(250,204,21,0.25))',
    },
    pending: {
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.15) 100%)',
      border: 'rgba(239,68,68,0.3)',
      shadow: '0 4px 24px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
      hoverShadow: '0 8px 48px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.7)',
      orb1: 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(248,113,113,0.35) 0%, transparent 70%)',
      iconBg: 'bg-rose-500/25 text-rose-400 border-rose-500/40',
      iconShadow: '0 8px 32px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-rose-500/25 text-rose-300 border-rose-500/40',
      badgeDot: 'bg-rose-400',
      indicator: 'bg-rose-500',
      indicatorGlow: '0 0 24px rgba(239,68,68,0.7), 0 0 48px rgba(239,68,68,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(248,113,113,0.2))',
    },
  };

  const c = colors[colorState];
  const statusLabel = isComplete ? completionLabel : isCurrent ? currentLabel : pendingLabel;

  return (
    <motion.div
      className="relative flex-1 min-w-[80px] h-full rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: c.shadow,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        flex: 8,
        boxShadow: c.hoverShadow,
      }}
      initial={{ flex: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
    >
      {/* Ambient gradient orbs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-50"
        style={{ background: c.orb1 }}
      />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ background: c.orb2 }}
      />

      {/* Vertical title when collapsed */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap z-10"
        style={{
          opacity: isHovered ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500/80">
          {title}
        </span>
      </motion.div>

      {/* Content when expanded */}
      <motion.div
        className="absolute inset-0 p-6 flex flex-col justify-end z-20"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          transitionDelay: '0.1s',
          backdropFilter: 'blur(20px)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      >
        {/* Icon container */}
        <motion.div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-xl ${c.iconBg}`}
          style={{
            boxShadow: c.iconShadow,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isHovered ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          {icon}
        </motion.div>

        {/* Title */}
        <motion.h3 
          className="text-lg font-black text-white mb-2 tracking-tight"
          initial={{ y: 10, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          {title}
        </motion.h3>

        {/* Status badge */}
        <motion.div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-xl ${c.badgeBg}`}
          initial={{ y: 10, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${c.badgeDot}`} />
          {statusLabel}
        </motion.div>

        {/* Form fields */}
        <motion.div 
          className="space-y-4"
          initial={{ y: 10, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Attention indicator */}
      {isAttentionRequired && !isHovered && (
        <motion.div
          className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full z-10"
          style={{
            background: c.indicator,
            boxShadow: c.indicatorGlow,
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
        />
      )}

      {/* Status indicator */}
      {!isHovered && (
        <motion.div
          className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full z-10"
          style={{
            background: c.indicator,
            boxShadow: c.indicatorGlow,
          }}
        />
      )}

      {/* Subtle border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none z-30"
        style={{
          border: '2px solid transparent',
          background: c.borderGlow + ' border-box',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
    </motion.div>
  );
}
