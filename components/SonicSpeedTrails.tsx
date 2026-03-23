'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

type TrailMood = 'normal' | 'worried' | 'happy' | 'urgent';

export interface SonicSpeedTrailsHandle {
  emit: (x: number, y: number, dx: number, dy: number, isBoosting?: boolean) => void;
  corner: (x: number, y: number) => void;
  setMood: (mood: TrailMood) => void;
}

interface SonicSpeedTrailsProps {
  mood?: TrailMood;
  intensity?: number;
}

interface TrailPt {
  x: number; y: number;
  dx: number; dy: number;   // movement direction at this point (for perpendicular calc)
  jx: number; jy: number;
  age: number;
}

// Mood-tinted outer halo — the flame-blue core is always present on top
const PALETTE: Record<TrailMood, { outer: string; mid: string; corona: string }> = {
  normal:  { outer: '#4f46e5', mid: '#818cf8', corona: '#c7d2fe' },
  happy:   { outer: '#0891b2', mid: '#22d3ee', corona: '#a5f3fc' },
  worried: { outer: '#d97706', mid: '#fbbf24', corona: '#fef08a' },
  urgent:  { outer: '#dc2626', mid: '#f87171', corona: '#fecaca' },
};

// ── MULTI-PATH ENERGY VECTOR LAYERS ─────────────────────────────────────────
// 5 distinct lineTo strokes spread across the entity's body via perpendicular offsets.
// Order: outer blue → inner cyan → white core → inner cyan → outer blue
const VECTOR_STROKES = [
  { offset: -20, width: 1, r: 0,   g: 100, b: 255, alpha: 0.4, jitter: 3   }, // Outer electric blue
  { offset: -10, width: 3, r: 0,   g: 255, b: 255, alpha: 0.6, jitter: 0   }, // Inner cyan
  { offset:   0, width: 2, r: 255, g: 255, b: 255, alpha: 0.95, jitter: 0  }, // White core
  { offset: +10, width: 3, r: 0,   g: 255, b: 255, alpha: 0.6, jitter: 0   }, // Inner cyan
  { offset: +20, width: 1, r: 0,   g: 100, b: 255, alpha: 0.4, jitter: 3   }, // Outer electric blue
];

// Spark colours — flame-blue family
const SPARK_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

const TRAIL_LIFE_MS = 420;
const TRAIL_MAX     = 48;

