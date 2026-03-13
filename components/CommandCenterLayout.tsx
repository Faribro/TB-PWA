'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Building2, Hospital, Maximize2 } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { DESIGN_TOKENS } from '@/lib/designTokens';
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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER BAR - Docked Top */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          fixed top-0 left-0 right-0
          ${DESIGN_TOKENS.zIndex.interactive}
          ${DESIGN_TOKENS.background.panel}
          ${DESIGN_TOKENS.backdropBlur}
          border-b ${DESIGN_TOKENS.border.inactive.split(' ')[1]}
        `}
        style={{ height: `${DESIGN_TOKENS.layout.headerHeight}px` }}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Primary Actions */}
          <div className="flex items-center gap-4">

            {/* Cascade Button */}
            <button
              onClick={onShowCascade}
              className={`
                flex items-center gap-2 px-4 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                ${showCascade
                  ? `${DESIGN_TOKENS.background.active} ${DESIGN_TOKENS.border.active} text-cyan-200`
                  : `${DESIGN_TOKENS.border.inactive} text-slate-400 hover:text-white hover:bg-white/5`
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-semibold">Cascade</span>
            </button>

            {/* Rankings Button */}
            <button
              onClick={onShowLeaderboard}
              className={`
                flex items-center gap-2 px-4 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                ${showLeaderboard
                  ? `bg-amber-500/20 border-2 border-amber-500/60 text-amber-200`
                  : `${DESIGN_TOKENS.border.inactive} text-slate-400 hover:text-white hover:bg-white/5`
                }
              `}
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-semibold">Rankings</span>
            </button>
          </div>

          {/* Right: Sidebar Toggles */}
          <div className="flex items-center gap-4">
            {/* Zoom to Fit */}
            <button
              onClick={onZoomToFit}
              className={`
                flex items-center gap-2 px-4 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.border.inactive}
                ${DESIGN_TOKENS.transition.fast}
                text-slate-400 hover:text-white hover:bg-white/5
              `}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Fit All</span>
            </button>

            <div className="w-px h-8 bg-slate-700/50" />

            {/* Left Sidebar Toggle */}
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`
                flex items-center gap-2 px-4 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                ${leftSidebarOpen || hasActiveFilters
                  ? `bg-purple-500/20 border-2 border-purple-500/60 text-purple-200`
                  : `${DESIGN_TOKENS.border.inactive} text-slate-400 hover:text-white hover:bg-white/5`
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold">Filters</span>
              {hasActiveFilters && (
                <span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {[filter.coordinator, filter.status !== 'All', filter.district].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Right Sidebar Toggle */}
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`
                flex items-center gap-2 px-4 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                ${rightSidebarOpen
                  ? `${DESIGN_TOKENS.background.active} ${DESIGN_TOKENS.border.active} text-cyan-200`
                  : `${DESIGN_TOKENS.border.inactive} text-slate-400 hover:text-white hover:bg-white/5`
                }
              `}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-semibold">Legend</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Tactical Filters */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {leftSidebarOpen && (
          <motion.aside
            initial={{ x: -DESIGN_TOKENS.layout.leftSidebarWidth }}
            animate={{ x: 0 }}
            exit={{ x: -DESIGN_TOKENS.layout.leftSidebarWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed left-0
              ${DESIGN_TOKENS.zIndex.interactive}
              ${DESIGN_TOKENS.background.panel}
              ${DESIGN_TOKENS.backdropBlur}
              border-r ${DESIGN_TOKENS.border.inactive.split(' ')[1]}
              overflow-y-auto
            `}
            style={{
              top: `${DESIGN_TOKENS.layout.headerHeight}px`,
              bottom: `${DESIGN_TOKENS.layout.footerHeight}px`,
              width: `${DESIGN_TOKENS.layout.leftSidebarWidth}px`,
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm font-bold text-purple-300 uppercase tracking-widest">
                    Tactical Filters
                  </h2>
                </div>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Coordinator Filter */}
              <div className="mb-6">
                <label className={`${DESIGN_TOKENS.text.label} mb-2 block`}>
                  Prison Coordinator
                </label>
                <select
                  value={filter.coordinator || ''}
                  onChange={e => setCoordinator(e.target.value || null)}
                  className={`
                    w-full px-3 py-2
                    ${DESIGN_TOKENS.borderRadius.button}
                    ${DESIGN_TOKENS.border.inactive}
                    bg-slate-900/50 text-white text-sm
                    focus:outline-none focus:border-cyan-500
                    ${DESIGN_TOKENS.transition.fast}
                  `}
                >
                  <option value="">All Coordinators</option>
                  {uniqueCoordinators.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <label className={`${DESIGN_TOKENS.text.label} mb-2 block`}>
                  Status
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(['All', 'High Alert', 'On Track'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatus(status)}
                      className={`
                        px-3 py-2 text-sm font-semibold
                        ${DESIGN_TOKENS.borderRadius.button}
                        ${DESIGN_TOKENS.transition.fast}
                        ${filter.status === status
                          ? status === 'High Alert'
                            ? 'bg-red-500/20 border-2 border-red-500/60 text-red-200'
                            : status === 'On Track'
                            ? 'bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-200'
                            : 'bg-cyan-500/20 border-2 border-cyan-500/60 text-cyan-200'
                          : `${DESIGN_TOKENS.border.inactive} text-slate-400 hover:text-white hover:bg-white/5`
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="pt-4 border-t border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className={DESIGN_TOKENS.text.label}>Active Filters</span>
                    <button
                      onClick={resetFilters}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filter.coordinator && (
                      <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-full px-3 py-1 text-xs text-cyan-300 flex items-center gap-2">
                        {filter.coordinator}
                        <button onClick={() => setCoordinator(null)}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filter.status !== 'All' && (
                      <div className="bg-amber-500/20 border border-amber-500/50 rounded-full px-3 py-1 text-xs text-amber-300 flex items-center gap-2">
                        {filter.status}
                        <button onClick={() => setStatus('All')}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filter.district && (
                      <div className="bg-purple-500/20 border border-purple-500/50 rounded-full px-3 py-1 text-xs text-purple-300 flex items-center gap-2">
                        {filter.district}
                        <button onClick={() => setCoordinator(null)}>
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
            initial={{ x: DESIGN_TOKENS.layout.rightSidebarWidth }}
            animate={{ x: 0 }}
            exit={{ x: DESIGN_TOKENS.layout.rightSidebarWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed right-0
              ${DESIGN_TOKENS.zIndex.interactive}
              ${DESIGN_TOKENS.background.panel}
              ${DESIGN_TOKENS.backdropBlur}
              border-l ${DESIGN_TOKENS.border.inactive.split(' ')[1]}
              overflow-y-auto
            `}
            style={{
              top: `${DESIGN_TOKENS.layout.headerHeight}px`,
              bottom: `${DESIGN_TOKENS.layout.footerHeight}px`,
              width: `${DESIGN_TOKENS.layout.rightSidebarWidth}px`,
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-widest">
                    Map Legend
                  </h2>
                </div>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legend */}
              <ColorLegend className="mb-6" />

              {/* Instructions */}
              <div className={`${DESIGN_TOKENS.borderRadius.panel} ${DESIGN_TOKENS.border.inactive} ${DESIGN_TOKENS.background.panelLight} p-4`}>
                <div className={`${DESIGN_TOKENS.text.label} mb-2`}>Controls</div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>• Drag to pan the map</div>
                  <div>• Scroll to zoom in/out</div>
                  <div>• Hover over clusters for details</div>
                  <div>• Click KPI ribbon to filter</div>
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
        className="absolute"
        style={{
          top: `${DESIGN_TOKENS.layout.headerHeight}px`,
          bottom: `${DESIGN_TOKENS.layout.footerHeight}px`,
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
