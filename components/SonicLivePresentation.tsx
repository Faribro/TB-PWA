'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEntityStore } from '@/stores/useEntityStore';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Activity, CheckCircle2, Zap, BarChart3, Globe, TrendingUp, Users, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LivePresentationProps {
  isAnalyzing?: boolean;
  command?: any;
  districtData?: any[];
  isEmbedded?: boolean;
}

export function SonicLivePresentation({ isAnalyzing, command, districtData, isEmbedded = false }: LivePresentationProps) {
  const cue = useEntityStore(s => s.sonicActivePresentationCue);
  const [videoFrame, setVideoFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real-time video frame generation
  useEffect(() => {
    if (!isAnalyzing && !cue) return;

    const generateFrame = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        // Clear with gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.5, '#1a1f3a');
        gradient.addColorStop(1, '#0f1428');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add scanlines effect
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < height; i += 2) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }

        // Add noise
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 10;
          data[i] += noise;
          data[i + 1] += noise * 0.5;
          data[i + 2] += noise * 0.8;
        }
        ctx.putImageData(imageData, 0, 0);

        setVideoFrame(prev => prev + 1);
      }
      animationFrameRef.current = requestAnimationFrame(generateFrame);
    };

    animationFrameRef.current = requestAnimationFrame(generateFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnalyzing, cue]);

  if (isAnalyzing) return <AnalysisVideoState isEmbedded={isEmbedded} />;
  if (!cue) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none"
    >
      {/* Hidden canvas for video generation */}
      <canvas ref={canvasRef} width={400} height={260} className="hidden" />

      {/* Cinematic video overlay */}
      <VideoScannerOverlay />

      {/* Particle stream background */}
      <ParticleStream />

      <AnimatePresence mode="wait">
        {cue.type === 'intro' && <IntroPresentation key="intro" />}
        {cue.type === 'midpoint' && <MidpointPresentation key="midpoint" data={districtData} />}
        {cue.type === 'outro' && <OutroPresentation key="outro" />}
      </AnimatePresence>

      {/* Floating insight nodes with enhanced animations */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {cue.insights?.map((insight, i) => (
            <motion.div
              key={insight}
              initial={{ opacity: 0, x: i % 2 === 0 ? -150 : 150, y: 30 + (i * 50) }}
              animate={{
                opacity: 1,
                x: i % 2 === 0 ? -180 : 180,
                y: 30 + (i * 50),
                scale: [0.8, 1.15, 1],
              }}
              exit={{ opacity: 0, scale: 0.3, filter: 'blur(20px)' }}
              transition={{ delay: 0.8 + (i * 0.25), duration: 1, type: 'spring', stiffness: 100 }}
              className="absolute left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600/30 to-cyan-600/20 backdrop-blur-2xl border border-blue-400/60 px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,180,255,0.4)] hover:shadow-[0_0_50px_rgba(0,180,255,0.6)] transition-all"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-4 h-4 text-[#00ffc8] drop-shadow-[0_0_8px_#00ffc8]" />
                </motion.div>
                <span className="font-share-tech text-[11px] font-black text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(0,210,255,0.5)]">
                  {insight}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Corner frame accent */}
      <div className="absolute inset-6 border border-[#00d2ff]/15 pointer-events-none rounded-lg">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00d2ff]/60" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00d2ff]/60" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00d2ff]/60" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00d2ff]/60" />
      </div>
    </motion.div>
  );
}

