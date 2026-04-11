'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Maximize2, Settings, Search, Cpu, Database, ChevronLeft, ChevronRight, Activity, AlertCircle } from 'lucide-react';
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
  const { filter, setDistrict, setStatus, resetFilters, hasActiveFilters } = useUniversalFilter();

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<{insightText: string, activeNode: string, timestamp: number}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  const aiFeedRef = useRef<HTMLDivElement>(null);

  // Quick stats extraction
  const highRiskPatients = filteredPatients.filter(p => !p.referral_date).length;
  // Pin matrix to global nodes so it doesn't collapse when the user zeroes in on a single node
  const activePool = (globalPatients && globalPatients.length > 0) ? globalPatients : filteredPatients;
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

  const scrollMatrix = (dir: 'L' | 'R') => {
    if (!matrixRef.current) return;
    const scrollAmount = matrixRef.current.clientWidth * 0.4;
    matrixRef.current.scrollBy({ left: dir === 'L' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    playSonarBeep();
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
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-slate-300 font-mono overflow-hidden uppercase">
      {/* ───────────────────────────────────────────────────────── */}
      {/* TOP HEADER */}
      {/* ───────────────────────────────────────────────────────── */}
      <header className="h-[44px] bg-[#121212] flex items-center justify-between border-b border-[#222] px-3 shrink-0 relative z-50">
        
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] text-[#777]">
          <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-sm border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <Database className="w-3 h-3 text-cyan-400" />
            MADHYA PRADESH
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-1.5 bg-[#0a0a0a] border border-[#222] p-1 rounded-sm shadow-inner overflow-hidden">
          {[
            { id: 'All', label: 'ALL', icon: Globe },
            { id: 'Suspected', label: 'SUSPECTED', icon: Search, color: 'text-amber-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
            { id: 'Normal', label: 'NORMAL', icon: Activity, color: 'text-emerald-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' },
            { id: 'High Alert', label: 'HIGH ALERT', icon: AlertCircle, color: 'text-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' },
          ].map((item) => {
            const isActive = filter.status === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playSonarBeep();
                  setStatus(item.id as any);
                }}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all duration-300 relative group
                  ${isActive ? 'bg-[#1a1a1a] border border-[#333] z-10' : 'hover:bg-[#111] border border-transparent'}
                `}
              >
                {isActive && (
                  <motion.div 
                    layoutId="filter-active"
                    className="absolute inset-0 bg-white/[0.03] pointer-events-none"
                  />
                )}
                <Icon className={`w-3.5 h-3.5 ${isActive ? (item.color || 'text-cyan-400') : 'text-[#444] group-hover:text-[#888]'}`} />
                <span className={`text-[9px] font-black tracking-[0.2em] transition-colors
                  ${isActive ? 'text-white' : 'text-[#444] group-hover:text-[#888]'}
                `}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-[1px] ${item.color?.replace('text', 'bg') || 'bg-cyan-500'} ${item.glow || 'shadow-[0_0_8px_rgba(34,211,238,0.6)]'}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.1em] text-[#777]">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" onClick={onZoomToFit}>
            <Maximize2 className="w-3 h-3" /> <span className="drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">FIT</span>
          </button>
          <div className="w-px h-3 bg-[#333]" />
          <button className={`flex items-center gap-1.5 transition-colors hover:drop-shadow-[0_0_8px_currentColor] ${showCascade ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'hover:text-white'}`} onClick={onShowCascade}>
            <BarChart3 className="w-3 h-3" /> <span className="drop-shadow-[0_0_4px_currentColor]">CASCADE</span>
          </button>
          <button className={`flex items-center gap-1.5 transition-colors hover:drop-shadow-[0_0_8px_currentColor] ${showLeaderboard ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'hover:text-white'}`} onClick={onShowLeaderboard}>
            <Trophy className="w-3 h-3" /> <span className="drop-shadow-[0_0_4px_currentColor]">RANK</span>
          </button>
          <div className="w-px h-3 bg-[#333]" />
          <button className="hover:text-white transition-colors border border-[#333] bg-[#1a1a1a] hover:bg-[#222] p-1.5 rounded-sm"><Search className="w-3 h-3" /></button>
          <button className="hover:text-white transition-colors border border-[#333] bg-[#1a1a1a] hover:bg-[#222] p-1.5 rounded-sm"><Settings className="w-3 h-3" /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] border-r border-[#222] bg-[#0a0a0a] p-4 overflow-y-auto shrink-0">
          <div className="mb-3 pb-3 border-b border-[#222]">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-white mb-1 uppercase">LAYERS</h3>
            <p className="text-[8px] text-[#666] tracking-wider">Search layers...</p>
          </div>
          <KPIRibbon filteredPatients={globalPatients || filteredPatients} compact />
        </div>
        
        <main className="flex-1 relative z-0 bg-[#050505]">
          {children}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center gap-3">
            <AnimatePresence>
              {isLegendOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="bg-[#111111]/95 backdrop-blur-xl border border-[#333] rounded-sm p-3 pointer-events-auto shadow-[0_0_30px_rgba(6,182,212,0.15)] origin-bottom"
                >
                  <ColorLegend className="bg-transparent border-none p-0 !shadow-none" />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="bg-[#111111]/90 backdrop-blur-xl border border-[#333] hover:border-cyan-500 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] rounded-sm px-6 py-2 transition-all flex items-center gap-2 pointer-events-auto text-[10px] font-black tracking-[0.2em] uppercase origin-bottom group"
            >
              <Layers className="w-3 h-3 group-hover:drop-shadow-[0_0_5px_currentColor]" /> {isLegendOpen ? 'CLOSE LEGEND' : 'OPEN LEGEND'}
            </button>
          </div>
        </main>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BOTTOM PANEL: NEURAL CONSOLE (ENHANCED & EXPANDED) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="h-[340px] bg-[#0a0a0a] border-t border-[#222] shrink-0 flex text-[10px] font-bold tracking-widest text-[#777] z-50">
        
        {/* SECTION 1: AI INSIGHTS (LEFT) */}
        <div className="w-[260px] border-r border-[#222] flex flex-col bg-[#0a0a0a] relative">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500 to-transparent opacity-20" />
          
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#161616]">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.3em] font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] uppercase animate-pulse">AI BRIEF</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500 border border-emerald-500/40 px-2 py-0.5 rounded-full bg-emerald-950/30 tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] font-black text-[8px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              NEURAL
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

            {/* Notification Stream */}
            <div ref={aiFeedRef} className="flex-1 overflow-y-auto custom-dark-scrollbar p-3 space-y-3 relative z-10">
              <AnimatePresence initial={false}>
                {aiInsights.map((insight, idx) => (
                  <motion.div 
                    key={insight.timestamp}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`border p-3 rounded-sm relative overflow-hidden group shadow-lg ${insight.insightText.includes('COMMAND') ? 'bg-blue-950/20 border-blue-500/30' : 'bg-[#111111] border-[#333]'}`}
                  >
                    <div className="flex items-center justify-between mb-2 opacity-50 text-[8px] font-black tracking-widest uppercase">
                      <span className="flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> {insight.insightText.includes('COMMAND') ? 'SECURE_CMD' : 'GEMINI_REF'}
                      </span>
                      <span>{new Date(insight.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-[#999] leading-relaxed normal-case font-medium tracking-tight">
                      {insight.insightText}
                    </p>
                    {insight.activeNode && !insight.insightText.includes('COMMAND') && (
                      <div className="mt-2 text-[9px] text-cyan-500 font-black tracking-widest uppercase flex items-center gap-1">
                        <div className="w-1 h-1 bg-cyan-500 rounded-full" />
                        NODE: {insight.activeNode}
                      </div>
                    )}
                  </motion.div>
                ))}
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

        {/* SECTION 2: GEOGRAPHY MATRIX (CENTER) */}
        <div className="flex-1 border-r border-[#222] flex flex-col bg-[#030303] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
               
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#0a0a0a] shadow-2xl z-10">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.3em] font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] uppercase animate-pulse">GEOGRAPHY MATRIX</span>
              <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-transparent rounded-full ml-4 opacity-50" />
            </div>
            <div className="flex items-center gap-2 text-[#555]">
              <span className="cursor-pointer bg-red-500/10 px-3 py-1 rounded-sm text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] font-black hover:text-white transition-all">HIGH YIELD</span>
              <span className="cursor-pointer px-2 py-1 hover:text-white transition-all uppercase tracking-tighter">Volumetric Nodes</span>
            </div>
          </div>
          
          <div className="flex-1 relative group/matrix overflow-hidden">
            <button 
              onClick={() => scrollMatrix('L')}
              className="absolute left-0 inset-y-0 w-10 z-20 bg-gradient-to-r from-black to-transparent opacity-0 group-hover/matrix:opacity-100 transition-opacity flex items-center justify-center text-cyan-500 hover:text-white"
            >
              <ChevronLeft className="w-8 h-8 drop-shadow-[0_0_8px_currentColor]" />
            </button>
            <button 
              onClick={() => scrollMatrix('R')}
              className="absolute right-0 inset-y-0 w-10 z-20 bg-gradient-to-l from-black to-transparent opacity-0 group-hover/matrix:opacity-100 transition-opacity flex items-center justify-center text-cyan-500 hover:text-white"
            >
              <ChevronRight className="w-8 h-8 drop-shadow-[0_0_8px_currentColor]" />
            </button>

            <div 
              ref={matrixRef}
              className="w-full h-full flex overflow-x-auto overflow-y-hidden hidden-scrollbar gap-2 bg-[#0a0a0a] p-3"
            >
               {topDistricts.map((dist:any, i) => {
                 const districtPatients = activePool.filter((p: any) => p.screening_district === dist);
                 const vol = districtPatients.length;
                 const breaches = districtPatients.filter((p: any) => !p.referral_date && (Date.now() - new Date(p.screening_date).getTime())/(1000*3600*24) > 7).length;
                 const breachRate = vol > 0 ? (breaches / vol) * 100 : 0;
                 
                 let glowColor = '6,182,212'; 
                 let borderColor = 'border-cyan-500/30';
                 let textColor = 'text-cyan-400';
                 if (breachRate > 70) {
                   glowColor = '239,68,68';
                   borderColor = 'border-red-500/50';
                   textColor = 'text-red-400';
                 } else if (breachRate > 30) {
                   glowColor = '245,158,11';
                   borderColor = 'border-amber-500/50';
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
                    className={`shrink-0 aspect-square h-[85%] my-auto relative group transition-all cursor-crosshair ${isSelected ? 'z-30' : 'z-10'}`}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.2, 0.4, 0.2] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -inset-4 rounded-xl blur-2xl pointer-events-none"
                          style={{ backgroundColor: `rgba(${glowColor}, 0.5)` }}
                        />
                      )}
                    </AnimatePresence>

                    <div className={`w-full h-full bg-[#0a0a0a]/90 backdrop-blur-md border-[2px] rounded-lg transition-all duration-500 flex flex-col items-center justify-center overflow-hidden relative shadow-2xl ${isSelected ? `border-white shadow-[0_0_60px_rgba(${glowColor},0.6)] scale-[1]` : `${borderColor} hover:border-gray-400`}`}>
                       <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                       <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${isSelected ? 'border-white' : `border-[rgb(${glowColor})]/40`}`} />
                       <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${isSelected ? 'border-white' : `border-[rgb(${glowColor})]/40`}`} />

                       <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 bg-black/60 px-2 py-0.5 rounded-full border border-white/5">
                         <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : `bg-[rgb(${glowColor})] shadow-[0_0_8px_rgba(${glowColor},1)]`}`} />
                         <span className={`text-[8px] font-black tracking-[0.1em] ${isSelected ? 'text-white' : textColor}`}>{dist}</span>
                       </div>

                       <div className="w-full h-full flex flex-col items-center justify-center relative">
                         <div className={`absolute inset-0 bg-gradient-to-t from-[rgba(${glowColor},0.2)] via-transparent to-transparent opacity-30 mix-blend-screen transition-opacity`} />
                         <dt className={`text-[44px] font-black tracking-tighter transition-all z-10 tabular-nums leading-none select-none ${isSelected ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : `${textColor} drop-shadow-[0_0_15px_rgba(${glowColor},0.6)]`} `}>
                           {vol}
                         </dt>
                         <span className={`text-[8px] font-black mt-0.5 tracking-[0.3em] ${isSelected ? 'text-white/60' : 'text-[#444]'} transition-colors uppercase`}>T-VOL</span>
                       </div>

                       <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
                         <span className={`px-1.5 py-0.5 border rounded-sm font-mono text-[7px] font-black ${isSelected ? 'bg-white text-black border-white' : `bg-black/60 border-white/10 ${textColor}`}`}>
                           NX-{String(i+1).padStart(2, '0')}
                         </span>
                       </div>
                    </div>
                  </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* SECTION 3: LIVE ALERTS (RIGHT) */}
        <div className="w-[260px] flex flex-col bg-[#0d0d0d] relative overflow-hidden group">
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#161616] relative transition-colors group-hover:bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.3em] font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] animate-pulse uppercase">LIVE ALERTS</span>
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-[6px] opacity-30 animate-pulse" />
                <span className="relative text-red-500 border border-red-500/40 px-2 py-0.5 rounded-sm bg-red-950/20 font-black text-[10px] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  {highRiskPatients}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto hidden-scrollbar py-2 space-y-1" onClick={playSonarBeep}>
              <AnimatePresence>
                {filteredPatients.slice(0, 15).map((p, i) => (
                  <motion.div 
                    key={p.patient_id || i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-[#222] bg-[#111111] p-2 flex justify-between items-center rounded-sm group hover:border-[#444] transition-all cursor-crosshair mx-2 hover:bg-[#161616] shadow-md shadow-black/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                      <span className="text-[#999] group-hover:text-amber-500 font-bold tracking-widest text-[9px] transition-colors uppercase">
                        {p.screening_district || 'UNKNOWN'}
                      </span>
                    </div>
                    <span className="text-[#555] text-[8px] group-hover:text-white transition-colors font-bold tabular-nums">
                      {p.screening_date ? new Date(p.screening_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
