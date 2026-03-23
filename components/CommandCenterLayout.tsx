'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Building2, Hospital, Maximize2 } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { KPIRibbon } from './KPIRibbon';
import { ColorLegend } from './ColorLegend';
import ThreeBackground from './ThreeBackground';

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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <ThreeBackground />
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER BAR - Docked Top */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0.8, y: -80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 z-50 glass-light border-b border-white shadow-lg"
        style={{ height: '80px' }}
      >
        <div className="h-full px-8 flex items-center justify-between">
          {/* Left: Primary Actions */}
          <div className="flex items-center gap-4">
            {/* Cascade Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onShowCascade}
              className={`
                flex items-center gap-2.5 px-5 py-2.5
                rounded-2xl transition-all duration-300 font-bold
                ${showCascade
                  ? `bg-blue-600 text-white shadow-lg shadow-blue-500/20`
                  : `bg-white/50 border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 shadow-sm`
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm tracking-tight">Cascade</span>
            </motion.button>

            {/* Rankings Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onShowLeaderboard}
              className={`
                flex items-center gap-2.5 px-5 py-2.5
                rounded-2xl transition-all duration-300 font-bold
                ${showLeaderboard
                  ? `bg-amber-500 text-white shadow-lg shadow-amber-500/20`
                  : `bg-white/50 border border-slate-200 text-slate-600 hover:bg-white hover:border-amber-300 hover:text-amber-600 shadow-sm`
                }
              `}
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm tracking-tight">Rankings</span>
            </motion.button>
          </div>

          {/* Right: Sidebar Toggles */}
          <div className="flex items-center gap-4">
            {/* Zoom to Fit */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'white' }}
              whileTap={{ scale: 0.98 }}
              onClick={onZoomToFit}
              className={`
                flex items-center gap-2 px-4 py-2.5
                rounded-2xl border border-slate-200 bg-white/50
                transition-all duration-300 text-slate-500 hover:text-slate-900 shadow-sm
              `}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm font-bold tracking-tight">Fit All</span>
            </motion.button>

            <div className="w-px h-8 bg-slate-200" />

            {/* Left Sidebar Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`
                flex items-center gap-2.5 px-5 py-2.5
                rounded-2xl transition-all duration-300 font-bold
                ${leftSidebarOpen || hasActiveFilters
                  ? `bg-indigo-600 text-white shadow-lg shadow-indigo-500/20`
                  : `bg-white/50 border border-slate-200 text-slate-600 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 shadow-sm`
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm tracking-tight">Filters</span>
              {hasActiveFilters && (
                <span className="bg-white text-indigo-600 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-inner">
                  {[filter.coordinator, filter.status !== 'All', filter.district].filter(Boolean).length}
                </span>
              )}
            </motion.button>

            {/* Right Sidebar Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`
                flex items-center gap-2.5 px-5 py-2.5
                rounded-2xl transition-all duration-300 font-bold
                ${rightSidebarOpen
                  ? `bg-blue-600 text-white shadow-lg shadow-blue-500/20`
                  : `bg-white/50 border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 shadow-sm`
                }
              `}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm tracking-tight">Legend</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Tactical Filters */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {leftSidebarOpen && (
          <motion.aside
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute left-0 z-50 glass-light border-r border-white shadow-2xl overflow-y-auto hide-scrollbar"
            style={{
              top: '80px',
              bottom: '100px',
              width: '360px',
            }}
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Filter className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Tactical Filters
                  </h2>
                </div>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Coordinator Filter */}
              <div className="mb-8">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
                  Prison Coordinator
                </label>
                <div className="relative group">
                  <select
                    value={filter.coordinator || ''}
                    onChange={e => setCoordinator(e.target.value || null)}
                    className={`
                      w-full px-4 py-3 rounded-2xl
                      border border-slate-200 bg-white/50
                      text-slate-900 text-sm font-bold
                      appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                      transition-all duration-300
                    `}
                  >
                    <option value="">All Coordinators</option>
                    {uniqueCoordinators.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-8">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
                  Deployment Status
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {(['All', 'High Alert', 'On Track'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatus(status)}
                      className={`
                        px-4 py-3 text-sm font-bold rounded-2xl
                        transition-all duration-300 text-left flex items-center justify-between
                        ${filter.status === status
                          ? status === 'High Alert'
                            ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm'
                            : status === 'On Track'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm'
                            : 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                          : 'bg-white/30 border border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300 hover:text-slate-700'
                        }
                      `}
                    >
                      {status}
                      {filter.status === status && <div className={`w-1.5 h-1.5 rounded-full bg-current`} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="pt-6 border-t border-slate-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Configuration</span>
                    <button
                      onClick={resetFilters}
                      className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 tracking-wider"
                    >
                      Reset All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filter.coordinator && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-blue-600 flex items-center gap-2 shadow-sm">
                        {filter.coordinator}
                        <button onClick={() => setCoordinator(null)} className="hover:text-blue-800">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filter.status !== 'All' && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-amber-600 flex items-center gap-2 shadow-sm">
                        {filter.status}
                        <button onClick={() => setStatus('All')} className="hover:text-amber-800">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* RIGHT SIDEBAR - Legend & Controls */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.aside
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 z-50 glass-light border-l border-white shadow-2xl overflow-y-auto hide-scrollbar"
            style={{
              top: '80px',
              bottom: '100px',
              width: '400px',
            }}
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Intelligence Map Legend
                  </h2>
                </div>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Legend */}
              <div className="mb-8">
                <ColorLegend className="p-0" />
              </div>

              {/* Instructions */}
              <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                {/* Decorative glow inside dark box */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                
                <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Interface Controls
                </h3>
                <div className="space-y-3">
                  {[
                    'Drag canvas to navigate map',
                    'Scroll wheel for precision zoom',
                    'Hover clusters for intel peek',
                    'Click KPI ribbon for quick filter'
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-400 text-[11px] font-medium">
                      <div className="w-1 h-1 rounded-full bg-slate-700" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAP STAGE - Center (fills remaining space) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <main
        className="absolute z-0"
        style={{
          top: '80px',
          bottom: '100px',
          left: 0,
          right: 0,
        }}
      >
        {children}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FOOTER RIBBON - KPI Dashboard */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <KPIRibbon filteredPatients={filteredPatients} />
    </div>
  );
}
