'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SonicDisplayTVProps {
  isEmbedded?: boolean;
  videoUrl?: string;
  onGenerationComplete?: () => void;
  title?: string;
  progress?: number;
  text?: string;
  isTyping?: boolean;
}

type GenerationState = 'idle' | 'generating' | 'ready' | 'playing';

function SonicDisplayTVComponent({
  isEmbedded = false,
  videoUrl,
  onGenerationComplete,
  title = 'Neural Analysis Rendering',
  progress: externalProgress,
  text = '',
  isTyping = false,
}: SonicDisplayTVProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Handle video URL changes
  useEffect(() => {
    if (videoUrl) {
      setGenerationState('ready');
      onGenerationComplete?.();
    } else if (externalProgress !== undefined && externalProgress > 0) {
      setGenerationState('generating');
    }
  }, [videoUrl, externalProgress]);

  // 🔧 LATEST GEN CANVAS NOISE EFFECT
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      // High-DPI canvas for latest-gen crispness
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawDigitalNoise = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      
      ctx.clearRect(0, 0, w, h);
      
      // Draw subtle "Neural Static" instead of heavy VCR blocks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // Very faint white
      const numParticles = generationState === 'generating' ? 150 : 30; // More static when generating
      
      for (let i = 0; i < numParticles; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 1.5;
        ctx.fillRect(x, y, size, size);
        
        // Occasional digital "streak"
        if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(0, 210, 255, 0.1)'; // Cyan streak
          ctx.fillRect(x, y, Math.random() * 20, 1);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // Reset
        }
      }

      animationFrameId = requestAnimationFrame(drawDigitalNoise);
    };

    drawDigitalNoise();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [generationState]);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && generationState === 'ready') {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, generationState]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!videoRef.current.muted);
  }, []);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black group',
        isEmbedded ? 'rounded-[20px]' : 'rounded-3xl'
      )}
      style={{ aspectRatio: '16 / 9', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* 1. THE MEDIA LAYER (Edge-to-Edge) */}
      <AnimatePresence mode="wait">
        {(generationState === 'ready' || generationState === 'playing') && videoUrl && (
          <motion.video
            key="video-player"
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            initial={{ opacity: 0, filter: 'contrast(1.5) brightness(2)' }}
            animate={{ opacity: 1, filter: 'contrast(1.1) brightness(1)' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </AnimatePresence>

      {/* 2. LATEST GEN OVERLAYS (Scanlines & Noise) */}
      {/* Digital Canvas Static */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-70 z-10"
      />
      
      {/* Ultra-fine Scanlines */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.4) 1px, transparent 2px)'
        }}
      />

      {/* Subtle screen glare (Glass reflection) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-20 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-50" />

      {/* 3. IDLE STATE: LED DISPLAY */}
      <AnimatePresence>
        {generationState === 'idle' && !text && (
          <motion.div
            key="idle-telemetry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 w-full h-full flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="text-center space-y-8">
              <div>
                <div className="text-5xl font-black text-red-500 tracking-[0.3em] uppercase mb-2" style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)' }}>88:88</div>
                <div className="text-xs text-red-400/70 font-mono tracking-widest">LED DISPLAY</div>
              </div>
              <div className="flex justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mb-2" style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)' }} />
                  <span className="text-[9px] text-red-400/60 font-mono">POWER</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mb-2" style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)' }} />
                  <span className="text-[9px] text-red-400/60 font-mono">ACTIVE</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500/30 mb-2" />
                  <span className="text-[9px] text-red-400/40 font-mono">READY</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3b. TEXT DISPLAY: Sonic's Dialogue */}
      <AnimatePresence>
        {text && (
          <motion.div
            key="text-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 w-full h-full flex flex-col items-center justify-center p-8 pointer-events-none"
          >
            <div className="max-w-sm text-center">
              <p className="font-share-tech text-base font-bold text-white leading-relaxed tracking-tight drop-shadow-[0_0_8px_rgba(0,180,255,0.5)]">
                {text}
                {isTyping && (
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="inline-block w-2 h-5 bg-cyan-400 ml-2 rounded-sm align-middle shadow-[0_0_15px_rgba(0,210,255,0.8)]" />
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3c. GENERATING STATE UI */}
      <AnimatePresence>
        {generationState === 'generating' && (
          <motion.div
            key="generating-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md px-8">
              {/* High-tech progress bar */}
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black text-cyan-400 tracking-[0.2em] uppercase">Neural Synthesis</span>
                <span className="text-sm font-bold text-white">{Math.round(externalProgress || 0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-cyan-900/50 shadow-[0_0_15px_rgba(0,210,255,0.8)]">
                <motion.div 
                  className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(0,210,255,0.8)]"
                  animate={{ width: `${externalProgress || 0}%` }}
                  transition={{ ease: 'linear', duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CUSTOM CINEMATIC CONTROLS */}
      <AnimatePresence>
        {showControls && generationState === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-40"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlayPause} 
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white transition-all hover:scale-110 active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
              </button>
              <button 
                onClick={toggleMute} 
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white transition-all hover:scale-110 active:scale-95"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex flex-col ml-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">{title}</span>
                <span className="text-[9px] tracking-widest text-cyan-400/70 font-mono">ENCRYPTED STREAM</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORNER ACCENTS (Framing the TV - Positioned at Absolute Edges) */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/50 z-40 pointer-events-none" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/50 z-40 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/50 z-40 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/50 z-40 pointer-events-none" />
    </div>
  );
}

const SonicDisplayTV = memo(
  SonicDisplayTVComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.videoUrl === nextProps.videoUrl &&
      prevProps.progress === nextProps.progress &&
      prevProps.isEmbedded === nextProps.isEmbedded &&
      prevProps.text === nextProps.text &&
      prevProps.isTyping === nextProps.isTyping &&
      prevProps.onGenerationComplete === nextProps.onGenerationComplete
    );
  }
);

SonicDisplayTV.displayName = 'SonicDisplayTV';

export default SonicDisplayTV;
