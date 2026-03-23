import { useState, useMemo, useCallback } from 'react';
import { Brain, LayoutGrid, ListFilter, Activity, FileText, AlertTriangle } from 'lucide-react';
import { useEntityStore } from '@/stores/useEntityStore';
import { PatientTile } from '@/components/PatientTile';
import { NexusPatientRow } from '@/components/NexusPatientRow';
import { SuggestionRail } from '@/components/SuggestionRail';
import { NexusViewerModal } from '@/components/NexusViewerModal';
import { cn } from '@/lib/utils';
import type { NexusFilters } from '@/app/dashboard/neural-nexus/page';

interface NeuralNexusGridProps {
  globalPatients: any[];
  isLoading: boolean;
  filters: NexusFilters;
  orphanedFiles: any[];
  isLoadingOrphans: boolean;
}

export default function NeuralNexusGrid({ globalPatients, isLoading, filters, orphanedFiles, isLoadingOrphans }: NeuralNexusGridProps) {
  const { setSelectedPatient, setNeuralNexusViewerOpen, neuralNexusViewerOpen } = useEntityStore();
  const [displayCount, setDisplayCount] = useState(15);
  const [viewMode, setViewMode] = useState<'overview' | 'triage'>('triage');

  // SMART CONTENT ROUTING: Global filter for valid medical content
  const isValidMedicalPatient = useCallback((p: any) => {
    // Only show patients that have a valid link_status or are high risk
    // or have at least one valid medical file (dcm, pdf, jpg)
    return p.link_status === 'LINKED' || (p.genki_score ?? 0) > 0.5;
  }, []);

  const filteredPatients = useMemo(() => {
    let result = globalPatients.filter(isValidMedicalPatient);

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.inmate_name?.toLowerCase().includes(query) ||
        p.unique_id?.toLowerCase().includes(query)
      );
    }

    if (filters.filterRisk === 'high') result = result.filter(p => (p.genki_score ?? 0) > 0.8);
    else if (filters.filterRisk === 'normal') result = result.filter(p => (p.genki_score ?? 0) <= 0.8);

    if (filters.filterStatus === 'linked') result = result.filter(p => p.link_status === 'LINKED');
    else if (filters.filterStatus === 'unlinked') result = result.filter(p => p.link_status !== 'LINKED');

    // Date range filter on screening_date
    if (filters.dateRange !== 'all') {
      if (filters.dateRange === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        result = result.filter(p => p.screening_date?.startsWith(todayStr));
      } else if (filters.dateRange === 'custom') {
        if (filters.dateFrom) {
          result = result.filter(p => p.screening_date && p.screening_date >= filters.dateFrom);
        }
        if (filters.dateTo) {
          result = result.filter(p => p.screening_date && p.screening_date <= filters.dateTo);
        }
      } else {
        const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90;
        const cutoff = Date.now() - days * 86_400_000;
        result = result.filter(p => p.screening_date && new Date(p.screening_date).getTime() >= cutoff);
      }
    }

    // District filter
    if (filters.district) {
      result = result.filter(p => p.screening_district === filters.district);
    }

    if (filters.filterType !== 'All') {
      const type = filters.filterType.toLowerCase();
      // Filter based on whether the patient has any files of this type
      // or if their linked studies match this type.
      // Since globalPatients data structure might vary, we check a few common fields.
      result = result.filter(p => 
        p.files?.some((f: any) => f.type?.toLowerCase() === type) ||
        p.type?.toLowerCase() === type
      );
    }

    return [...result].sort((a, b) => {
      if (filters.sortBy === 'genki_desc') return (b.genki_score ?? 0) - (a.genki_score ?? 0);
      if (filters.sortBy === 'genki_asc') return (a.genki_score ?? 0) - (b.genki_score ?? 0);
      if (filters.sortBy === 'name_asc') return (a.inmate_name ?? '').localeCompare(b.inmate_name ?? '');
      if (filters.sortBy === 'name_desc') return (b.inmate_name ?? '').localeCompare(a.inmate_name ?? '');
      return 0;
    });
  }, [globalPatients, filters]);

  const displayedPatients = useMemo(() =>
    filteredPatients.slice(0, displayCount),
    [filteredPatients, displayCount]
  );



  const handlePatientClick = useCallback((patient: any) => {
    setSelectedPatient(patient);
    setNeuralNexusViewerOpen(true);
  }, [setSelectedPatient, setNeuralNexusViewerOpen]);

  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + 9, filteredPatients.length));
  }, [filteredPatients.length]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600 font-bold">Loading Neural Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-y-auto">
      <div className={cn(
        "transition-all duration-500 ease-in-out p-8",
        neuralNexusViewerOpen ? "pb-8" : "pb-32"
      )}>

      {/* View Mode Toggle & Stats */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="flex bg-white/50 backdrop-blur-xl border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                viewMode === 'overview' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setViewMode('triage')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                viewMode === 'triage' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <ListFilter className="w-4 h-4" />
              Triage Command
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
               <Activity className="w-3.5 h-3.5 text-blue-600" />
               <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                 {filteredPatients.length} Active Candidates
               </span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
               <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
               <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                 {filteredPatients.filter(p => (p.genki_score ?? 0) > 0.8).length} Critical
               </span>
             </div>
          </div>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <div className={cn(
          "grid gap-8 transition-all duration-500",
          neuralNexusViewerOpen
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {displayedPatients.map((patient: any) => (
            <PatientTile
              key={patient.id}
              patient={patient}
              onClick={() => handlePatientClick(patient)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50">
           <div className="grid grid-cols-[1fr_100px_150px_120px_100px] gap-4 px-8 py-4 bg-slate-50 border-b border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Identity</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk Index</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Symptoms</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Scan</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</span>
           </div>
           <div className="divide-y divide-slate-100">
              {displayedPatients.map((patient: any) => (
                <NexusPatientRow
                  key={patient.id}
                  patient={patient}
                  onClick={() => handlePatientClick(patient)}
                />
              ))}
           </div>
        </div>
      )}

      {/* Load More */}
      {displayCount < filteredPatients.length && (
        <div className="flex justify-center mt-12">
          <button
            onClick={handleLoadMore}
            className="px-8 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold rounded-2xl shadow-2xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
          >
            Load More ({filteredPatients.length - displayCount} remaining)
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Brain className="w-24 h-24 text-slate-300 mb-4" />
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No patients found</h3>
          <p className="text-slate-500">Try adjusting your search query</p>
        </div>
      )}

      {/* SuggestionRail - hide when viewer is open */}
      {!neuralNexusViewerOpen && (
        <SuggestionRail
          orphanedFiles={orphanedFiles}
          isLoading={isLoadingOrphans}
        />
      )}
      
      <NexusViewerModal />
      </div>
    </div>
  );
}
