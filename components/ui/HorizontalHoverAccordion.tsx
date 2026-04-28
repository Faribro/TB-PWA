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
      className="relative flex-1 min-w-[80px] h-full rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: isComplete 
          ? 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(5,150,105,0.08) 100%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.03) 0%, rgba(220,38,38,0.06) 100%)',
        border: isComplete 
          ? '1px solid rgba(16,185,129,0.15)' 
          : '1px solid rgba(239,68,68,0.12)',
        boxShadow: isComplete
          ? '0 4px 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
          : '0 4px 20px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        flex: 8,
        boxShadow: isComplete
          ? '0 8px 40px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 8px 40px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
      initial={{ flex: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
    >
      {/* Ambient gradient orbs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{
          background: isComplete 
            ? 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)',
        }}
      />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
        style={{
          background: isComplete 
            ? 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(248,113,113,0.25) 0%, transparent 70%)',
        }}
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
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-xl ${
            isComplete 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
          style={{
            boxShadow: isComplete
              ? '0 8px 32px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 8px 32px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
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
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-xl ${
            isComplete 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
          initial={{ y: 10, opacity: 0 }}
          animate={isHovered ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {isComplete ? completionLabel : pendingLabel}
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
          className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-rose-500 z-10"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
          style={{
            boxShadow: '0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3)',
          }}
        />
      )}

      {/* Complete indicator */}
      {isComplete && !isHovered && (
        <motion.div
          className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-emerald-500 z-10"
          style={{
            boxShadow: '0 0 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.25)',
          }}
        />
      )}

      {/* Subtle border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none z-30"
        style={{
          border: '2px solid transparent',
          background: isComplete
            ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(52,211,153,0.1)) border-box'
            : 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(248,113,113,0.1)) border-box',
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
