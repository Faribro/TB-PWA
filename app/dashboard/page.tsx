'use client';

import { useState, Suspense, lazy, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { Map, Settings, Menu, GitBranch, Copy, LogOut, Network } from 'lucide-react';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';

// Aggressive dynamic imports with optimized loading
const CommandCenter = lazy(() => 
  import('@/components/CommandCenter').then(module => ({ 
    default: memo(module.default) 
  }))
);
const NeuralDashboard = lazy(() => 
  import('./neural-dashboard-view').then(module => ({ 
    default: memo(module.default) 
  }))
);
const SpatialIntelligenceMap = lazy(() => 
  import('@/components/SpatialIntelligenceMap').then(module => ({ 
    default: memo(module.default) 
  }))
);
const MandEHub = lazy(() => 
  import('@/components/MandEHub').then(module => ({ 
    default: memo(module.default) 
  }))
);

const LoadingSpinner = memo(() => (
  <div className="h-full flex items-center justify-center">
    <LinesAndDotsLoader progress={75} />
  </div>
));

const PlaceholderTab = memo(({ title }: { title: string }) => (
  <div className="h-full flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Settings className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500">This feature is coming soon</p>
    </div>
  </div>
));

// Memoized tab components with data passing
const MemoizedNeuralTab = memo(({ globalPatients, isLoading }: { globalPatients: any[], isLoading: boolean }) => (
  <DashboardErrorBoundary componentName="Vertex (Neural Dashboard)">
    <Suspense fallback={<LoadingSpinner />}>
      <NeuralDashboard globalPatients={globalPatients ?? []} isLoading={isLoading} />
    </Suspense>
  </DashboardErrorBoundary>
));

const MemoizedCommandTab = memo(({ globalPatients, isLoading }: { globalPatients: any[], isLoading: boolean }) => (
  <DashboardErrorBoundary componentName="Follow-up Pipeline">
    <Suspense fallback={<LoadingSpinner />}>
      <CommandCenter globalPatients={globalPatients ?? []} isLoading={isLoading} />
    </Suspense>
  </DashboardErrorBoundary>
));

const MemoizedDuplicatesTab = memo(({ globalPatients, isLoading }: { globalPatients: any[], isLoading: boolean }) => (
  <DashboardErrorBoundary componentName="M&E Tools">
    <div className="h-full overflow-auto">
      <Suspense fallback={<LoadingSpinner />}>
        <MandEHub globalPatients={globalPatients ?? []} isLoading={isLoading} />
      </Suspense>
    </div>
  </DashboardErrorBoundary>
));

const MemoizedGISTab = memo(({ globalPatients, isLoading }: { globalPatients: any[], isLoading: boolean }) => (
  <DashboardErrorBoundary componentName="GIS Map">
    <Suspense fallback={<LoadingSpinner />}>
      <SpatialIntelligenceMap globalPatients={globalPatients ?? []} isLoading={isLoading} />
    </Suspense>
  </DashboardErrorBoundary>
));

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('neural');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Lift globalPatients to top level and memoize
  const { data: globalPatients = [], isLoading, error } = useSWRAllPatients();
  const memoizedPatients = useMemo(() => globalPatients ?? [], [globalPatients]);
  
  // DEBUG: Console logging for SWR state
  console.log('Dashboard SWR State:', { length: globalPatients?.length, isLoading, error });
  
  // Memoized handlers
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);
  
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);
  
  // Show loading only on initial load
  if (isLoading && (!globalPatients || globalPatients.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LinesAndDotsLoader progress={75} />
      </div>
    );
  }

  // Show error state if fetch failed
  if (error && (!globalPatients || globalPatients.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="text-red-600 text-lg font-bold mb-2">Failed to load patients</div>
          <div className="text-slate-600 text-sm">{error?.message || 'Unknown error'}</div>
        </div>
      </div>
    );
  }

  const tabConfig = [
    { id: 'neural', icon: Network, label: 'Vertex' },
    { id: 'command', icon: GitBranch, label: 'Follow-up Pipeline' },
    { id: 'duplicates', icon: Copy, label: 'M&E Tools' },
    { id: 'gis', icon: Map, label: 'GIS Map' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: sidebarOpen ? 0 : -256, opacity: sidebarOpen ? 1 : 0 }}
        className={`${sidebarOpen ? 'w-64' : 'w-0'} border-r border-slate-200 bg-white/80 backdrop-blur-md flex flex-col shadow-sm transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-3"
          >
            <img 
              src="/Images/Logo/AllianceIndia-Logo.png"
              alt="AllianceIndia Logo" 
              className="h-24 w-auto max-w-full"
              loading="lazy"
            />
          </motion.div>
          <button 
            onClick={handleSidebarToggle}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabConfig.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button 
                key={item.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {session && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">
                  {session.user.name?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {session.user.role} • {session.user.state}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </motion.aside>

      <main className={`flex-1 overflow-hidden transition-all duration-300 ${!sidebarOpen ? 'ml-0' : ''}`}>
        {!sidebarOpen && (
          <button 
            onClick={handleSidebarToggle}
            className="absolute top-8 left-4 z-10 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        )}
        <div className="h-full" style={{ willChange: 'auto' }}>
          {activeTab === 'neural' && <MemoizedNeuralTab globalPatients={memoizedPatients} isLoading={isLoading} />}
          {activeTab === 'command' && <MemoizedCommandTab globalPatients={memoizedPatients} isLoading={isLoading} />}
          {activeTab === 'duplicates' && <MemoizedDuplicatesTab globalPatients={memoizedPatients} isLoading={isLoading} />}
          {activeTab === 'gis' && <MemoizedGISTab globalPatients={memoizedPatients} isLoading={isLoading} />}
          {activeTab === 'settings' && <PlaceholderTab title="Settings" />}
        </div>
      </main>
    </div>
  );
}
