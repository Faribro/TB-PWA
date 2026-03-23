'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntityStore } from '@/stores/useEntityStore';

interface Point { x: number; y: number; }

export function RealtimeTether() {
  const district = useEntityStore((s) => s.sonicTetherDistrict);
  const setSonicTetherDistrict = useEntityStore((s) => s.setSonicTetherDistrict);

  const [origin, setOrigin] = useState<Point | null>(null);
  const [target, setTarget] = useState<Point | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originRef = useRef<Point | null>(null);
  const targetRef = useRef<Point | null>(null);

  // Resolve positions on a 200ms poll — reliable regardless of render order
  useEffect(() => {
    if (!district) {
      setOrigin(null);
      setTarget(null);
      originRef.current = null;
      targetRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Delay tether rendering by 1.5s to allow map flyTo animation to complete
    const delayTimer = setTimeout(() => {
      const resolve = () => {
        // If tab hidden, skip work to avoid background churn.
        if (document.hidden) return;

        // ORIGIN: right hand of the Sonic avatar
        // Prefer a stable selector that exists regardless of cursor class changes.
        const avatarEl = document.querySelector('[data-sonic-entity]') as HTMLElement | null;
        if (avatarEl) {
          const r = avatarEl.getBoundingClientRect();
          const next = { x: r.left + r.width * 0.70, y: r.top + r.height * 0.55 };
          const prev = originRef.current;
          if (!prev || Math.abs(prev.x - next.x) > 1 || Math.abs(prev.y - next.y) > 1) {
            originRef.current = next;
            setOrigin(next);
          }
        } else {
          // Fallback: assume avatar is in bottom-right corner
          const next = { x: window.innerWidth - 160, y: window.innerHeight - 140 };
          const prev = originRef.current;
          if (!prev || Math.abs(prev.x - next.x) > 2 || Math.abs(prev.y - next.y) > 2) {
            originRef.current = next;
            setOrigin(next);
          }
        }

        // TARGET: center of the map container
        const mapEl = document.querySelector('[data-map-container]') as HTMLElement | null;
        if (mapEl) {
          const r = mapEl.getBoundingClientRect();
          const next = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.42 };
          const prev = targetRef.current;
          if (!prev || Math.abs(prev.x - next.x) > 1 || Math.abs(prev.y - next.y) > 1) {
            targetRef.current = next;
            setTarget(next);
          }
        } else {
          // Fallback: assume map is in center-left of screen
          const next = { x: window.innerWidth * 0.35, y: window.innerHeight * 0.45 };
          const prev = targetRef.current;
          if (!prev || Math.abs(prev.x - next.x) > 2 || Math.abs(prev.y - next.y) > 2) {
            targetRef.current = next;
            setTarget(next);
          }
        }
      };

      resolve();
      intervalRef.current = setInterval(resolve, 250);
    }, 1500);

    // Auto-clear tether after 6 seconds
    const clearTimer = setTimeout(() => {
      setSonicTetherDistrict(null);
    }, 6000);

    return () => {
      clearTimeout(delayTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(clearTimer);
    };
  }, [district, setSonicTetherDistrict]);

  const visible = !!(origin && target && district);

  if (!visible || !origin || !target) return null;

  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const cx = origin.x + dx * 0.35 + dy * 0.18;
  const cy = origin.y + dy * 0.35 - dx * 0.18;
  const pathD = `M ${origin.x} ${origin.y} Q ${cx} ${cy} ${target.x} ${target.y}`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.svg
          key={`tether-${district}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 99999,
            overflow: 'visible',
          }}
        >
          <defs>
            <filter id="god-ray-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient
              id="tether-grad"
              gradientUnits="userSpaceOnUse"
              x1={origin.x} y1={origin.y}
              x2={target.x} y2={target.y}
            >
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Fat outer glow */}
          <path d={pathD} fill="none" stroke="url(#tether-grad)"
            strokeWidth="10" strokeLinecap="round"
            filter="url(#god-ray-glow)" opacity={0.25}
          />

          {/* Mid glow */}
          <path d={pathD} fill="none" stroke="url(#tether-grad)"
            strokeWidth="4" strokeLinecap="round"
            filter="url(#god-ray-glow)" opacity={0.5}
          />

          {/* Core animated beam draw-on */}
          <motion.path
            d={pathD} fill="none"
            stroke="url(#tether-grad)"
            strokeWidth="2" strokeLinecap="round"
            strokeDasharray={length}
            initial={{ strokeDashoffset: length }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />

          {/* Origin pulse */}
          <motion.circle cx={origin.x} cy={origin.y} r={5} fill="#06b6d4"
            filter="url(#god-ray-glow)"
            animate={{ r: [4, 7, 4], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Target crosshair pulse */}
          <motion.circle cx={target.x} cy={target.y} r={8} fill="none"
            stroke="#ef4444" strokeWidth="2"
            filter="url(#god-ray-glow)"
            animate={{ r: [6, 14, 6], opacity: [1, 0, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <circle cx={target.x} cy={target.y} r={4} fill="#ef4444"
            filter="url(#god-ray-glow)" opacity={0.9}
          />

          {/* District label at target */}
          <motion.text
            x={target.x} y={target.y - 22}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
            filter="url(#god-ray-glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {district.toUpperCase()}
          </motion.text>
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
