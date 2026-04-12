'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
export interface ClinicalAccordionProps {
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
  isAttentionRequired?: boolean;
  defaultOpen?: boolean;
  completionLabel?: string;
  pendingLabel?: string;
  children: React.ReactNode;
}

// ─── Keyframe Styles ──────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes pulseGreen {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(16,185,129,0.20),
                0 0 6px rgba(16,185,129,0.60),
                0 0 12px rgba(16,185,129,0.30);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(16,185,129,0.10),
                0 0 10px rgba(16,185,129,0.80),
                0 0 20px rgba(16,185,129,0.40);
  }
}
@keyframes pulseRed {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(239,68,68,0.20),
                0 0 6px rgba(239,68,68,0.60),
                0 0 12px rgba(239,68,68,0.30);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239,68,68,0.10),
                0 0 10px rgba(239,68,68,0.80),
                0 0 20px rgba(239,68,68,0.40);
  }
}
`;

// ─── Component ────────────────────────────────────────────────────────
export function ClinicalAccordion({
  title,
  icon,
  isComplete,
  isAttentionRequired = false,
  defaultOpen = false,
  completionLabel = 'Complete',
  pendingLabel = 'Pending',
  children,
}: ClinicalAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          background: isComplete ? '#FAFFFE' : '#ffffff',
          borderRadius: 16,
          border: isOpen
            ? isComplete
              ? '1px solid rgba(16,185,129,0.30)'
              : '1px solid rgba(239,68,68,0.25)'
            : isComplete
              ? '1px solid rgba(16,185,129,0.15)'
              : '1px solid rgba(239,68,68,0.12)',
          overflow: 'hidden',
          transition: 'all 250ms ease',
          boxShadow: isOpen
            ? isComplete
              ? '0 4px 20px rgba(16,185,129,0.10)'
              : '0 4px 20px rgba(239,68,68,0.08)'
            : isComplete
              ? '0 1px 3px rgba(16,185,129,0.04)'
              : '0 1px 3px rgba(239,68,68,0.04)',
        }}
      >
        {/* ── Header row ── */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="clinical-accordion-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            cursor: 'pointer',
            position: 'relative',
            width: '100%',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
          }}
        >
          {/* Neon dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              position: 'relative',
              background: isComplete
                ? 'radial-gradient(circle, #34D399, #10B981)'
                : 'radial-gradient(circle, #FC8181, #EF4444)',
              animation: isComplete
                ? 'pulseGreen 2.5s ease-in-out infinite'
                : 'pulseRed 2s ease-in-out infinite',
            }}
          />

          {/* Section icon */}
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: isComplete
                ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(220,38,38,0.06))',
              border: isComplete
                ? '1px solid rgba(16,185,129,0.20)'
                : '1px solid rgba(239,68,68,0.18)',
              color: isComplete ? '#10B981' : '#EF4444',
            }}
          >
            {icon}
          </span>

          {/* Title + status label */}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#0F172A',
              }}
            >
              {title}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                marginTop: 1,
                color: isComplete ? '#059669' : '#DC2626',
              }}
            >
              {isComplete ? completionLabel : pendingLabel}
            </span>
          </span>

          {/* Attention required badge */}
          {isAttentionRequired && (
            <span
              style={{
                height: 20,
                padding: '0 8px',
                background: 'rgba(239,68,68,0.08)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginRight: 8,
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Attention Required
            </span>
          )}

          {/* Animated Chevron */}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ flexShrink: 0, display: 'inline-flex' }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.span>
        </button>

        {/* ── Expandable content ── */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '16px 16px 20px',
                  borderTop: isComplete
                    ? '1px solid rgba(16,185,129,0.10)'
                    : '1px solid rgba(239,68,68,0.08)',
                  background: isComplete
                    ? 'rgba(240,253,249,0.5)'
                    : 'rgba(255,249,249,0.5)',
                }}
              >
                <div className="space-y-4">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Focus ring + hover styles */}
      <style>{`
        .clinical-accordion-header:hover {
          background: ${isComplete ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)'} !important;
        }
        .clinical-accordion-header:focus-visible {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
