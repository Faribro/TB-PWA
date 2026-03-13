'use client';

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Map, Settings, Menu, GitBranch, Copy,
  LogOut, Network, ChevronLeft, ChevronRight,
  Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import SettingsTab from '@/components/SettingsTab';
import MandEHub from '@/components/MandEHub';

/* ─────────────────────────────────────────────
   DYNAMIC IMPORTS
───────────────────────────────────────────── */
const TabLoader = () => (
  <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
    <LinesAndDotsLoader progress={75} />
  </div>
);

const CommandCenter = dynamic(() => import('@/components/CommandCenter'), {
  ssr: false, loading: () => <TabLoader />,
});
const NeuralDashboard = dynamic(() => import('./neural-dashboard-view'), {
  ssr: false, loading: () => <TabLoader />,
});
const SpatialIntelligenceMap = dynamic(() => import('@/components/SpatialIntelligenceMap'), {
  ssr: false, loading: () => <TabLoader />,
});

/* ─────────────────────────────────────────────
   MEMOIZED TAB WRAPPERS
───────────────────────────────────────────── */
const MemoizedNeuralTab = memo(({ globalPatients, isLoading, onNavigateToPipeline, filter, onSetFilter }: {
  globalPatients: any[]; isLoading: boolean; onNavigateToPipeline?: () => void; filter: any; onSetFilter: (f: any) => void;
}) => (
  <DashboardErrorBoundary componentName="Vertex">
    <NeuralDashboard globalPatients={globalPatients} isLoading={isLoading} onNavigateToPipeline={onNavigateToPipeline} filter={filter} onSetFilter={onSetFilter} />
  </DashboardErrorBoundary>
));

const MemoizedCommandTab = memo(({ globalPatients, isLoading, filter }: { globalPatients: any[]; isLoading: boolean; filter: any }) => (
  <DashboardErrorBoundary componentName="Follow-up Pipeline">
    <CommandCenter globalPatients={globalPatients} isLoading={isLoading} initialFilter={filter} />
  </DashboardErrorBoundary>
));

const MemoizedDuplicatesTab = memo(({ globalPatients }: { globalPatients: any[] }) => (
  <DashboardErrorBoundary componentName="M&E Tools">
    <MandEHub globalPatients={globalPatients} />
  </DashboardErrorBoundary>
));

const MemoizedGISTab = memo(({ globalPatients }: { globalPatients: any[] }) => (
  <DashboardErrorBoundary componentName="GIS Map">
    <SpatialIntelligenceMap globalPatients={globalPatients} />
  </DashboardErrorBoundary>
));

/* ─────────────────────────────────────────────
   TAB CONFIG
───────────────────────────────────────────── */
const TAB_CONFIG = [
  { id: 'neural',    icon: Network,   label: 'Vertex',            description: 'Neural overview' },
  { id: 'command',   icon: GitBranch, label: 'Follow-up Pipeline', description: 'Patient pipeline' },
  { id: 'duplicates',icon: Copy,      label: 'M&E Tools',         description: 'Monitoring & eval' },
  { id: 'gis',       icon: Map,       label: 'GIS Map',           description: 'Spatial intelligence' },
  { id: 'settings',  icon: Settings,  label: 'Settings',          description: 'Account & sync' },
];

/* ─────────────────────────────────────────────
   FULL-SCREEN STATES
───────────────────────────────────────────── */
function FullScreenLoader() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-6"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg tracking-tight">Loading Dashboard</p>
          <p className="text-slate-500 text-sm mt-1">Fetching patient records…</p>
        </div>
        <LinesAndDotsLoader progress={75} />
      </motion.div>
    </div>
  );
}

