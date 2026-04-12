'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Maximize2, Settings, Search, Cpu, Database, ChevronLeft, ChevronRight, Activity, AlertCircle, ChevronDown, Sparkles } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { KPIRibbon } from './KPIRibbon';
import { ColorLegend } from './ColorLegend';

interface CommandCenterLayoutProps {
  children: ReactNode;
  filteredPatients: any[];
  globalPatients?: any[];
  uniqueCoordinators: string[];
  onZoomToFit: () => void;
  onShowCascade: () => void;
  onShowLeaderboard: () => void;
  showCascade: boolean;
  showLeaderboard: boolean;
  heatmapMode: 'auto' | 'state' | 'district' | 'facility';
  onHeatmapModeChange: (mode: 'auto' | 'state' | 'district' | 'facility') => void;
}

export function CommandCenterLayout({
  children,
  filteredPatients,
  globalPatients,
  uniqueCoordinators,
  onZoomToFit,
  onShowCascade,
  onShowLeaderboard,
  showCascade,
  showLeaderboard,
  heatmapMode,
  onHeatmapModeChange,
}: CommandCenterLayoutProps) {
  const { filter, setDistrict, setState, setStatus, resetFilters, hasActiveFilters } = useUniversalFilter();

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<{insightText: string, activeNode: string, timestamp: number}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  const aiFeedRef = useRef<HTMLDivElement>(null);

  // Quick stats extraction
  const highRiskPatients = filteredPatients.filter(p => !p.referral_date).length;
  // Use filteredPatients so cards respond to filter changes
  const activePool = filteredPatients;
  const topDistricts = [...new Set(activePool.map((p: any) => p.screening_district))].slice(0, 6);

  // Auto-scroll logic for Geography Matrix
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const startScroll = () => {
      const el = matrixRef.current;
      if (!el) return;

      let direction = 1;
      const scrollSpeed = 0.8; // slightly faster for responsiveness
      
      interval = setInterval(() => {
        if (!el || el.matches(':hover')) return;

        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
          direction = -1;
        } else if (el.scrollLeft <= 5) {
          direction = 1;
        }
        
        el.scrollLeft += direction * scrollSpeed;
      }, 30);
    };

    const timeout = setTimeout(startScroll, 500);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [topDistricts.length]);

  // Shuffling sound effect for card navigation
  const playShuffleSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create noise buffer for shuffle sound
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
      noise.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Audio play failed, ignore
    }
  }, []);

  const scrollMatrix = (dir: 'L' | 'R') => {
    if (!matrixRef.current) return;
    // Scroll by card width (180px) + gap (16px)
    const scrollAmount = 196;
    matrixRef.current.scrollBy({ left: dir === 'L' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    playShuffleSound();
  };

  const playSonarBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }, []);

  // Gemini Notification Sync
  useEffect(() => {
    if (!filteredPatients || filteredPatients.length === 0) return;
    
    setAiLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const payload = {
          stats: { highRiskPatients, totalPatients: filteredPatients.length },
          districts: topDistricts
        };
        const res = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.insight) {
          setAiInsights(prev => {
            // Only add if it's different from the last insight to prevent duplicates
            if (prev.length > 0 && prev[prev.length - 1].insightText === data.insight.insightText) return prev;
            return [...prev, { ...data.insight, timestamp: Date.now() }];
          });
        }
      } catch (err) {
        console.error('AI Sync failed:', err);
      } finally {
        setAiLoading(false);
      }
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [highRiskPatients]);

  // Auto-scroll AI feed
  useEffect(() => {
    if (aiFeedRef.current) {
      aiFeedRef.current.scrollTo({ top: aiFeedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [aiInsights.length]);

  const handleIntervention = async () => {
    if (aiInsights.length === 0 || isIntervening) return;
    
    playSonarBeep();
    setIsIntervening(true);
    
    // Add tactical notification
    const activeNode = aiInsights[aiInsights.length - 1].activeNode;
    setAiInsights(prev => [...prev, {
      insightText: `COMMAND TRANSMITTED: DEPLOYING RESOURCE SYNC TO ${activeNode.toUpperCase()} SECTOR.`,
      activeNode: activeNode,
      timestamp: Date.now()
    }]);

    // Simulate real-time execution
    await new Promise(r => setTimeout(r, 2000));
    
    setDistrict(activeNode);
    setAiInsights(prev => [...prev, {
      insightText: `NODES SYNCHRONIZED: ${activeNode.toUpperCase()} SECTOR IS NOW UNDER ACTIVE SURVEILLANCE.`,
      activeNode: activeNode,
      timestamp: Date.now()
    }]);
    setIsIntervening(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-slate-300 font-mono overflow-hidden uppercase">
      {/* ───────────────────────────────────────────────────────── */}
      {/* PREMIUM TOP HEADER - Award Winning Aesthetic */}
      {/* ───────────────────────────────────────────────────────── */}
      <header className="h-[52px] bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex items-center justify-between border-b border-white/5 px-4 shrink-0 relative z-50 backdrop-blur-2xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Animated top line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] text-[#777] relative">
          {/* Premium Location Badge */}
          <div className="flex items-center gap-2.5 text-cyan-400 bg-gradient-to-r from-cyan-950/60 to-cyan-900/30 px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] group hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-cyan-100 font-black tracking-[0.2em]">MADHYA PRADESH</span>
          </div>
        </div>

        {/* Premium Vertex-Style State/District Filters */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-4 bg-gradient-to-r from-[#111]/90 via-[#0f0f0f]/95 to-[#111]/90 backdrop-blur-2xl border border-white/10 px-5 py-2.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* State Filter */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#888] uppercase">State</span>
            <div className="relative group">
              <select
                value={filter.state || ''}
                onChange={(e) => {
                  playSonarBeep();
                  setState(e.target.value || null);
                }}
                className="appearance-none bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer hover:border-white/20 min-w-[150px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <option value="">All States</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi">Delhi</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666] pointer-events-none group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
          
          <div className="w-px h-5 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          
          {/* District Filter */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#888] uppercase">District</span>
            <div className="relative group">
              <select
                value={filter.district || ''}
                onChange={(e) => {
                  playSonarBeep();
                  setDistrict(e.target.value || null);
                }}
                className="appearance-none bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer hover:border-white/20 min-w-[150px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <option value="">All Districts</option>
                {topDistricts.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666] pointer-events-none group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
          
          {/* Clear Filters - Premium Button */}
          {(filter.state || filter.district) && (
            <button
              onClick={() => {
                playSonarBeep();
                setState(null);
                setDistrict(null);
              }}
              className="flex items-center gap-1.5 text-[9px] text-cyan-400 hover:text-white transition-all ml-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/30"
            >
              <X className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">Clear</span>
            </button>
          )}
        </div>

        {/* Premium Action Buttons */}
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.15em] relative">
          {/* FIT Button */}
          <button 
            onClick={onZoomToFit}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
            <span className="text-[#888] group-hover:text-white transition-colors tracking-wider">FIT</span>
          </button>
          
          {/* CASCADE Button */}
          <button 
            onClick={onShowCascade}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 group ${
              showCascade 
                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]' 
                : 'bg-gradient-to-b from-white/5 to-transparent border-white/10 hover:border-blue-500/30 text-[#888] hover:text-blue-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="tracking-wider">CASCADE</span>
          </button>
          
          {/* RANK Button */}
          <button 
            onClick={onShowLeaderboard}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 group ${
              showLeaderboard 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                : 'bg-gradient-to-b from-white/5 to-transparent border-white/10 hover:border-amber-500/30 text-[#888] hover:text-amber-400'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="tracking-wider">RANK</span>
          </button>
          
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-1" />
          
          {/* Icon Buttons */}
          <button className="p-2.5 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <Search className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
          </button>
          <button className="p-2.5 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <Settings className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Global shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Premium Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Subtle ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
        
        {/* Premium Sidebar */}
        <div className="w-[280px] border-r border-white/5 bg-gradient-to-b from-[#0a0a0a] to-[#050505] overflow-hidden shrink-0 flex flex-col relative backdrop-blur-xl">
          {/* Sidebar top line accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          {/* Sidebar header */}
          <div className="h-10 border-b border-white/5 flex items-center px-4 bg-gradient-to-r from-white/[0.02] to-transparent">
            <span className="text-[9px] font-bold tracking-[0.3em] text-[#666] uppercase">Situation</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <KPIRibbon filteredPatients={globalPatients || filteredPatients} compact />
          </div>
        </div>
        
        {/* Premium Main Map Area */}
        <main className="flex-1 relative z-0 bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          {children}

          {/* Premium Floating Legend Control */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center gap-3">
            <AnimatePresence>
              {isLegendOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-b from-[#111111]/95 to-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-4 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(34,211,238,0.1)] origin-bottom"
                >
                  <ColorLegend className="bg-transparent border-none p-0 !shadow-none" />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 rounded-xl px-6 py-2.5 transition-all duration-300 flex items-center gap-2.5 pointer-events-auto text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] group"
            >
              <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> 
              {isLegendOpen ? 'Close Legend' : 'Open Legend'}
            </button>
          </div>
        </main>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BOTTOM PANEL: PREMIUM NEURAL CONSOLE */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="h-[340px] bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-t border-white/5 shrink-0 flex text-[10px] font-bold tracking-widest text-[#777] z-50 relative">
        {/* Panel top line accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        
        {/* SECTION 1: GEOGRAPHY MATRIX (LEFT - EXPANDED) */}
        <div className="flex-1 border-r border-white/5 flex flex-col bg-gradient-to-b from-[#080808] to-[#030303] relative overflow-hidden">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
               
          {/* Premium Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-white tracking-[0.25em] font-black text-[11px] uppercase">Geography Matrix</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30 text-red-400 text-[9px] font-black tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                High Yield
              </span>
            </div>
          </div>
          
          <div className="flex-1 relative flex items-center px-4">
            {/* Left Arrow */}
            <button 
              onClick={() => scrollMatrix('L')}
              className="absolute left-2 z-30 w-10 h-10 rounded-full bg-black/60 border border-white/20 backdrop-blur flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all duration-300 shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Scrollable Container */}
            <div 
              ref={matrixRef}
              className="flex-1 h-full flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide px-12"
              style={{ scrollBehavior: 'smooth' }}
            >
               {topDistricts.map((dist:any, i) => {
                 const districtPatients = activePool.filter((p: any) => p.screening_district === dist);
                 const vol = districtPatients.length;
                 
                 // Detailed metrics
                 const suspected = districtPatients.filter((p: any) => p.xray_result === 'Suspected TB Case').length;
                 const notSuspected = vol - suspected;
                 const diagnosed = districtPatients.filter((p: any) => p.tb_diagnosed === 'Y').length;
                 const treatmentInitiated = districtPatients.filter((p: any) => p.att_start_date != null).length;
                 const treated = districtPatients.filter((p: any) => p.att_completion_date != null).length;
                 
                 // Determine glow color based on suspected rate
                 const suspectedRate = vol > 0 ? (suspected / vol) * 100 : 0;
                 let glowColor = '6,182,212'; 
                 let textColor = 'text-cyan-400';
                 if (suspectedRate > 30) {
                   glowColor = '239,68,68';
                   textColor = 'text-red-400';
                 } else if (suspectedRate > 15) {
                   glowColor = '245,158,11';
                   textColor = 'text-amber-400';
                 }
                 const isSelected = filter.district === dist;
                 
                 return (
                  <div 
                    key={dist} 
                    onClick={() => {
                      playSonarBeep();
                      setDistrict(isSelected ? null : dist);
                    }}
                    className={`shrink-0 w-[180px] h-full snap-center snap-always relative group/tile transition-all duration-500 cursor-crosshair transform-gpu hover:scale-[1.02] ${isSelected ? 'z-30' : 'z-10'}`}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -inset-6 rounded-xl blur-3xl pointer-events-none"
                          style={{ backgroundColor: `rgba(${glowColor}, 0.4)` }}
                        />
                      )}
                    </AnimatePresence>

                    <div 
                      className="w-full h-full bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] backdrop-blur-2xl border-[1.5px] rounded-xl transition-all duration-500 flex flex-col overflow-hidden relative transform-gpu p-3 group-hover/tile:shadow-[0_0_40px_rgba(34,211,238,0.3)] group/card"
                      style={{
                        borderColor: isSelected ? 'rgba(255,255,255,0.9)' : `rgba(${glowColor}, 0.5)`,
                        boxShadow: isSelected 
                          ? `0 0 50px rgba(${glowColor}, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)` 
                          : `0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`
                      }}
                    >
                       {/* Animated border glow */}
                       <div 
                         className="absolute -inset-[1px] rounded-xl opacity-40 blur-[2px] transition-opacity duration-500 group-hover/card:opacity-80"
                         style={{ background: `linear-gradient(135deg, rgba(${glowColor}, 0.6) 0%, transparent 50%, rgba(${glowColor}, 0.3) 100%)` }}
                       />
                       {/* Premium glass overlay */}
                       <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
                       <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                       
                       {/* District Header */}
                       <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${glowColor})`, boxShadow: `0 0 10px rgba(${glowColor}, 0.8)` }} />
                           <span className={`text-[8px] font-black tracking-[0.15em] truncate uppercase ${isSelected ? 'text-white' : textColor}`}>{dist}</span>
                         </div>
                         <span className="text-[10px] font-black text-white tabular-nums">{vol.toLocaleString()}</span>
                       </div>
                       
                       {/* Premium Metrics Grid */}
                       <div className="flex-1 grid grid-cols-2 gap-2">
                         <div className="flex flex-col bg-gradient-to-br from-red-950/40 to-red-900/20 rounded-lg p-2 border border-red-500/30 backdrop-blur-sm group-hover/tile:border-red-500/50 transition-colors">
                           <span className="text-red-400 font-bold text-[7px] tracking-wider uppercase mb-1">Suspected</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{suspected}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 rounded-lg p-2 border border-emerald-500/30 backdrop-blur-sm group-hover/tile:border-emerald-500/50 transition-colors">
                           <span className="text-emerald-400 font-bold text-[7px] tracking-wider uppercase mb-1">Clear</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{notSuspected}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-amber-950/40 to-amber-900/20 rounded-lg p-2 border border-amber-500/30 backdrop-blur-sm group-hover/tile:border-amber-500/50 transition-colors">
                           <span className="text-amber-400 font-bold text-[7px] tracking-wider uppercase mb-1">Diagnosed</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{diagnosed}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-purple-950/40 to-purple-900/20 rounded-lg p-2 border border-purple-500/30 backdrop-blur-sm group-hover/tile:border-purple-500/50 transition-colors">
                           <span className="text-purple-400 font-bold text-[7px] tracking-wider uppercase mb-1">On ATT</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{treatmentInitiated}</span>
                         </div>
                       </div>
                       
                       {/* Progress Bar - Suspected Rate */}
                       <div className="mt-2 space-y-1">
                         <div className="flex items-center justify-between text-[6px] uppercase tracking-wider">
                           <span className="text-[#666] font-bold">Risk Level</span>
                           <span className="font-black" style={{ color: `rgb(${glowColor})` }}>{suspectedRate.toFixed(1)}%</span>
                         </div>
                         <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(suspectedRate, 100)}%` }}
                             transition={{ duration: 0.8, ease: "easeOut" }}
                             className="h-full rounded-full relative"
                             style={{ 
                               backgroundColor: `rgb(${glowColor})`,
                               boxShadow: `0 0 8px rgba(${glowColor}, 0.8), 0 0 20px rgba(${glowColor}, 0.4)`
                             }}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                           </motion.div>
                         </div>
                       </div>
                       
                       {/* Premium Treated Footer */}
                       <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-transparent rounded-lg px-2 py-1">
                         <span className="text-[7px] text-cyan-300/70 font-bold tracking-wider uppercase">Treated</span>
                         <span className="text-[12px] font-black text-cyan-400 tabular-nums">{treated}</span>
                       </div>
                    </div>
                  </div>
                 );
               })}
            </div>
            
            {/* Right Arrow */}
            <button 
              onClick={() => scrollMatrix('R')}
              className="absolute right-2 z-30 w-10 h-10 rounded-full bg-black/60 border border-white/20 backdrop-blur flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all duration-300 shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SECTION 2: AI BRIEF - Premium Neural Intelligence Panel */}
        <div className="w-[280px] flex flex-col bg-gradient-to-b from-[#080808] to-[#030303] relative group/ai overflow-hidden">
          {/* Left accent line */}
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
          
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-transparent pointer-events-none" />
          
          {/* Premium Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-white tracking-[0.25em] font-black text-[11px] uppercase">AI Brief</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.15)] font-black text-[8px] relative z-10 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
              ACTIVE
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] relative">
            {/* Functional Telemetry Layer */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none overflow-hidden font-mono text-[6px] text-cyan-500 break-all leading-none transition-opacity group-hover:opacity-[0.07]">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                  {Math.random().toString(16).repeat(10)}
                </div>
              ))}
            </div>

            {/* Notification Stream - NOVA NEON */}
            <div ref={aiFeedRef} className="flex-1 overflow-y-auto custom-dark-scrollbar p-3 space-y-3 relative z-10">
              <AnimatePresence initial={false}>
                {aiInsights.map((insight, idx) => {
                  const isCommand = insight.insightText.includes('COMMAND');
                  const isAlert = insight.insightText.includes('CRITICAL') || insight.insightText.includes('BREACH');
                  const spectralColor = isCommand ? 'blue' : isAlert ? 'red' : 'cyan';
                  const glowRGB = isCommand ? '37,99,235' : isAlert ? '239,68,68' : '6,182,212';
                  
                  return (
                  <motion.div 
                    key={insight.timestamp}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`border p-3 rounded-sm relative overflow-hidden group/card shadow-[0_0_25px_rgba(${glowRGB},0.15)] hover:shadow-[0_0_40px_rgba(${glowRGB},0.3)] transition-all duration-500 backdrop-blur-xl bg-white/[0.02]`}
                    style={{ borderColor: `rgba(${glowRGB}, 0.3)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                    <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                    <div className={`absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                    
                    <div className="flex items-center justify-between mb-2 opacity-60 text-[8px] font-black tracking-widest uppercase relative z-10">
                      <span className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full bg-[rgb(${glowRGB})] shadow-[0_0_6px_rgba(${glowRGB},1)] animate-pulse`} />
                        <Globe className="w-2.5 h-2.5" style={{ color: `rgb(${glowRGB})` }} /> 
                        <span style={{ color: `rgb(${glowRGB})` }}>{isCommand ? 'SECURE_CMD' : isAlert ? 'ALERT' : 'INTEL'}</span>
                      </span>
                      <span className="text-[#666]">{new Date(insight.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-[#aaa] leading-relaxed normal-case font-medium tracking-tight relative z-10 group-hover/card:text-white transition-colors">
                      {insight.insightText}
                    </p>
                    {insight.activeNode && !isCommand && (
                      <div className="mt-2 text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 relative z-10" style={{ color: `rgb(${glowRGB})` }}>
                        <div className={`w-1 h-1 rounded-full shadow-[0_0_6px_rgba(${glowRGB},1)]`} style={{ backgroundColor: `rgb(${glowRGB})` }} />
                        NODE: {insight.activeNode}
                      </div>
                    )}
                  </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {aiLoading && (
                <div className="flex items-center gap-2 p-2 opacity-50">
                  <span className="w-1 h-1 bg-cyan-500 animate-ping rounded-full" />
                  <span className="text-[9px] tracking-widest animate-pulse">SYNCING_TELEMETRY...</span>
                </div>
              )}

              {aiInsights.length === 0 && !aiLoading && (
                <div className="h-full flex flex-col items-center justify-center text-[#333] opacity-50 space-y-2">
                  <Cpu className="w-8 h-8 animate-pulse" />
                  <span className="text-[9px] tracking-[0.2em] font-black uppercase italic">Neural standby...</span>
                </div>
              )}
            </div>

            {/* Tactical Action Button */}
            <div className="p-3 bg-[#0d0d0d] border-t border-[#222]">
              <button 
                onClick={handleIntervention}
                disabled={aiInsights.length === 0 || isIntervening}
                className={`w-full flex flex-col items-center justify-center p-3 rounded-sm font-black tracking-[0.2em] text-[9px] transition-all relative overflow-hidden uppercase
                  ${aiInsights.length > 0 && !isIntervening ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer' : 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'}
                `}
              >
                {isIntervening && <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-blue-400/20 skew-x-12" />}
                <span className="relative z-10">{isIntervening ? 'SYNCHRONIZING_NODES...' : 'EXECUTE INTERVENTION'}</span>
                {!isIntervening && aiInsights.length > 0 && <span className="text-[7px] opacity-60 mt-0.5 tracking-[0.1em]">Target: {aiInsights[aiInsights.length-1].activeNode}</span>}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
