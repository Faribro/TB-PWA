'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SonicBoomProps {
  targetSelector: string;
  onComplete: () => void;
  duration?: number;
}

export function SonicBoom({ targetSelector, onComplete, duration = 3000 }: SonicBoomProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.warn(`SonicBoom: Target not found: ${targetSelector}`);
      onComplete();
      return;
    }

    const updateRect = () => {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    target.classList.add('sonic-boom-target');

    const timer = setTimeout(() => {
      setIsVisible(false);
      target.classList.remove('sonic-boom-target');
      setTimeout(onComplete, 400);
    }, duration);

    return () => {
      clearTimeout(timer);
      target.classList.remove('sonic-boom-target');
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [targetSelector, duration, onComplete]);

  if (!targetRect) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[99999]">
          {/* Main Focus Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
            className="absolute border-2 border-slate-900 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)]"
          >
             {/* Animated Corner Brackets */}
             {[
               "top-0 left-0 border-t-4 border-l-4",
               "top-0 right-0 border-t-4 border-r-4",
               "bottom-0 left-0 border-b-4 border-l-4",
               "bottom-0 right-0 border-b-4 border-r-4"
             ].map((cls, i) => (
                <motion.div 
                  key={i}
                  className={`absolute w-4 h-4 border-blue-600 ${cls} rounded-sm`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                />
             ))}
          </motion.div>

          {/* Shockwave Rings */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute border border-blue-500/30 rounded-full"
              style={{
                left: targetRect.left + targetRect.width / 2,
                top: targetRect.top + targetRect.height / 2,
                width: 20,
                height: 20,
                marginLeft: -10,
                marginTop: -10,
              }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{
                scale: [1, 4 + i],
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Floating Data Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-slate-900 rounded-full"
              style={{
                left: targetRect.left + targetRect.width / 2,
                top: targetRect.top + targetRect.height / 2,
              }}
              animate={{
                x: [0, (Math.random() - 0.5) * 200],
                y: [0, (Math.random() - 0.5) * 200],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "circOut"
              }}
            />
          ))}

          {/* Floating Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
               left: targetRect.left,
               top: targetRect.bottom + 12,
               width: targetRect.width
            }}
            className="absolute flex flex-col items-center gap-1"
          >
            <div className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full shadow-2xl">
               Sonic Analysis Focus
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-slate-900 to-transparent" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