const SonicSpeedTrails = forwardRef<SonicSpeedTrailsHandle, SonicSpeedTrailsProps>(
  ({ mood = 'normal', intensity = 1 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trailRef  = useRef<TrailPt[]>([]);
    const rafRef    = useRef<number>(0);
    const emitRef   = useRef({ x: 0, y: 0, dx: 0, dy: 0, on: false, boost: false });
    const moodRef   = useRef<TrailMood>(mood);
    const flashRef  = useRef(0);
    const lastTsRef = useRef(0);

    useImperativeHandle(ref, () => ({
      emit: (x, y, dx, dy, isBoosting = false) => {
        const len = Math.hypot(dx, dy) || 1;
        const e   = emitRef.current;
        e.x = x; e.y = y;
        e.dx = (dx / len) * 15; e.dy = (dy / len) * 15;
        e.on = true; e.boost = isBoosting;
        if (isBoosting) flashRef.current = Math.max(flashRef.current, 0.28);
      },
      corner: (x, y) => {
        // Burst of jittered trail points for corner flare
        const pts = trailRef.current;
        for (let i = 0; i < 10; i++) {
          pts.push({
            x: x + (Math.random() - 0.5) * 32,
            y: y + (Math.random() - 0.5) * 32,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            age: 0,
            jx: (Math.random() - 0.5) * 14,
            jy: (Math.random() - 0.5) * 14,
          });
        }
        while (pts.length > TRAIL_MAX) pts.shift();
        flashRef.current = 0.4;
      },
      setMood: (m) => { moodRef.current = m; },
    }));

    useEffect(() => { moodRef.current = mood; }, [mood]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true })!;

      const resize = () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize, { passive: true });
      resize();

      const render = (ts: number) => {
        // ═══════════════════════════════════════════════════════════════════
        // CANVAS-ONLY vector line rendering. No DOM elements. No bloom pass.
        // Multi-Path Energy Vector VFX: 5 parallel trails with perpendicular
        // offsets computed from movement direction via atan2.
        // ═══════════════════════════════════════════════════════════════════

        const dt = Math.min(ts - (lastTsRef.current || ts), 40);
        lastTsRef.current = ts;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const e = emitRef.current;
        const { x, y, on } = e;
        const { outer, corona } = PALETTE[moodRef.current];
        e.on = false;

        // ── Collect new trail point with movement direction ────────────
        if (on) {
          trailRef.current.push({
            x, y,
            dx: e.dx, dy: e.dy,
            age: 0,
            jx: (Math.random() - 0.5) * 2,
            jy: (Math.random() - 0.5) * 2,
          });
          if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();
        }

        // ── Age & evict dead points ────────────────────────────────────
        const pts = trailRef.current;
        for (let i = 0; i < pts.length; i++) {
          pts[i].age += dt;
          pts[i].jx  += (Math.random() - 0.5) * 0.3;
          pts[i].jy  += (Math.random() - 0.5) * 0.3;
        }
        let dead = 0;
        while (dead < pts.length && pts[dead].age >= TRAIL_LIFE_MS) dead++;
        if (dead > 0) pts.splice(0, dead);

        if (pts.length > 1) {
          const n           = pts.length;
          const velocity    = Math.hypot(e.dx, e.dy);
          const speedFactor = Math.min(velocity / 20, 2.5);
          const flicker     = 0.78 + Math.random() * 0.22;

          ctx.save();
          ctx.lineCap  = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'lighter'; // ◀ ADDITIVE BLENDING

          // ── MULTI-PATH ENERGY VECTOR TRAILS (5 parallel lines) ──────
          // Pre-calculate perpendicular offsets for each point once per frame
          const ptOffsets = pts.map((pt, i) => {
            let moveDx: number, moveDy: number;
            if (i > 0) {
              moveDx = pt.x - pts[i - 1].x;
              moveDy = pt.y - pts[i - 1].y;
              if (Math.abs(moveDx) < 0.01 && Math.abs(moveDy) < 0.01) {
                moveDx = pt.dx; moveDy = pt.dy;
              }
            } else {
              moveDx = pt.dx; moveDy = pt.dy;
            }
            const perpAngle = Math.atan2(moveDy, moveDx) + Math.PI / 2;
            return {
              cos: Math.cos(perpAngle),
              sin: Math.sin(perpAngle)
            };
          });

          for (const stroke of VECTOR_STROKES) {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
              const pt = pts[i];
              const off = ptOffsets[i];

              // Apply perpendicular offset (spreads trail across body width)
              const offsetX = off.cos * stroke.offset;
              const offsetY = off.sin * stroke.offset;

              // Add chaotic jagged jitter for outer electric lines
              let jx = pt.jx * 0.3;
              let jy = pt.jy * 0.3;
              if (stroke.jitter > 0) {
                jx += (Math.random() - 0.5) * stroke.jitter;
                jy += (Math.random() - 0.5) * stroke.jitter;
              }

              const finalX = pt.x + offsetX + jx;
              const finalY = pt.y + offsetY + jy;

              if (i === 0) ctx.moveTo(finalX, finalY);
              else ctx.lineTo(finalX, finalY);
            }

            const avgFade = pts.reduce((s, p) => s + (1 - p.age / TRAIL_LIFE_MS), 0) / n;
            ctx.strokeStyle = `rgba(${stroke.r}, ${stroke.g}, ${stroke.b}, ${stroke.alpha * avgFade})`;
            ctx.lineWidth   = stroke.width * flicker;
            ctx.globalAlpha = intensity * flicker * avgFade;
            ctx.stroke();
          }


          // ── MOOD-BASED OUTER HALO (subtle background glow) ──────────
          ctx.filter      = 'blur(6px)';
          ctx.strokeStyle = outer;
          ctx.lineWidth   = Math.max(5, 10 - speedFactor * 1.5);
          ctx.globalAlpha = 0.18 * intensity * flicker;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < n; i++)
            ctx.lineTo(pts[i].x + pts[i].jx * 0.5, pts[i].y + pts[i].jy * 0.5);
          ctx.stroke();
          ctx.filter = 'none';

          // ── ELECTRIC SPARKS (chaotic energy discharge) ──────────────
          if (speedFactor > 0.6) {
            for (let i = Math.floor(n * 0.3); i < n; i += Math.floor(Math.random() * 2) + 2) {
              if (i >= n) break;
              const p         = pts[i];
              const fadeRatio = 1 - p.age / TRAIL_LIFE_MS;
              const sparkLen  = (4 + Math.random() * 10) * fadeRatio * Math.min(speedFactor, 2);

              for (let k = 0; k < 3; k++) {
                const angle      = (Math.random() - 0.5) * Math.PI * 1.2 + k * Math.PI * 0.4;
                ctx.strokeStyle = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
                ctx.lineWidth   = 0.3 + Math.random() * 0.6;
                ctx.globalAlpha = 0.65 * intensity * fadeRatio * flicker;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(
                  p.x + Math.cos(angle) * sparkLen,
                  p.y + Math.sin(angle) * sparkLen,
                );
                ctx.stroke();
              }
            }
          }

          // ── LEADING-EDGE ENERGY BURST (white-hot focal point) ───────
          const head = pts[n - 1];
          const hx   = head.x;
          const hy   = head.y;
          const arm  = (4 + speedFactor * 1.2) * flicker;

          // Outer burst — cyan glow
          ctx.filter      = 'blur(3px)';
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
          ctx.lineWidth   = arm * 1.8;
          ctx.globalAlpha = 0.5 * intensity * flicker;
          ctx.beginPath(); ctx.moveTo(hx - arm, hy);       ctx.lineTo(hx + arm, hy);       ctx.stroke();
          ctx.beginPath(); ctx.moveTo(hx,       hy - arm); ctx.lineTo(hx,       hy + arm); ctx.stroke();

          // Mid burst — bright white
          ctx.filter      = 'blur(1px)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth   = arm * 0.9;
          ctx.globalAlpha = 0.8 * intensity * flicker;
          ctx.beginPath(); ctx.moveTo(hx - arm * 0.6, hy);       ctx.lineTo(hx + arm * 0.6, hy);       ctx.stroke();
          ctx.beginPath(); ctx.moveTo(hx,             hy - arm * 0.6); ctx.lineTo(hx,             hy + arm * 0.6); ctx.stroke();

          // Core burst — ultra-bright white
          ctx.filter      = 'none';
          ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
          ctx.lineWidth   = arm * 0.4;
          ctx.globalAlpha = 1.0 * intensity * flicker;
          ctx.beginPath(); ctx.moveTo(hx - arm * 0.35, hy);       ctx.lineTo(hx + arm * 0.35, hy);       ctx.stroke();
          ctx.beginPath(); ctx.moveTo(hx,              hy - arm * 0.35); ctx.lineTo(hx,              hy + arm * 0.35); ctx.stroke();

          ctx.restore();
        } // end pts.length > 1

        // ── Screen flash on boost / corner ────────────────────────────
        if (flashRef.current > 0.01) {
          ctx.save();
          ctx.fillStyle   = corona;
          ctx.globalAlpha = flashRef.current * 0.08;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          flashRef.current *= 0.72;
        }

        rafRef.current = requestAnimationFrame(render);
      };

      rafRef.current = requestAnimationFrame(render);
      return () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        window.removeEventListener('resize', resize);
      };
    }, [intensity]);

    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 999996, background: 'transparent' }}
      />
    );
  },
);

SonicSpeedTrails.displayName = 'SonicSpeedTrails';
export default SonicSpeedTrails;