function VideoScannerOverlay() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]" />
      <motion.div
        animate={{ opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-t from-blue-900/25 via-transparent to-blue-900/25"
      />
      {/* Horizontal scanner line */}
      <motion.div
        animate={{ y: ['-10%', '110%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#00d2ff] to-transparent shadow-[0_0_20px_#00d2ff] z-10"
      />
      {/* Vertical scanner line */}
      <motion.div
        animate={{ x: ['-10%', '110%'] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-y-0 w-[2px] bg-gradient-to-b from-transparent via-[#00ffc8] to-transparent shadow-[0_0_15px_#00ffc8] z-10"
      />
    </div>
  );
}

function AnalysisVideoState({ isEmbedded = false }: { isEmbedded?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden",
        isEmbedded ? "bg-transparent" : "bg-black/50 backdrop-blur-md"
      )}
    >
      <div className="relative">
        {/* Rotating rings */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity }}
          className={cn(
            "rounded-full border-2 border-dashed border-[#00d2ff]/40 shadow-[0_0_40px_rgba(0,210,255,0.2)]",
            isEmbedded ? "w-52 h-52" : "w-56 h-56"
          )}
        />
        <motion.div
          animate={{ scale: [1.3, 1, 1.3], rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity }}
          className={cn(
            "absolute inset-0 rounded-full border-2 border-cyan-400/25 shadow-[0_0_30px_rgba(0,255,200,0.15)]",
            isEmbedded ? "w-52 h-52" : "w-56 h-56"
          )}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className={cn(
            "absolute inset-0 rounded-full border border-dotted border-[#00ffc8]/20",
            isEmbedded ? "w-52 h-52" : "w-56 h-56"
          )}
        />

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Activity className={isEmbedded ? "w-8 h-8 text-[#00d2ff]" : "w-14 h-14 text-[#00d2ff] drop-shadow-[0_0_20px_rgba(0,210,255,0.8)]"} />
          </motion.div>
          <span className={cn(
            "font-syncopate text-[#00d2ff] tracking-[0.4em] uppercase font-black drop-shadow-[0_0_15px_rgba(0,210,255,0.6)]",
            isEmbedded ? "text-[6px]" : "text-[10px]"
          )}>
            Processing
          </span>
        </div>
      </div>

      {/* Generative stream bars */}
      <div className={cn("flex gap-2", isEmbedded ? "mt-6" : "mt-12")}>
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: isEmbedded ? [3, 12, 3] : [4, 24, 4],
              backgroundColor: ['#00a0ff', '#00ffc8', '#00a0ff'],
              boxShadow: isEmbedded ? [] : [
                '0 0 10px rgba(0,160,255,0.3)',
                '0 0 20px rgba(0,255,200,0.6)',
                '0 0 10px rgba(0,160,255,0.3)',
              ],
            }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
            className={isEmbedded ? "w-1 rounded-full" : "w-1.5 rounded-full"}
          />
        ))}
      </div>

      <motion.p
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn(
          "font-share-tech text-white/50 uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(0,210,255,0.3)]",
          isEmbedded ? "mt-4 text-[8px]" : "mt-6 text-[11px]"
        )}
      >
        AI Neural Generation Active
      </motion.p>
    </motion.div>
  );
}

function ParticleStream() {
  return (
    <div className="absolute inset-0 z-0 opacity-50">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: Math.random() * 400 - 200, y: 300, opacity: 0 }}
          animate={{
            y: [-30, 320],
            opacity: [0, 1, 0],
            x: (Math.random() * 400 - 200) + (Math.random() * 30 - 15),
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2.5,
          }}
          className="absolute w-0.5 h-20 bg-gradient-to-b from-transparent via-[#00d2ff] to-transparent shadow-[0_0_12px_#00d2ff]"
        />
      ))}
    </div>
  );
}

