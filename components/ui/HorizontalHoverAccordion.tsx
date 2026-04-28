'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

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

  const colorState = isComplete ? 'complete' : isCurrent ? 'current' : 'pending';

  const colors = {
    complete: {
      bg: 'linear-gradient(160deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.20) 50%, rgba(34,197,94,0.10) 100%)',
      border: 'rgba(34,197,94,0.35)',
      shadow: '0 4px 32px rgba(34,197,94,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
      hoverShadow: '0 12px 56px rgba(34,197,94,0.30), inset 0 1px 0 rgba(255,255,255,0.8)',
      orb1: 'radial-gradient(circle, rgba(34,197,94,0.55) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(74,222,128,0.45) 0%, transparent 70%)',
      iconBg: 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50',
      iconShadow: '0 8px 32px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40',
      badgeDot: 'bg-emerald-300',
      indicator: '#22c55e',
      indicatorGlow: '0 0 16px rgba(34,197,94,0.8), 0 0 40px rgba(34,197,94,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(34,197,94,0.5), rgba(74,222,128,0.3))',
      collapsedIconBg: 'bg-emerald-500/20 text-emerald-600',
      collapsedText: 'text-emerald-700',
      collapsedSubtext: 'text-emerald-600/70',
      collapsedDot: 'bg-emerald-500',
    },
    current: {
      bg: 'linear-gradient(160deg, rgba(234,179,8,0.15) 0%, rgba(202,138,4,0.20) 50%, rgba(234,179,8,0.10) 100%)',
      border: 'rgba(234,179,8,0.40)',
      shadow: '0 4px 32px rgba(234,179,8,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
      hoverShadow: '0 12px 56px rgba(234,179,8,0.35), inset 0 1px 0 rgba(255,255,255,0.8)',
      orb1: 'radial-gradient(circle, rgba(234,179,8,0.55) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(250,204,21,0.45) 0%, transparent 70%)',
      iconBg: 'bg-amber-500/30 text-amber-300 border border-amber-400/50',
      iconShadow: '0 8px 32px rgba(234,179,8,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-amber-400/20 text-amber-200 border border-amber-400/40',
      badgeDot: 'bg-amber-300',
      indicator: '#eab308',
      indicatorGlow: '0 0 16px rgba(234,179,8,0.8), 0 0 40px rgba(234,179,8,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(234,179,8,0.5), rgba(250,204,21,0.3))',
      collapsedIconBg: 'bg-amber-500/25 text-amber-600',
      collapsedText: 'text-amber-700',
      collapsedSubtext: 'text-amber-600/70',
      collapsedDot: 'bg-amber-500',
    },
    pending: {
      bg: 'linear-gradient(160deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.20) 50%, rgba(239,68,68,0.10) 100%)',
      border: 'rgba(239,68,68,0.35)',
      shadow: '0 4px 32px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
      hoverShadow: '0 12px 56px rgba(239,68,68,0.30), inset 0 1px 0 rgba(255,255,255,0.8)',
      orb1: 'radial-gradient(circle, rgba(239,68,68,0.50) 0%, transparent 70%)',
      orb2: 'radial-gradient(circle, rgba(248,113,113,0.40) 0%, transparent 70%)',
      iconBg: 'bg-rose-500/30 text-rose-300 border border-rose-400/50',
      iconShadow: '0 8px 32px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
      badgeBg: 'bg-rose-400/20 text-rose-200 border border-rose-400/40',
      badgeDot: 'bg-rose-300',
      indicator: '#ef4444',
      indicatorGlow: '0 0 16px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)',
      borderGlow: 'linear-gradient(135deg, rgba(239,68,68,0.5), rgba(248,113,113,0.3))',
      collapsedIconBg: 'bg-rose-500/20 text-rose-600',
      collapsedText: 'text-rose-700',
      collapsedSubtext: 'text-rose-500/70',
      collapsedDot: 'bg-rose-500',
    },
  };

  const c = colors[colorState];
  const statusLabel = isComplete ? completionLabel : isCurrent ? currentLabel : pendingLabel;

  return (
    <motion.div
      className="relative flex-1 min-w-[90px] h-full rounded-[20px] overflow-hidden cursor-pointer"
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
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
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: c.orb1 }}
      />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-45"
        style={{ background: c.orb2 }}
      />

      {/* ── Collapsed state: icon + title + status ── */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 px-2"
        style={{
          opacity: isHovered ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      >
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.collapsedIconBg}`}>
          {icon}
        </div>

        {/* Title */}
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.15em] text-center leading-tight ${c.collapsedText}`}>
          {title}
        </span>

        {/* Status dot + label */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${c.collapsedDot}`} />
          <span className={`text-[8px] font-bold uppercase tracking-wider ${c.collapsedSubtext}`}>
            {statusLabel}
          </span>
        </div>
      </motion.div>

      {/* ── Expanded state: full content ── */}
      <motion.div
        className="absolute inset-0 p-6 flex flex-col justify-end z-20"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          transitionDelay: '0.08s',
          backdropFilter: 'blur(24px) saturate(1.4)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.50) 40%, rgba(0,0,0,0.15) 70%, transparent 100%)',
        }}
      >
        {/* Icon container */}
        <motion.div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-xl ${c.iconBg}`}
          style={{ boxShadow: c.iconShadow }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={isHovered ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
        >
          {icon}
        </motion.div>

        {/* Title */}
        <motion.h3
          className="text-xl font-black text-white mb-1.5 tracking-tight leading-none"
          initial={{ y: 12, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 12, opacity: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          {title}
        </motion.h3>

        {/* Status badge */}
        <motion.div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5 backdrop-blur-xl ${c.badgeBg}`}
          initial={{ y: 12, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 12, opacity: 0 }}
          transition={{ delay: 0.22, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <span className={`w-2 h-2 rounded-full ${c.badgeDot}`} />
          {statusLabel}
        </motion.div>

        {/* Form fields */}
        <motion.div
          className="space-y-4"
          initial={{ y: 12, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 12, opacity: 0 }}
          transition={{ delay: 0.28, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Attention pulse indicator */}
      {isAttentionRequired && !isHovered && (
        <motion.div
          className="absolute top-4 right-4 w-3 h-3 rounded-full z-10"
          style={{
            background: c.indicator,
            boxShadow: c.indicatorGlow,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.6, 1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Status indicator dot (non-attention) */}
      {!isAttentionRequired && !isHovered && (
        <div
          className="absolute top-4 right-4 w-3 h-3 rounded-full z-10"
          style={{
            background: c.indicator,
            boxShadow: c.indicatorGlow,
          }}
        />
      )}

      {/* Border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-[20px] pointer-events-none z-30"
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
