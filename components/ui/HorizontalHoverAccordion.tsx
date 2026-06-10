'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

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
  progress?: number; // 0-100 for care cascade visualization
  isExpanded?: boolean; // Forced expanded state from parent
  onClick?: () => void; // Click callback to trigger expansion from parent
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
  progress = 0,
  isExpanded,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HorizontalHoverAccordionProps) {
  const [isHovered, setIsHovered] = useState(false);

  const colorState = isComplete ? 'complete' : isCurrent ? 'current' : 'pending';

  // Premium glassmorphism + care cascade gradients
  const colors = {
    complete: {
      primary: '#10B981',
      rgb: '16, 185, 129',
      darkText: '#065F46', // Emerald-800
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
      glass: 'linear-gradient(145deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.20) 50%, rgba(4,120,87,0.08) 100%)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      glow: '0 0 0 1px rgba(16,185,129,0.5), 0 20px 40px rgba(16,185,129,0.25)',
      orb1: 'radial-gradient(circle at 20% 80%, rgba(16,185,129,0.6) 0%, transparent 50%)',
      orb2: 'radial-gradient(circle at 80% 20%, rgba(5,150,105,0.4) 0%, transparent 50%)',
    },
    current: {
      primary: '#F59E0B',
      rgb: '245, 158, 11',
      darkText: '#92400E', // Amber-800
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
      glass: 'linear-gradient(145deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.25) 50%, rgba(180,83,9,0.10) 100%)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
      glow: '0 0 0 1px rgba(245,158,11,0.6), 0 20px 40px rgba(245,158,11,0.3)',
      orb1: 'radial-gradient(circle at 20% 80%, rgba(245,158,11,0.65) 0%, transparent 50%)',
      orb2: 'radial-gradient(circle at 80% 20%, rgba(217,119,6,0.45) 0%, transparent 50%)',
    },
    pending: {
      primary: '#EF4444',
      rgb: '239, 68, 68',
      darkText: '#991B1B', // Rose-800
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
      glass: 'linear-gradient(145deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.20) 50%, rgba(185,28,28,0.08) 100%)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
      glow: '0 0 0 1px rgba(239,68,68,0.5), 0 20px 40px rgba(239,68,68,0.25)',
      orb1: 'radial-gradient(circle at 20% 80%, rgba(239,68,68,0.55) 0%, transparent 50%)',
      orb2: 'radial-gradient(circle at 80% 20%, rgba(220,38,38,0.4) 0%, transparent 50%)',
    },
  };

  const iconColors = {
    complete: 'text-emerald-500',
    current: 'text-amber-500',
    pending: 'text-rose-500',
  };

  const c = colors[colorState];
  const statusLabel = isComplete ? completionLabel : isCurrent ? currentLabel : pendingLabel;
  const StatusIcon = isComplete ? CheckCircle : isCurrent ? Clock : AlertCircle;

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
    console.log(`Care cascade step clicked: ${title}`);
  }, [onClick, title]);

  const shouldPulse = isCurrent || isAttentionRequired;
  
  // Unify hover state and forced expanded state from props
  const activeExpanded = isExpanded !== undefined ? (isExpanded || isHovered) : isHovered;

  return (
    <motion.div
      className="group relative flex-1 min-w-[100px] h-full rounded-3xl overflow-hidden cursor-pointer select-none transform-gpu will-change-[transform,box-shadow]"
      style={{
        background: c.glass,
        boxShadow: activeExpanded 
          ? `inset 0 1px 0 0 rgba(255,255,255,0.45), ${c.glow}` 
          : `inset 0 1px 0 0 rgba(255,255,255,0.45), 0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)`,
        backdropFilter: 'blur(12px) saturate(210%) brightness(102%)',
      }}
      animate={{
        flex: activeExpanded ? 3.5 : 1,
        boxShadow: isCurrent && !activeExpanded
          ? [
              `inset 0 1px 0 0 rgba(255,255,255,0.45), 0 8px 32px rgba(0,0,0,0.12), 0 0 20px -10px rgba(${c.rgb}, 0.25)`,
              `inset 0 1px 0 0 rgba(255,255,255,0.45), 0 8px 32px rgba(0,0,0,0.12), 0 0 40px -10px rgba(${c.rgb}, 0.4)`,
              `inset 0 1px 0 0 rgba(255,255,255,0.45), 0 8px 32px rgba(0,0,0,0.12), 0 0 20px -10px rgba(${c.rgb}, 0.25)`,
            ]
          : activeExpanded
            ? `inset 0 1px 0 0 rgba(255,255,255,0.45), ${c.glow}`
            : `inset 0 1px 0 0 rgba(255,255,255,0.45), 0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)`
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        boxShadow: isCurrent && !activeExpanded
          ? { type: 'tween', duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'tween', duration: 0.4, ease: 'easeInOut' }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave();
      }}
      onClick={handleClick}
    >
      {/* Premium animated background orbs */}
      <div
        className="absolute inset-0 opacity-75 pointer-events-none"
        style={{
          background: `
            ${c.orb1}, 
            ${c.orb2}
          `,
        }}
      />
      
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: c.shimmer,
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPositionX: isHovered ? ['0%', '200%', '0%'] : '0%',
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Collapsed state - Ultra premium compact view */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-20 p-3"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ 
          opacity: activeExpanded ? 0 : 1, 
          scale: activeExpanded ? 0.95 : 1 
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Premium icon with glassmorphism */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border animate-none"
          style={{
            background: `linear-gradient(145deg, ${c.primary}20, ${c.primary}10)`,
            borderColor: `${c.primary}40`,
            boxShadow: `0 8px 32px ${c.primary}30, inset 0 1px 0 rgba(255,255,255,0.6)`,
          }}
        >
          <StatusIcon size={20} className={`${iconColors[colorState]} drop-shadow-sm`} />
        </div>

        {/* Compact title */}
        <motion.p
          className="text-xs font-extrabold uppercase tracking-[0.15em] text-center leading-tight"
          style={{ color: c.darkText, textShadow: '0 1px 1px rgba(255,255,255,0.3)' }}
          animate={{ y: [0, -1, 1, 0] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
        >
          {title}
        </motion.p>

        {/* Progress ring + status */}
        <div className="flex items-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 36 36">
            <motion.circle
              cx="18" cy="18" r="15.5"
              fill="none"
              strokeWidth="2"
              stroke={`${c.primary}20`}
              strokeLinecap="round"
              pathLength={1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              strokeWidth="2"
              stroke={`${c.primary}60`}
              strokeLinecap="round"
              pathLength={0.3}
            />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.darkText }}>
            {statusLabel}
          </span>
        </div>
      </motion.div>

      {/* Expanded state - Award-winning content panel */}
      <AnimatePresence mode="wait">
        {activeExpanded && (
          <motion.div
            className="absolute inset-0 p-6 flex flex-col z-30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
              backdropFilter: 'blur(32px) saturate(200%) brightness(1.1)',
            }}
          >
            {/* Enhanced title with shine effect */}
            <motion.h3
              className="text-2xl font-black mb-6 pb-2 relative"
              style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              whileHover={{ scale: 1.02 }}
            >
              {title}
              <motion.div
                className="absolute -top-1 left-0 h-1 w-16 rounded-full"
                style={{ background: c.gradient }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              />
            </motion.h3>

            {/* Premium content area with subtle grid overlay */}
            <div
              className="space-y-5 flex-1 relative"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {children}
              </motion.div>
            </div>

            {/* Action chevron */}
            <motion.div
              className="flex items-center justify-center mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <ChevronRight size={24} className={`text-white/70 group-hover:text-white transition-colors`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicator ball */}
      <motion.div
        className="absolute top-4 right-4 w-4 h-4 rounded-full z-40"
        style={{ background: c.gradient }}
        animate={shouldPulse ? {
          scale: [1, 1.25, 1],
          boxShadow: [
            `0 0 0 0 ${c.primary}60`,
            `0 0 12px 4px ${c.primary}40`,
            `0 0 20px 8px ${c.primary}20`,
            `0 0 0 0 ${c.primary}60`,
          ],
        } : {
          scale: 1,
          boxShadow: `0 2px 6px ${c.primary}40`,
        }}
        transition={{
          scale: shouldPulse
            ? { type: 'tween', duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 300, damping: 20 },
          boxShadow: shouldPulse
            ? { type: 'tween', duration: 2, repeat: Infinity, ease: 'easeOut' }
            : { type: 'tween', duration: 0.4, ease: 'easeOut' }
        }}
      />
    </motion.div>
  );
}
