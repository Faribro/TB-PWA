'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import KanbanDashboard from '@/components/KanbanDashboard';
import { DataTable } from '@/components/DataTable';
import RealTimeStats from '@/components/ScreenedMetric';
import { LayoutDashboard, Users, Map, Settings, Menu, GitBranch, Copy } from 'lucide-react';

const OverviewTab = () => (
  <div className="h-full overflow-auto">
    <div className="p-6 space-y-6">
      <RealTimeStats />
      <DataTable />
    </div>
  </div>
);

const DuplicatesTab = () => (
  <div className="h-full overflow-auto">
    <div className="p-6">
      <DataTable showDuplicates={true} />
    </div>
  </div>
);

const PatientsTab = () => (
  <div className="h-full overflow-auto">
    <div className="p-6">
      <DataTable />
    </div>
  </div>
);

const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Settings className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">This feature is coming soon</p>
    </div>
  </div>
);

const tabs = [
  { id: 'pipeline', icon: LayoutDashboard, label: 'Follow-up Pipeline', component: KanbanDashboard },
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', component: OverviewTab },
  { id: 'patients', icon: Users, label: 'Patient Registry', component: PatientsTab },
  { id: 'duplicates', icon: Copy, label: 'Duplicates', component: DuplicatesTab },
  { id: 'network', icon: GitBranch, label: 'Network Map', component: () => <PlaceholderTab title="Network Map" /> },
  { id: 'gis', icon: Map, label: 'GIS Map', component: () => <PlaceholderTab title="GIS Mapping" /> },
  { id: 'settings', icon: Settings, label: 'Settings', component: () => <PlaceholderTab title="Settings" /> }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || KanbanDashboard;

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 overflow-hidden">
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 border-r border-gray-200/50 bg-white/70 backdrop-blur-md flex flex-col shadow-lg"
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200/50">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
          >
            TB Command
          </motion.h1>
          <Menu className="h-5 w-5 text-gray-400" />
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
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-200 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </motion.button>
          ))}
        </nav>
      </motion.aside>

      <main className="flex-1 overflow-hidden">
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
