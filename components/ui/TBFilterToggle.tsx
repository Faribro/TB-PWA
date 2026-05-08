'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
export type FilterMode = 'all' | 'suspected' | 'normal' | 'tbDiagnosed' | 'notDiagnosed' | 'attInitiated' | 'attCompleted';

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
  { id: 'tbDiagnosed', label: 'TB Diagnosed' },
  { id: 'notDiagnosed', label: 'Not Diagnosed' },
  { id: 'attInitiated', label: 'ATT Initiated' },
  { id: 'attCompleted', label: 'ATT Completed' },
];

// ─── Filter Logic ────────────────────────────────────────────────────
export function isSuspectedTB(p: Patient): boolean {
  const xrayResult = p.xray_result || p.chest_x_ray_result || (p as unknown as Record<string, unknown>)['Chest X-ray Result'];
  if (!xrayResult) return false;
  
  const resultStr = xrayResult.toString().toLowerCase();
  return (
    resultStr === 'suspected tb case' ||
    resultStr.includes('abnormal') ||
    resultStr.includes('suspected')
  );
}

export function isTBDiagnosed(p: Patient): boolean {
  if (!p.tb_diagnosed) return false;
  const diagnosed = p.tb_diagnosed.toString().toLowerCase();
  return diagnosed === 'yes' || diagnosed === 'y';
}

export function isATTInitiated(p: Patient): boolean {
  return !!p.att_start_date;
}

export function isATTCompleted(p: Patient): boolean {
  return !!(p as any).att_completion_date || !!(p as any).att_completed;
}

function filterPatients(patients: Patient[], mode: FilterMode): Patient[] {
  switch (mode) {
    case 'suspected':
      return patients.filter(isSuspectedTB);
    case 'normal':
      return patients.filter((p) => !isSuspectedTB(p));
    case 'tbDiagnosed':
      return patients.filter(isTBDiagnosed);
    case 'notDiagnosed':
      return patients.filter((p) => isSuspectedTB(p) && !isTBDiagnosed(p));
    case 'attInitiated':
      return patients.filter(isATTInitiated);
    case 'attCompleted':
      return patients.filter(isATTCompleted);
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
  tbDiagnosed: {
    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    boxShadow: '0 3px 10px rgba(139,92,246,0.40)',
  },
  notDiagnosed: {
    background: 'linear-gradient(135deg, #F97316, #EA580C)',
    boxShadow: '0 3px 10px rgba(249,115,22,0.40)',
  },
  attInitiated: {
    background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    boxShadow: '0 3px 10px rgba(6,182,212,0.40)',
  },
  attCompleted: {
    background: 'linear-gradient(135deg, #84CC16, #65A30D)',
    boxShadow: '0 3px 10px rgba(132,204,22,0.40)',
  },
};

// ─── Component ───────────────────────────────────────────────────────
export function TBFilterToggle({ patients, onFilterChange, className = '' }: TBFilterToggleProps) {
  const [active, setActive] = useState<FilterMode>('all');
  const announceRef = useRef<HTMLSpanElement>(null);

  // Compute counts
  const counts = useMemo(() => {
    const suspected = patients.filter(isSuspectedTB).length;
    const tbDiagnosed = patients.filter(isTBDiagnosed).length;
    const notDiagnosed = patients.filter((p) => isSuspectedTB(p) && !isTBDiagnosed(p)).length;
    const attInitiated = patients.filter(isATTInitiated).length;
    const attCompleted = patients.filter(isATTCompleted).length;
    return {
      all: patients.length,
      suspected,
      normal: patients.length - suspected,
      tbDiagnosed,
      notDiagnosed,
      attInitiated,
      attCompleted,
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

              {/* Stethoscope icon — TB Diagnosed active only */}
              <AnimatePresence>
                {isActive && seg.id === 'tbDiagnosed' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff">
                      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-1"/>
                      <circle cx="20" cy="10" r="2"/>
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* HelpCircle icon — Not Diagnosed active only */}
              <AnimatePresence>
                {isActive && seg.id === 'notDiagnosed' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Pill icon — ATT Initiated active only */}
              <AnimatePresence>
                {isActive && seg.id === 'attInitiated' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff">
                      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                      <path d="m8.5 8.5 7 7"/>
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* CheckCircle icon — ATT Completed active only */}
              <AnimatePresence>
                {isActive && seg.id === 'attCompleted' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
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
