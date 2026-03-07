'use client';

import { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, Users, Map, Settings, Menu, GitBranch, Copy, LogOut } from 'lucide-react';

// Dynamic imports for heavy components
const CommandCenter = lazy(() => import('@/components/CommandCenter'));
const KanbanDashboard = lazy(() => import('@/components/KanbanDashboard'));
const DataTable = lazy(() => import('@/components/DataTable').then(module => ({ default: module.DataTable })));
const RealTimeStats = lazy(() => import('@/components/ScreenedMetric'));

const LoadingSpinner = () => (
  <div className="h-full flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

const OverviewTab = () => (
  <div className="h-full overflow-auto bg-slate-50">
    <div className="p-6 space-y-6">
      <Suspense fallback={<LoadingSpinner />}>
        <RealTimeStats />
        <DataTable />
      </Suspense>
    </div>
  </div>
);

const DuplicatesTab = () => (
  <div className="h-full overflow-auto bg-slate-50">
    <div className="p-6">
      <Suspense fallback={<LoadingSpinner />}>
        <DataTable showDuplicates={true} />
      </Suspense>
    </div>
  </div>
);

const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="h-full flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Settings className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500">This feature is coming soon</p>
    </div>
  </div>
);

const tabs = [
  { id: 'command', icon: GitBranch, label: 'Follow-up Pipeline', component: () => <Suspense fallback={<LoadingSpinner />}><CommandCenter /></Suspense> },
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', component: OverviewTab },
  { id: 'duplicates', icon: Copy, label: 'Duplicates', component: DuplicatesTab },
  { id: 'network', icon: GitBranch, label: 'Network Map', component: () => <PlaceholderTab title="Network Map" /> },
  { id: 'gis', icon: Map, label: 'GIS Map', component: () => <PlaceholderTab title="GIS Mapping" /> },
  { id: 'settings', icon: Settings, label: 'Settings', component: () => <PlaceholderTab title="Settings" /> }
];

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('command');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || (() => <Suspense fallback={<LoadingSpinner />}><CommandCenter /></Suspense>);

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
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((item, idx) => (
            <motion.button 
              key={item.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </motion.button>
          ))}
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
              onClick={() => signOut({ callbackUrl: '/login' })}
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
            onClick={() => setSidebarOpen(true)}
            className="absolute top-8 left-4 z-10 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        )}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <ActiveComponent />
        </motion.div>
      </main>
    </div>
  );
}