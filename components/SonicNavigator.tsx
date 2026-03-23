'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

interface NavigateProps {
  targetPath:  string;
  targetLabel?: string;
  targetIcon?:  string;
  onComplete:  () => void;
}

export function SonicNavigator({ targetPath, targetLabel, targetIcon, onComplete }: NavigateProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'charge' | 'run' | 'done'>('charge');

  useEffect(() => {
    // Stage 1: Fast Charge
    const t1 = setTimeout(() => setPhase('run'), 500);
    
    // Stage 2: Immediate Transition
    const t2 = setTimeout(() => {
      router.push(targetPath);
      setPhase('done');
      onComplete();
    }, 1200);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [targetPath, router, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000000] flex items-center justify-center font-outfit pointer-events-none"
        >
          {/* Neural Background */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'run' ? 0.98 : 0.85 }}
            transition={{ duration: 0.4 }}
          />

          {/* Speed Particles */}
          {phase === 'run' && (
            <div className="absolute inset-0 overflow-hidden">
               {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute bg-blue-600/20 h-px rounded-full"
                    style={{
                       width: 100 + Math.random() * 300,
                       top: `${Math.random() * 100}%`,
                       left: '-20%',
                    }}
                    animate={{
                       x: ['0%', '150%'],
                       opacity: [0, 1, 0]
                    }}
                    transition={{
                       duration: 0.4,
                       delay: Math.random() * 0.4,
                       repeat: Infinity,
                       ease: "linear"
                    }}
                  />
               ))}
            </div>
          )}

          {/* UI Core */}
          <div className="relative z-10 flex flex-col items-center">
             <motion.div
               animate={phase === 'charge' ? { scale: [1, 1.2, 1] } : { scale: 1.5, opacity: 0 }}
               className="w-24 h-24 rounded-[32px] bg-slate-900 shadow-2xl flex items-center justify-center mb-8"
             >
                <Zap className="w-12 h-12 text-white fill-white" />
             </motion.div>

             <div className="text-center space-y-2">
                <motion.h2 
                   className="text-3xl font-black text-slate-900 uppercase tracking-tighter"
                   animate={{ opacity: [0, 1], y: [10, 0] }}
                >
                   Neural Jump
                </motion.h2>
                <div className="flex items-center justify-center gap-3">
                   <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing Sector</span>
                </div>
             </div>

             {/* Progress Bar Container */}
             <div className="mt-12 w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <motion.div 
                   className="h-full bg-slate-900"
                   initial={{ width: "0%" }}
                   animate={{ width: "100%" }}
                   transition={{ duration: 1.2, ease: "easeInOut" }}
                />
             </div>
          </div>

          {/* Screen Flash on Transition */}
          {phase === 'run' && (
             <motion.div 
               className="absolute inset-0 bg-blue-600/10 z-50"
               initial={{ opacity: 0 }}
               animate={{ opacity: [0, 1, 0] }}
               transition={{ duration: 0.3 }}
             />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
