'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEntityStore } from '@/stores/useEntityStore';
import { AlertTriangle, Activity, CheckCircle2, Zap, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SonicPresentation({ isAnalyzing }: { isAnalyzing?: boolean }) {
  const cue = useEntityStore(s => s.sonicActivePresentationCue);
  const districtData = useEntityStore(s => s.districtData);

  // If we're analyzing, show the "Neural Processing" video state
  if (isAnalyzing) return <ProcessingVideoState />;
  if (!cue) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none"
    >
      {/* CINEMATIC VIDEO OVERLAY */}
      <VideoScannerOverlay />
      
      {/* BACKGROUND PARTICLE FEED */}
      <ParticleStream />

      <AnimatePresence mode="wait">
        {cue.type === 'intro' && <IntroAnimation key="intro" />}
        {cue.type === 'midpoint' && <RedColumnsAnimation key="midpoint" data={districtData} />}
        {cue.type === 'outro' && <OutroAnimation key="outro" />}
      </AnimatePresence>

      {/* FLOATING INSIGHT NODES - NOW WITH MORE IMPACT */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {cue.insights?.map((insight, i) => (
            <motion.div
              key={insight}
              initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100, y: 50 + (i * 45) }}
              animate={{ 
                opacity: 1, 
                x: i % 2 === 0 ? -160 : 160, 
                y: 50 + (i * 45),
                scale: [0.9, 1.1, 1],
              }}
              exit={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
              transition={{ delay: 1 + (i * 0.3), duration: 0.8, type: 'spring' }}
              className="absolute left-1/2 -translate-x-1/2 bg-blue-600/20 backdrop-blur-xl border border-blue-400/50 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(0,180,255,0.3)]"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-3 h-3 text-[#00d2ff] animate-pulse" />
                <span className="font-share-tech text-[10px] font-black text-white uppercase tracking-widest">{insight}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* RECTANGLE SCANLINE OVERLAY */}
      <div className="absolute inset-6 border border-[#00d2ff]/10 pointer-events-none">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00d2ff]/40" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00d2ff]/40" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00d2ff]/40" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00d2ff]/40" />
      </div>
    </motion.div>
  );
}

function VideoScannerOverlay() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      <motion.div 
        animate={{ opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-transparent to-blue-900/20"
      />
      {/* STATIC INTERFERENCE */}
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />
      {/* HORIZONTAL SCANNER */}
      <motion.div 
        animate={{ y: ['-10%', '110%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[2px] bg-[#00d2ff]/20 shadow-[0_0_15px_#00d2ff] z-10"
      />
    </div>
  );
}

function ProcessingVideoState() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden"
    >
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-48 h-48 rounded-full border-2 border-dashed border-[#00d2ff]/30"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 w-48 h-48 rounded-full border border-cyan-400/20"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Activity className="w-10 h-10 text-[#00d2ff] animate-pulse" />
          <span className="font-syncopate text-[8px] text-[#00d2ff] tracking-[0.3em] uppercase">Processing</span>
        </div>
      </div>
      
      {/* GENERATIVE STREAM */}
      <div className="mt-8 flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <motion.div
            key={i}
            animate={{ 
              height: [2, 16, 2],
              backgroundColor: ["#00a0ff", "#00ffc8", "#00a0ff"]
            }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
            className="w-1 rounded-full"
          />
        ))}
      </div>
      <p className="mt-4 font-share-tech text-[10px] text-white/40 uppercase tracking-widest animate-pulse">Live AI Generation in Progress...</p>
    </motion.div>
  );
}

function ParticleStream() {
  return (
    <div className="absolute inset-0 z-0 opacity-40">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: Math.random() * 400, y: 300, opacity: 0 }}
          animate={{ 
            y: [-20, 320],
            opacity: [0, 1, 0],
            x: (Math.random() * 400) + (Math.random() * 20 - 10)
          }}
          transition={{ 
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
          className="absolute w-px h-16 bg-gradient-to-b from-transparent via-[#00d2ff] to-transparent shadow-[0_0_8px_#00d2ff]"
        />
      ))}
    </div>
  );
}

