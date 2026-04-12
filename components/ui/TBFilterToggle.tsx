'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
export type FilterMode = 'all' | 'suspected' | 'normal';

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  screening_date: string;
  submitted_on?: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  facility_name: string;
  screening_district: string;
  screening_state?: string;
  chest_x_ray_result?: string;
  xray_result?: string;
  symptoms_present?: string;
  kobo_uuid?: string;
  'Chest X-ray Result'?: string;
}

export interface TBFilterToggleProps {
  patients: Patient[];
  onFilterChange: (filtered: Patient[], mode: FilterMode) => void;
  className?: string;
}

// ─── Segment Definitions ─────────────────────────────────────────────
interface Segment {
  id: FilterMode;
  label: string;
}

const SEGMENTS: Segment[] = [
  { id: 'all', label: 'All Patients' },
  { id: 'suspected', label: 'Suspected TB' },
  { id: 'normal', label: 'Normal' },
];

// ─── Filter Logic ────────────────────────────────────────────────────
export function isSuspectedTB(p: Patient): boolean {
  return (
    p.xray_result === 'Suspected TB Case' ||
    p.chest_x_ray_result === 'Suspected TB Case' ||
    (p as unknown as Record<string, unknown>)['Chest X-ray Result'] === 'Suspected TB Case'
  );
}

function filterPatients(patients: Patient[], mode: FilterMode): Patient[] {
  switch (mode) {
    case 'suspected':
      return patients.filter(isSuspectedTB);
    case 'normal':
      return patients.filter((p) => !isSuspectedTB(p));
    case 'all':
    default:
      return patients;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────
const pillStyles: Record<FilterMode, {
  background: string;
  boxShadow: string;
}> = {
  all: {
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
  },
  suspected: {
    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    boxShadow: '0 3px 10px rgba(245,158,11,0.40)',
  },
  normal: {
    background: 'linear-gradient(135deg, #10B981, #059669)',
    boxShadow: '0 3px 10px rgba(16,185,129,0.38)',
  },
};

// ─── Component ───────────────────────────────────────────────────────
export function TBFilterToggle({ patients, onFilterChange, className = '' }: TBFilterToggleProps) {
  const [active, setActive] = useState<FilterMode>('all');
  const announceRef = useRef<HTMLSpanElement>(null);

  // Compute counts
  const counts = useMemo(() => {
    const suspected = patients.filter(isSuspectedTB).length;
    return {
      all: patients.length,
      suspected,
      normal: patients.length - suspected,
    };
  }, [patients]);

  // Emit filtered results
  const handleSwitch = useCallback(
    (mode: FilterMode) => {
      setActive(mode);
      const filtered = filterPatients(patients, mode);
      onFilterChange(filtered, mode);
    },
    [patients, onFilterChange],
  );

  // Re-filter when upstream patients change
  useEffect(() => {
    const filtered = filterPatients(patients, active);
    onFilterChange(filtered, active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients]);

  // Screen reader announcement
  useEffect(() => {
    if (announceRef.current) {
      const label = SEGMENTS.find((s) => s.id === active)?.label ?? 'All';
      announceRef.current.textContent = `Showing ${counts[active]} ${label} patients`;
    }
  }, [active, counts]);

  return (
    <div className={className}>
      {/* Container pill */}
      <div
        role="group"
        aria-label="Filter patients by TB screening result"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: 3,
          background: '#F0EFEB',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 999,
          position: 'relative',
          height: 36,
        }}
      >
        {SEGMENTS.map((seg) => {
          const isActive = active === seg.id;
          const count = counts[seg.id];

          return (
            <button
              key={seg.id}
              type="button"
              role="button"
              aria-pressed={isActive}
              onClick={() => handleSwitch(seg.id)}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                height: 30,
                padding: '0 14px',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.07em',
                cursor: 'pointer',
                userSelect: 'none' as const,
                whiteSpace: 'nowrap' as const,
                border: 'none',
                background: 'transparent',
                color: isActive
                  ? seg.id === 'all'
                    ? '#374151'
                    : '#ffffff'
                  : '#9CA3AF',
                transition: 'color 150ms ease',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget.style.color = '#4B5563');
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget.style.color = '#9CA3AF');
              }}
              className="tb-filter-btn"
            >
              {/* Animated Pill — only on the active segment */}
              {isActive && (
                <motion.span
                  layoutId="tb-pill"
                  transition={{ type: 'spring', stiffness: 550, damping: 38, mass: 0.7 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: pillStyles[seg.id].background,
                    boxShadow: pillStyles[seg.id].boxShadow,
                    zIndex: -1,
                  }}
                  {...(seg.id === 'suspected' && {
                    initial: { scale: 0.97 },
                    animate: { scale: 1 },
                  })}
                />
              )}

              {/* Icon — All Patients active only */}
              <AnimatePresence>
                {isActive && seg.id === 'all' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <Users size={12} strokeWidth={2.5} color="#6B7280" />
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Pulsing dot + Alert icon — Suspected TB active only */}
              <AnimatePresence>
                {isActive && seg.id === 'suspected' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      gap: 4,
                    }}
                  >
                    <AlertTriangle size={12} strokeWidth={2.5} color="#ffffff" />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                        animation: 'tbPulse 2s ease-in-out infinite',
                      }}
                    />
                    <style>{`
                      @keyframes tbPulse {
                        0%, 100% { opacity: 0.9; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.3); }
                      }
                    `}</style>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* ShieldCheck icon — Normal active only */}
              <AnimatePresence>
                {isActive && seg.id === 'normal' && (
                  <motion.span
                    initial={{ opacity: 0, rotate: -15 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -15 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={12} strokeWidth={2.5} color="#ffffff" />
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Label text */}
              <span style={{ position: 'relative', zIndex: 1 }}>{seg.label}</span>

              {/* Count badge */}
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  height: 18,
                  minWidth: 18,
                  padding: '0 5px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  background: isActive
                    ? seg.id === 'all'
                      ? 'rgba(0,0,0,0.08)'
                      : 'rgba(255,255,255,0.28)'
                    : 'rgba(0,0,0,0.08)',
                  color: isActive
                    ? seg.id === 'all'
                      ? '#374151'
                      : '#ffffff'
                    : '#6B7280',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visually hidden live region for screen readers */}
      <span
        ref={announceRef}
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      {/* Focus ring styles */}
      <style>{`
        .tb-filter-btn:focus-visible {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