function FullScreenError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-sm text-center"
      >
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Failed to load patients</h3>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{message}</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="mt-6 flex items-center gap-2 mx-auto px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR NAV ITEM
───────────────────────────────────────────── */
function NavItem({
  tab, isActive, isCollapsed, onClick, delay,
}: {
  tab: typeof TAB_CONFIG[0];
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  delay: number;
}) {
  const Icon = tab.icon;
  return (
    <motion.button
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? tab.label : undefined}
      className={`
        group relative w-full flex items-center gap-3 rounded-xl transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-3'}
        ${isActive
          ? 'bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-600'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-blue-500 to-violet-600 rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      {/* Icon container */}
      <div className={`
        relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/30'
          : 'bg-slate-100 group-hover:bg-slate-200'}
      `}>
        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />

        {/* Tooltip when collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
            {tab.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
          </div>
        )}
      </div>

      {/* Label — hidden when collapsed */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden min-w-0 text-left"
          >
            <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : ''}`}>{tab.label}</p>
            <p className="text-[10px] text-slate-400 truncate">{tab.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('neural');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeFilter, setActiveFilter] = useState<any>(null);

  const { data: globalPatients = [], isLoading, error, mutate } = useSWRAllPatients();
  const memoizedPatients = useMemo(() => globalPatients ?? [], [globalPatients]);

  const handleTabChange = useCallback((id: string) => setActiveTab(id), []);
  const handleSidebarToggle = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleSignOut = useCallback(() => signOut({ callbackUrl: '/login' }), []);
  const handleSetFilter = useCallback((filter: any) => setActiveFilter(filter), []);

  if (isLoading && !globalPatients?.length) return <FullScreenLoader />;
  if (error && !globalPatients?.length) return (
    <FullScreenError
      message={error?.message || 'Unknown error occurred'}
      onRetry={() => mutate()}
    />
  );

  return (
    <div className="flex h-screen w-full bg-[#F4F6F9] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <motion.aside
        layout
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex-shrink-0 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl flex flex-col overflow-hidden z-20 shadow-[4px_0_24px_rgb(0,0,0,0.04)]"
      >
        {/* Header */}
        <div className={`h-16 flex items-center border-b border-slate-100 flex-shrink-0 ${sidebarOpen ? 'px-5 justify-between' : 'justify-center'}`}>
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <img
                  src="/Images/Logo/AllianceIndia-Logo.png"
                  alt="Alliance India"
                  className="h-16 w-auto object-contain"
                  loading="lazy"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle button — morphs between open/close icons */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSidebarToggle}
            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            </motion.div>
          </motion.button>
        </div>

        {/* Nav items */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
          {TAB_CONFIG.map((tab, idx) => (
            <NavItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              isCollapsed={!sidebarOpen}
              onClick={() => handleTabChange(tab.id)}
              delay={idx * 0.04}
            />
          ))}
        </nav>

        {/* User chip */}
        {session && (
          <div className={`flex-shrink-0 border-t border-slate-100 p-3 space-y-2`}>
            <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
              {/* Avatar with gradient initial */}
              <div className="relative flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shadow-md text-white text-xs font-bold">
                {session.user.name?.charAt(0)}
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
              </div>

              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-xs font-semibold text-slate-900 truncate">{session.user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{session.user.role} · {session.user.state}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {sidebarOpen && (
              <motion.button
                whileHover={{ x: 2 }}
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </motion.button>
            )}
          </div>
        )}
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            {activeTab === 'neural' && (
              <MemoizedNeuralTab
                globalPatients={memoizedPatients}
                isLoading={isLoading}
                onNavigateToPipeline={() => handleTabChange('command')}
                filter={activeFilter}
                onSetFilter={handleSetFilter}
              />
            )}
            {activeTab === 'command' && (
              <MemoizedCommandTab globalPatients={memoizedPatients} isLoading={isLoading} filter={activeFilter} />
            )}
            {activeTab === 'duplicates' && (
              <MemoizedDuplicatesTab globalPatients={memoizedPatients} />
            )}
            {activeTab === 'gis' && (
              <MemoizedGISTab globalPatients={memoizedPatients} />
            )}
            {activeTab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