function IntroAnimation() {
  return (
    <motion.div 
      className="flex flex-col items-center gap-6 z-10"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0 }}
    >
      <div className="relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-40 h-40 rounded-full border-[1.5px] border-dashed border-[#00d2ff]/40 shadow-[0_0_30px_rgba(0,210,255,0.2)]"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-40 h-40 rounded-full border border-cyan-400/10"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Globe className="w-16 h-16 text-[#00d2ff] drop-shadow-[0_0_15px_rgba(0,210,255,0.7)]" />
          </motion.div>
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-[#00d2ff] font-syncopate font-black tracking-[0.4em] uppercase text-[12px] mb-2 drop-shadow-[0_0_10px_#00d2ff]">Neural Sync Active</h3>
        <p className="text-white/40 font-share-tech text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Deep Connection Established</p>
      </div>
    </motion.div>
  );
}

function RedColumnsAnimation({ data }: { data: any[] }) {
  const topDistricts = [...(data || [])]
    .sort((a, b) => (b.breachCount || 0) - (a.breachCount || 0))
    .slice(0, 12);

  const maxBreach = Math.max(...topDistricts.map(d => d.breachCount || 0), 1);

  return (
    <motion.div 
      className="w-full h-full flex flex-col justify-end gap-6 z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-end justify-between gap-1.5 h-44 px-2 mb-2">
        {topDistricts.map((d, i) => {
          const heightPercent = ((d.breachCount || 0) / maxBreach) * 90;
          const isCritical = (d.breachRate || 0) > 0.5;

          return (
            <div key={d.district} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="relative w-full flex flex-col justify-end h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: i * 0.05, duration: 1.5, type: 'spring', damping: 15 }}
                  className={cn(
                    "w-full rounded-t-sm relative transition-all duration-700",
                    isCritical 
                      ? "bg-gradient-to-t from-rose-900/80 via-rose-500 to-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
                      : "bg-gradient-to-t from-blue-900/80 to-[#00d2ff]/60"
                  )}
                />
              </div>
              <span className="font-share-tech text-[6px] font-black text-white/50 uppercase tracking-tighter truncate w-8 text-center rotate-45 mt-2">
                {d.district}
              </span>
            </div>
          );
        })}
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-black/60 backdrop-blur-2xl border border-rose-500/40 rounded-xl p-4 flex items-center gap-5 shadow-[0_0_50px_rgba(244,63,94,0.15)]"
      >
        <div className="w-12 h-12 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <div className="flex-1">
          <h4 className="text-rose-400 font-syncopate font-black text-[9px] uppercase tracking-[0.2em] leading-none mb-1.5">SLA BREACH ALERT</h4>
          <p className="text-[#00d2ff] font-share-tech text-[10px] uppercase tracking-wider leading-relaxed">High-Risk anomalies identified in {topDistricts.length} sectors. Immediate intervention required.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OutroAnimation() {
  return (
    <motion.div 
      className="flex flex-col items-center gap-6 z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            boxShadow: ["0 0 20px rgba(16, 185, 129, 0)", "0 0 80px rgba(16, 185, 129, 0.4)", "0 0 20px rgba(16, 185, 129, 0)"] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-28 h-28 rounded-full bg-emerald-500/5 border-2 border-emerald-500/40 flex items-center justify-center"
        >
          <CheckCircle2 className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_20px_#10b981]" />
        </motion.div>
      </div>

      <div className="text-center">
        <h3 className="text-emerald-400 font-syncopate font-black tracking-[0.4em] uppercase text-[14px] drop-shadow-[0_0_10px_#10b981]">SYSTEM NOMINAL</h3>
        <p className="text-white/60 font-share-tech text-[10px] font-bold uppercase tracking-widest mt-2 px-6">All data synchronized. Efficiency metrics meeting protocol standard NS-7A.</p>
      </div>
    </motion.div>
  );
}
