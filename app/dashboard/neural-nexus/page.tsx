'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { Brain, GitMerge, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedFilterBar } from '@/components/AdvancedFilterBar';
import NeuralNexusGrid from '@/components/NeuralNexusGrid';
import ReconciliationQueue from '@/components/ReconciliationQueue';
import dynamic from 'next/dynamic';

const SupervisorInbox = dynamic(() => import('@/components/SupervisorInbox'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>,
});

export type NexusTab = 'diagnostics' | 'reconciliation' | 'supervisor';

export interface NexusFilters {
  searchQuery: string;
  filterRisk: 'All' | 'high' | 'normal';
  filterStatus: 'All' | 'linked' | 'unlinked';
  filterType: 'All' | 'dcm' | 'pdf' | 'jpg';
  sortBy: 'genki_desc' | 'genki_asc' | 'name_asc' | 'name_desc';
  dateRange: 'today' | '7d' | '30d' | '90d' | 'custom' | 'all';
  dateFrom: string; // ISO date string, used when dateRange === 'custom'
  dateTo: string;   // ISO date string, used when dateRange === 'custom'
  district: string; // '' = All
}

export default function NeuralNexusPage() {
  const { data: globalPatients = [], isLoading } = useSWRAllPatients();
  const [activeTab, setActiveTab] = useState<NexusTab>('diagnostics');
  const [filters, setFilters] = useState<NexusFilters>({
    searchQuery: '',
    filterRisk: 'All',
    filterStatus: 'All',
    filterType: 'All',
    sortBy: 'genki_desc',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
    district: '',
  });

  // Derive unique districts from loaded patients
  const districts = useMemo(
    () => [...new Set(globalPatients.map((p: any) => p.screening_district).filter(Boolean))].sort() as string[],
    [globalPatients]
  );
  const [orphanedFiles, setOrphanedFiles] = useState<any[]>([]);
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(true);

  useEffect(() => {
    async function pollOrphans() {
      try {
        // Calls our server-side proxy — MED_BACKEND_SECRET never touches the client
        const res = await fetch('/api/orphans', {
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setOrphanedFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[NexusDashboard] orphan poll failed:', err);
      } finally {
        setIsLoadingOrphans(false);
      }
    }

    pollOrphans();
    const intervalId = setInterval(pollOrphans, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const updateFilters = useCallback((partial: Partial<NexusFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Vertex White Background Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/8 blur-[180px] rounded-full -z-10" />
      <div className="absolute bottom-[5%] right-[0%] w-[50%] h-[50%] bg-indigo-400/8 blur-[180px] rounded-full -z-10" />

      <header className="flex-shrink-0 p-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Neural Nexus RIS</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Radiological Intelligence System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'diagnostics'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <Brain className="w-4 h-4" />
              Active Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'reconciliation'
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <GitMerge className="w-4 h-4" />
              Reconciliation Queue
              {orphanedFiles.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                  {orphanedFiles.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('supervisor')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'supervisor'
                  ? "bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Supervisor Mode
            </button>
          </div>
        </div>

        {activeTab === 'diagnostics' && (
          <AdvancedFilterBar
            filters={filters}
            onFiltersChange={updateFilters}
            patientCount={globalPatients.length}
            districts={districts}
          />
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'diagnostics' ? (
          <NeuralNexusGrid
            globalPatients={globalPatients}
            isLoading={isLoading}
            filters={filters}
            orphanedFiles={orphanedFiles}
            isLoadingOrphans={isLoadingOrphans}
          />
        ) : activeTab === 'reconciliation' ? (
          <ReconciliationQueue
            orphanedFiles={orphanedFiles}
            isLoading={isLoadingOrphans}
            patients={globalPatients}
          />
        ) : (
          <SupervisorInbox patients={globalPatients} />
        )}
      </div>
    </div>
  );
}
