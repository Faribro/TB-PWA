'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Maximize2, Settings, Search, Cpu } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { KPIRibbon } from './KPIRibbon';
import { ColorLegend } from './ColorLegend';

interface CommandCenterLayoutProps {
  children: ReactNode;
  filteredPatients: any[];
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
  uniqueCoordinators,
  onZoomToFit,
  onShowCascade,
  onShowLeaderboard,
  showCascade,
  showLeaderboard,
  heatmapMode,
  onHeatmapModeChange,
}: CommandCenterLayoutProps) {
  const { filter, setCoordinator, setStatus, resetFilters, hasActiveFilters } = useUniversalFilter();

  // Quick stats extraction
  const highRiskPatients = filteredPatients.filter(p => !p.referral_date).length;
  const topDistricts = [...new Set(filteredPatients.map((p: any) => p.screening_district))].slice(0, 6);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-slate-300 font-mono overflow-hidden uppercase">
      {/* ───────────────────────────────────────────────────────── */}
      {/* TOP HEADER */}
      {/* ───────────────────────────────────────────────────────── */}
      <header className="h-[44px] bg-[#121212] flex items-center justify-between border-b border-[#222] px-3 shrink-0 relative z-50">
        
        {/* Left items */}
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] text-[#777]">
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-sm border border-emerald-500/20">
            <Globe className="w-3 h-3" />
            WORLD
          </div>
          <div className="flex items-center gap-3 bg-[#1a1a1a] px-3 py-1 rounded-sm border border-[#333]">
            <span className="text-white">MONITOR</span>
            <span className="text-[#555] text-[9px] tracking-widest">v2.0.7</span>
          </div>
          <div className="text-[#666] flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
            <span className="text-cyan-500">@</span>SAMADHAAN
          </div>
          
          <div className="flex items-center gap-1.5 ml-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500">LIVE</span>
          </div>
          <div className="text-white">Global</div>
        </div>

        {/* Center: System Status */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-3">
          <div className="bg-[#161616] border border-[#333] px-4 py-1.5 rounded-sm text-[10px] font-black tracking-widest text-white flex items-center gap-3 shadow-inner">
            <Cpu className="w-3 h-3 text-amber-500" />
            <span className="text-amber-500">DEFCON 4</span>
            <span className="text-[#666]">24%</span>
          </div>
        </div>

        {/* Right items */}
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.1em] text-[#777]">
          {/* Tactical Filters Dropdowns embedded in Header */}
          <div className="flex items-center gap-2 mr-4">
            <select
              value={filter.coordinator || ''}
              onChange={e => setCoordinator(e.target.value || null)}
              className="bg-[#1a1a1a] border border-[#333] text-white px-2 py-1 rounded-sm focus:outline-none focus:border-[#555] hover:bg-[#222] transition-colors cursor-pointer w-32"
            >
              <option value="">ALL COORD...</option>
              {uniqueCoordinators.map(c => (
                <option key={c} value={c}>{c.substring(0,12)}...</option>
              ))}
            </select>
          </div>

          <button className="flex items-center gap-1.5 hover:text-white transition-colors" onClick={onZoomToFit}>
            <Maximize2 className="w-3 h-3" /> FIT
          </button>
          <div className="w-px h-3 bg-[#333]" />
          <button className={`flex items-center gap-1.5 transition-colors ${showCascade ? 'text-blue-400' : 'hover:text-white'}`} onClick={onShowCascade}>
            <BarChart3 className="w-3 h-3" /> CASCADE
          </button>
          <button className={`flex items-center gap-1.5 transition-colors ${showLeaderboard ? 'text-amber-400' : 'hover:text-white'}`} onClick={onShowLeaderboard}>
            <Trophy className="w-3 h-3" /> RANK
          </button>
          <div className="w-px h-3 bg-[#333]" />
          <button className="hover:text-white transition-colors border border-[#333] bg-[#1a1a1a] p-1 rounded-sm"><Search className="w-3 h-3" /></button>
          <button className="hover:text-white transition-colors border border-[#333] bg-[#1a1a1a] p-1 rounded-sm"><Settings className="w-3 h-3" /></button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MIDDLE: LAYERS & MAP */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: LAYERS -> handled by fully restyled KPIRibbon */}
        <KPIRibbon filteredPatients={filteredPatients} compact />

        {/* CENTER: MAP AREA */}
        <main className="flex-1 relative z-0 bg-[#050505]">
          {children}

          {/* Floating World Monitor Legend */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-[#111111]/95 backdrop-blur-xl border border-[#333] rounded-sm flex items-center p-2 pointer-events-auto shadow-2xl">
              <div className="px-4 text-[9px] font-black tracking-widest text-[#666] border-r border-[#333] mr-3 uppercase flex items-center gap-2">
                <Layers className="w-3 h-3" /> LEGEND
              </div>
              <ColorLegend className="bg-transparent border-none p-0 !shadow-none" />
            </div>
          </div>
        </main>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BOTTOM PANEL: FEEDS */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="h-[260px] bg-[#0a0a0a] border-t border-[#222] shrink-0 flex text-[10px] font-bold tracking-widest text-[#777] z-50">
        
        {/* News Feed / Alerts */}
        <div className="w-[300px] border-r border-[#222] flex flex-col bg-[#111111]">
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#161616]">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.2em] font-black">LIVE ALERTS</span>
              <span className="text-red-500 border border-red-500/20 px-1.5 rounded-sm bg-red-500/10">
                {highRiskPatients}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="hover:text-white px-2 py-0.5 border border-[#333] rounded-sm opacity-50">||</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-dark-scrollbar">
            {filteredPatients.slice(0, 15).map((p: any) => (
              <div key={p.id} className="px-3 py-2 border border-[#222] hover:border-[#444] bg-[#161616] hover:bg-[#1a1a1a] cursor-pointer flex justify-between rounded-sm items-center transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-red-500 group-hover:scale-125 transition-transform" />
                  <span className="text-amber-500 truncate uppercase" title={p.screening_district}>
                    {p.screening_district || "UNKNOWN REGION"}
                  </span>
                </div>
                <span className="text-[#555] shrink-0">{new Date(p.screening_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Webcams equivalent: Geography Array */}
        <div className="flex-1 border-r border-[#222] flex flex-col bg-[#050505]">
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#111111] shadow-md z-10">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.2em] font-black">GEOGRAPHY MATRIX</span>
              <span className="text-[#444] hover:text-white cursor-pointer ml-2">?</span>
            </div>
            <div className="flex items-center gap-2 text-[#555]">
              <span className="hover:text-white cursor-pointer bg-red-500/10 px-2.5 py-1 rounded-sm text-red-500 border border-red-500/20 shadow-inner">
                SLA BREACH
              </span>
              <span className="hover:text-white cursor-pointer px-2 py-1">ALL</span>
              <span className="hover:text-white cursor-pointer px-2 py-1">NORTH</span>
              <span className="hover:text-white cursor-pointer px-2 py-1">SOUTH</span>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-[1px] bg-[#222] overflow-hidden p-[1px]">
             {topDistricts.map((dist:any, i) => (
                <div key={i} className="bg-[#111111] relative group overflow-hidden flex flex-col items-center justify-center border border-transparent hover:border-[#333] transition-colors cursor-crosshair">
                   <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 bg-[#000]/80 border border-[#222] px-2 py-1 rounded-sm backdrop-blur-md">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse" />
                     <span className="text-[9px] text-white tracking-widest">{dist || 'REG-UNDEF'}</span>
                   </div>
                   
                   {/* Matrix Visuals */}
                   <div className="w-full h-full opacity-40 group-hover:opacity-80 transition-opacity relative bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat">
                     <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] mix-blend-multiply" />
                     <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-red-500/10 to-transparent mix-blend-screen transition-all group-hover:h-full" />
                     <div className="absolute inset-0 flex items-center justify-center">
                       <div className="text-[48px] text-[#222] font-black tracking-tighter drop-shadow-lg group-hover:text-[#444] transition-colors">
                         {filteredPatients.filter((p:any) => p.screening_district === dist).length}
                       </div>
                     </div>
                   </div>
                   
                   <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                     <span className="bg-[#000]/80 px-2 py-1 border border-[#222] rounded-sm text-[#888] font-mono text-[9px]">
                       NODE {String(i+1).padStart(2, '0')}
                     </span>
                   </div>
                </div>
             ))}
             {/* Fill empty spots if less than 6 */}
             {Array.from({length: Math.max(0, 6 - topDistricts.length)}).map((_, i) => (
               <div key={`empty-${i}`} className="bg-[#0a0a0a] flex items-center justify-center text-[#222] font-mono">
                 NO SIGNAL
               </div>
             ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="w-[340px] flex flex-col bg-[#111111]">
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#161616]">
            <div className="flex items-center gap-2">
              <span className="text-white tracking-[0.2em] font-black">AI INSIGHTS</span>
              <span className="text-[#444] hover:text-white cursor-pointer ml-2">?</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-sm bg-emerald-500/10 tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto custom-dark-scrollbar bg-[#0a0a0a]">
            {/* World Brief Card */}
            <div className="border border-[#333] bg-[#111111] rounded-sm p-5 hover:border-[#555] transition-all cursor-pointer relative overflow-hidden group shadow-lg">
              {/* Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
              
              <div className="flex items-center gap-3 mb-4 relative z-10 border-b border-[#222] pb-3">
                <Globe className="w-4 h-4 text-cyan-500" />
                <span className="text-white font-bold tracking-[0.15em] text-[11px]">WORLD BRIEF</span>
              </div>
              
              <div className="relative z-10 space-y-4">
                <p className="text-[11px] text-[#999] leading-[1.8] normal-case font-medium tracking-wide">
                  The health OS intelligence layer has detected <span className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded-sm">{highRiskPatients}</span> unreferred cases in active geographies.
                </p>
                <div className="h-px w-full bg-gradient-to-r from-[#333] to-transparent" />
                <p className="text-[11px] text-[#999] leading-[1.8] normal-case font-medium tracking-wide">
                  Analysis indicates the primary drop-off occurs during the <span className="text-cyan-400">referral conversion phase</span>. Teleport directly to matrix nodes for high-resolution interception.
                </p>
              </div>
            </div>
            
            <button className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-sm font-bold tracking-widest text-[10px] transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              EXECUTE INTERVENTION
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