function IntroPresentation() {
  return (
    <motion.div
      className="flex flex-col items-center gap-8 z-10"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Rotating globe */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-48 h-48 rounded-full border-[2px] border-dashed border-[#00d2ff]/50 shadow-[0_0_40px_rgba(0,210,255,0.3)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 w-48 h-48 rounded-full border border-cyan-400/20"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Globe className="w-20 h-20 text-[#00d2ff] drop-shadow-[0_0_25px_rgba(0,210,255,0.8)]" />
          </motion.div>
        </div>
      </div>

      {/* Title and subtitle */}
      <div className="text-center space-y-3">
        <motion.h3
          animate={{ letterSpacing: ['0.2em', '0.4em', '0.2em'] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-[#00d2ff] font-syncopate font-black tracking-[0.3em] uppercase text-[14px] drop-shadow-[0_0_15px_#00d2ff]"
        >
          Neural Sync
        </motion.h3>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/50 font-share-tech text-[10px] font-bold uppercase tracking-[0.15em]"
        >
          Initializing Deep Connection
        </motion.p>
      </div>

      {/* Status indicators */}
      <div className="flex gap-4">
        {['Signal', 'Sync', 'Ready'].map((label, i) => (
          <motion.div
            key={label}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-3 h-3 rounded-full bg-[#00ffc8] shadow-[0_0_10px_#00ffc8]" />
            <span className="font-share-tech text-[8px] text-[#00ffc8] uppercase tracking-wider">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MidpointPresentation({ data }: { data?: any[] }) {
  const topDistricts = [...(data || [])]
    .sort((a, b) => (b.breachCount || 0) - (a.breachCount || 0))
    .slice(0, 14);

  const maxBreach = Math.max(...topDistricts.map(d => d.breachCount || 0), 1);
  const totalBreaches = topDistricts.reduce((sum, d) => sum + (d.breachCount || 0), 0);
  const criticalCount = topDistricts.filter(d => (d.breachRate || 0) > 0.5).length;

  return (
    <motion.div
      className="w-full h-full flex flex-col justify-between z-10 px-4"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header stats */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between items-center mb-4 px-2"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
          <span className="font-syncopate text-[10px] text-rose-400 uppercase tracking-[0.2em] font-black">
            {criticalCount} Critical Zones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00d2ff]" />
          <span className="font-syncopate text-[10px] text-[#00d2ff] uppercase tracking-[0.2em] font-black">
            {totalBreaches} Total Breaches
          </span>
        </div>
      </motion.div>

      {/* Animated bar chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-end justify-between gap-1 h-40 mb-4"
      >
        {topDistricts.map((d, i) => {
          const heightPercent = ((d.breachCount || 0) / maxBreach) * 85;
          const isCritical = (d.breachRate || 0) > 0.5;

          return (
            <div key={d.district} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex flex-col justify-end h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: i * 0.04, duration: 1.2, type: 'spring', damping: 12 }}
                  className={cn(
                    'w-full rounded-t-sm relative transition-all duration-500 shadow-lg',
                    isCritical
                      ? 'bg-gradient-to-t from-rose-900/90 via-rose-500 to-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.5)]'
                      : 'bg-gradient-to-t from-blue-900/80 via-blue-500 to-[#00d2ff]/70 shadow-[0_0_20px_rgba(0,210,255,0.4)]'
                  )}
                />
              </div>
              <span className="font-share-tech text-[6px] font-black text-white/60 uppercase tracking-tighter truncate w-7 text-center">
                {d.district.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* Alert banner */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-rose-900/60 to-rose-800/40 backdrop-blur-2xl border border-rose-500/50 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_40px_rgba(244,63,94,0.2)]"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-10 h-10 rounded-lg bg-rose-500/30 border border-rose-500/40 flex items-center justify-center flex-shrink-0"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
        </motion.div>
        <div className="flex-1">
          <h4 className="text-rose-300 font-syncopate font-black text-[9px] uppercase tracking-[0.15em] leading-none mb-1">
            SLA BREACH ALERT
          </h4>
          <p className="text-[#00d2ff] font-share-tech text-[9px] uppercase tracking-wider leading-tight">
            {criticalCount} sectors require immediate intervention
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OutroPresentation() {
  return (
    <motion.div
      className="flex flex-col items-center gap-8 z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Success pulse */}
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            boxShadow: [
              '0 0 20px rgba(16, 185, 129, 0)',
              '0 0 100px rgba(16, 185, 129, 0.5)',
              '0 0 20px rgba(16, 185, 129, 0)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="w-40 h-40 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_25px_#10b981]" />
          </motion.div>
        </motion.div>
      </div>

      {/* Success message */}
      <div className="text-center space-y-2">
        <motion.h3
          animate={{ letterSpacing: ['0.2em', '0.4em', '0.2em'] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-emerald-400 font-syncopate font-black tracking-[0.3em] uppercase text-[16px] drop-shadow-[0_0_20px_#10b981]"
        >
          System Nominal
        </motion.h3>
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/60 font-share-tech text-[10px] font-bold uppercase tracking-[0.15em]"
        >
          All Data Synchronized
        </motion.p>
      </div>

      {/* Completion indicators */}
      <div className="flex gap-3">
        {['Verified', 'Optimized', 'Ready'].map((label, i) => (
          <motion.div
            key={label}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="font-share-tech text-[8px] text-emerald-300 uppercase tracking-wider">{label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
