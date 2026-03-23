'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Users, AlertTriangle, TrendingUp } from 'lucide-react';

interface MagicLensTooltipProps {
  isActive: boolean;
  mouseXRef: { current: number };
  mouseYRef: { current: number };
  hoveredDistrict: any | null;
}

export const MagicLensTooltip = ({
  isActive,
  mouseXRef,
  mouseYRef,
  hoveredDistrict,
}: MagicLensTooltipProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Update position on animation frame for smooth tracking
  useEffect(() => {
    if (!isActive) return;

    let animationFrameId: number;

    const updatePosition = () => {
      setPosition({
        x: mouseXRef.current,
        y: mouseYRef.current,
      });
      animationFrameId = requestAnimationFrame(updatePosition);
    };

    animationFrameId = requestAnimationFrame(updatePosition);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, mouseXRef, mouseYRef]);

  // Extract district data
  const districtData = hoveredDistrict?.properties || hoveredDistrict || {};
  const districtName = districtData.district || districtData.name || 'Unknown';
  const screened = districtData.screened || districtData.total_screened || 0;
  const breaches = districtData.breaches || districtData.sla_breaches || 0;
  const breachRate = screened > 0 ? ((breaches / screened) * 100).toFixed(1) : '0.0';

  const hasData = hoveredDistrict && isActive;

  return (
    <>
      {/* Glowing Ring Cursor (Lens Flare Effect) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="fixed pointer-events-none z-[99999]"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 w-16 h-16 rounded-full border-2 border-cyan-400/50 blur-sm"
            />
            
            {/* Inner ring */}
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500 bg-cyan-500/10 backdrop-blur-sm">
              <div className="absolute inset-0 flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-cyan-400" />
              </div>
            </div>

            {/* Scanning lines effect */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-16 h-16"
            >
              <div className="absolute top-0 left-1/2 w-px h-8 bg-gradient-to-b from-cyan-400 to-transparent" />
              <div className="absolute bottom-0 left-1/2 w-px h-8 bg-gradient-to-t from-cyan-400 to-transparent" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holographic Tooltip */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed pointer-events-none z-[99998]"
            style={{
              left: position.x + 30,
              top: position.y + 30,
            }}
          >
            <div className="relative">
              {/* Holographic glow */}
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-2xl" />
              
              {/* Main card */}
              <div className="relative bg-slate-900/80 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden min-w-[280px]">
                {/* Animated scan line */}
                <motion.div
                  animate={{ y: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"
                />

                {/* Header */}
                <div className="px-5 py-3 border-b border-cyan-500/30 bg-cyan-950/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      X-Ray Analysis
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* District Name */}
                  <div>
                    <div className="text-xs text-cyan-400/70 mb-1 uppercase tracking-wider">
                      District
                    </div>
                    <div className="text-lg font-black text-white">
                      {districtName}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Screened */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Screened
                        </span>
                      </div>
                      <div className="text-xl font-black text-white tabular-nums">
                        {screened.toLocaleString()}
                      </div>
                    </div>

                    {/* Breaches */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Breaches
                        </span>
                      </div>
                      <div className="text-xl font-black text-red-400 tabular-nums">
                        {breaches.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Breach Rate */}
                  <div className="bg-gradient-to-r from-red-950/30 to-orange-950/30 border border-red-500/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-slate-300 font-semibold">
                          Breach Rate
                        </span>
                      </div>
                      <div className="text-2xl font-black text-orange-400 tabular-nums">
                        {breachRate}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="px-5 py-2 border-t border-cyan-500/30 bg-slate-950/50">
                  <div className="text-[10px] text-cyan-400/50 text-center">
                    Hold Alt to scan • Release to exit
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
