'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope, isSuperuser } from '@/hooks/useSessionScope';
import { useEntityStore } from '@/stores/useEntityStore';
import { DEFAULT_FILTERS } from '@/components/VertexFilterBar';
import type { VertexFilters } from '@/components/VertexFilterBar';
import { ScreeningCalendar } from '@/components/ScreeningCalendar';
import { exportPatientsToXLSX } from '@/lib/export-xlsx';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRealtimeCalendar } from '@/lib/useRealtimeCalendar';

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

const NeuralDashboard = dynamic(() => import('@/app/dashboard/neural-dashboard-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function VertexPage() {
  const scope = useSessionScope();

  // Task 3: Hard block — never render or query until scope is resolved.
  // This prevents a PM from briefly seeing 0 patients before filters apply.
  if (scope === null) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="flex-1 flex gap-6 p-8">
          <div className="w-1/2 flex flex-col gap-6">
            <div className="h-[400px] bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
            <div className="flex-1 bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
          </div>
          <div className="w-1/2 bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
        </div>
        <div className="h-[100px] shrink-0 bg-white border-t border-slate-200 flex items-center justify-between px-8 z-50">
          <div className="w-56 h-12 bg-slate-100 animate-pulse rounded-full" />
          <div className="flex gap-16">
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return <VertexContent scope={scope} />;
}

// Separated so the scope is guaranteed non-null inside this component
function VertexContent({ scope }: { scope: NonNullable<ReturnType<typeof useSessionScope>> }) {
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4);
  const [newDataToast, setNewDataToast] = useState(false);
  const [updatedCalendarDates, setUpdatedCalendarDates] = useState<Set<string>>(new Set());
  const [countPulse, setCountPulse] = useState(false);
  const national = isSuperuser(scope);
  const setFilter = useEntityStore(s => s.setGlobalFilter);

  // State/district filters for query
  const [filters, setFilters] = useState<VertexFilters>(DEFAULT_FILTERS);
  const selectedState = filters.state;
  const selectedDistrict = filters.district;

  // Fetch summary metrics (server-computed aggregates)
  const { data: summaryData, error: summaryError } = useSWR(
    scope ? `/api/patients/summary?state=${selectedState || 'all'}&district=${selectedDistrict || 'all'}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min cache
    }
  );

  // Memoize filters object to prevent SWR key changes
  const stableFilters = useMemo(() => ({
    state: selectedState,
    district: selectedDistrict,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: filters.search
  }), [selectedState, selectedDistrict, filters.dateFrom, filters.dateTo, filters.search]);

  // Fetch patients with progressive loading
  const { 
    patients: globalPatients, 
    meta, 
    total, 
    isLoading: isLoadingPatients,
    isLoadingMore,
    loadedCount,
    totalCount,
    progress,
    error: patientsError,
    mutate: mutatePatients,
    setTotalCount
  } = useSWRAllPatients(scope, {
    limit: 500, // Fixed safe page size
    progressive: true, // Enable progressive loading
    maxPages: 100, // Safety: max 100 pages
    maxRecords: 500000, // Safety: max 500k records
    timeout: 120000, // Safety: 120s timeout
    filters: stableFilters
  });
  
  // Real-time subscription for new Kobo submissions (deferred to avoid blocking initial load)
  useEffect(() => {
    if (!scope) return;
    
    // Only set up subscription after initial data is loaded
    if (isLoadingPatients) return;
    
    const supabase = getSupabaseBrowserClient();
    
    console.log('[Vertex] Setting up real-time subscription for new patients');
    
    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patients'
        },
        (payload) => {
          console.log('[Vertex] New patient inserted:', payload.new);
          
          // Play calm water drop sound
          sounds.waterDrop();
          
          // Show toast notification
          setNewDataToast(true);
          setTimeout(() => setNewDataToast(false), 3000);
          
          // Trigger cache invalidation on server
          fetch('/api/cache/invalidate', { method: 'POST' }).catch(console.error);
          
          // Optimistic update: prepend new patient to existing data
          mutatePatients((currentData) => {
            if (!currentData || !currentData.data) return currentData;
            
            // Prepend new patient to the beginning of array
            const newData = {
              ...currentData,
              data: [payload.new, ...currentData.data],
              meta: {
                ...currentData.meta,
                returned: currentData.data.length + 1
              }
            };
            
            // Trigger count pulse animation
            setCountPulse(true);
            setTimeout(() => setCountPulse(false), 500);
            
            return newData;
          }, false); // Don't revalidate - just update cache
          
          // Revalidate summary and calendar metrics immediately
          mutate('/api/patients/summary');
          mutate((key) => typeof key === 'string' && key.startsWith('/api/vertex/metrics'));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients'
        },
        (payload) => {
          console.log('[Vertex] Patient updated:', payload.new);
          
          // Revalidate metrics on UPDATE as well
          mutate('/api/patients/summary');
          mutate((key) => typeof key === 'string' && key.startsWith('/api/vertex/metrics'));
        }
      )
      .subscribe();
    
    return () => {
      console.log('[Vertex] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [scope, isLoadingPatients, mutatePatients]);
  
  // Sync total count from summary to hook (guarded to prevent loops)
  const prevTotalRef = useRef<number>(0);
  useEffect(() => {
    if (summaryData?.total && summaryData.total !== prevTotalRef.current) {
      prevTotalRef.current = summaryData.total;
      setTotalCount(summaryData.total);
    }
  }, [summaryData?.total, setTotalCount]);
  
  // SOURCE A: Calendar data with LIVE websocket updates
  const {
    data: calendarData,
    error: yearMetricsError,
    isLoading: isLoadingYearMetrics,
    status: realtimeStatus
  } = useRealtimeCalendar({
    year: currentYear,
    state: selectedState,
    district: selectedDistrict,
    onUpdate: (date) => {
      // Play sound notification
      sounds.newSubmission();
      // Trigger count pulse animation
      setCountPulse(true);
      setTimeout(() => setCountPulse(false), 500);
      // Add date to updated set
      setUpdatedCalendarDates(prev => new Set([...prev, date]));
      // Clear after animation completes (2 seconds)
      setTimeout(() => {
        setUpdatedCalendarDates(prev => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
      }, 2000);
    }
  });

  // Separate call for selected month totals panel
  const { 
    data: monthMetrics, 
    error: monthMetricsError,
    isLoading: isLoadingMonthMetrics,
    mutate: mutateMonthMetrics
  } = useSWR(
    `/api/vertex/metrics?year=${currentYear}&month=${currentMonth}&view=month&state=${selectedState || 'all'}&district=${selectedDistrict || 'all'}`,
    fetcher,
    {
      dedupingInterval: 0, // Allow immediate refetch
      revalidateOnFocus: false,
      refreshInterval: 0, // Disable polling - rely on realtime
    }
  );
  
  // Combined loading state for metrics
  const isLoadingMetrics = isLoadingYearMetrics || isLoadingMonthMetrics;
  const metricsError = yearMetricsError || monthMetricsError;

  // Loading skeleton component for metrics
  const MetricsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="h-4 w-20 bg-slate-200 animate-pulse rounded mb-2" />
          <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );

  // Error display component
  const MetricsError = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p className="text-red-700 text-sm">Unable to load metrics. Retrying...</p>
      <button 
        onClick={onRetry}
        className="mt-2 text-xs text-red-600 underline hover:text-red-800"
      >
        Retry Now
      </button>
    </div>
  );

  const canExport = ['Program Manager', 'admin', 'State Program Manager', 'M&E Officer'].includes(scope.role ?? '');
  
  const activeFilterCount = [
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.state,
    filters.district,
    filters.facilityType,
    filters.suspected !== 'all' ? '1' : '',
    filters.tbDiagnosed !== 'all' ? '1' : '',
    filters.treatmentStatus !== 'all' ? '1' : '',
  ].filter(Boolean).length;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredPatients = useMemo(() => {
    console.log('[Vertex] Filtering patients:', {
      totalPatients: globalPatients.length,
      filters,
      selectedCalendarDate
    });
    
    return globalPatients.filter(p => {
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = [
          p.inmate_name,
          p.serial_no,
          p.facility_name,
          p.staff_name
        ].some(v => v?.toLowerCase().includes(q));
        if (!match) {
          console.log('[Vertex] Filtered out by search:', p.inmate_name);
          return false;
        }
      }
      
      // Date range filters
      if (filters.dateFrom && p.screening_date && p.screening_date < filters.dateFrom) {
        console.log('[Vertex] Filtered out by dateFrom:', p.inmate_name, p.screening_date);
        return false;
      }
      if (filters.dateTo && p.screening_date && p.screening_date > filters.dateTo) {
        console.log('[Vertex] Filtered out by dateTo:', p.inmate_name, p.screening_date);
        return false;
      }
      
      // State/District filters - REMOVED (already filtered by API)
      // The API already filters by state/district via stableFilters
      // No need to filter again on client side
      
      // Facility type filter
      if (filters.facilityType && p.facility_type !== filters.facilityType) {
        console.log('[Vertex] Filtered out by facilityType:', p.inmate_name, p.facility_type);
        return false;
      }
      
      // X-Ray Result filter (suspected field maps to xray_result)
      if (filters.suspected !== 'all') {
        const xrayResult = p.xray_result || p.chest_x_ray_result;
        if (xrayResult !== filters.suspected) {
          console.log('[Vertex] Filtered out by xray:', p.inmate_name, xrayResult);
          return false;
        }
      }
      
      // TB Diagnosed filter
      if (filters.tbDiagnosed !== 'all' && p.tb_diagnosed !== filters.tbDiagnosed) {
        console.log('[Vertex] Filtered out by tbDiagnosed:', p.inmate_name, p.tb_diagnosed);
        return false;
      }
      
      // Treatment status filter
      if (filters.treatmentStatus !== 'all' && p.treatment_status !== filters.treatmentStatus) {
        console.log('[Vertex] Filtered out by treatmentStatus:', p.inmate_name, p.treatment_status);
        return false;
      }
      
      // Calendar date filter
      if (selectedCalendarDate && p.screening_date !== selectedCalendarDate) {
        console.log('[Vertex] Filtered out by calendar date:', p.inmate_name, p.screening_date);
        return false;
      }
      
      return true;
    });
  }, [globalPatients, filters, selectedCalendarDate]);

  // Calendar data comes directly from useRealtimeCalendar hook (no memoization needed)

  // Monthly overview panel uses filteredPatients for accurate counts
  const monthlyStats = useMemo(() => {
    // Calculate stats from filtered patients
    const screened = filteredPatients.length;
    const suspected = filteredPatients.filter(p => 
      (p.xray_result || p.chest_x_ray_result) === 'Suspected TB Case'
    ).length;
    const diagnosed = filteredPatients.filter(p => 
      p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes'
    ).length;
    const attStarted = filteredPatients.filter(p => 
      p.att_start_date
    ).length;
    const referred = filteredPatients.filter(p => 
      p.referral_date
    ).length;
    
    return {
      screened,
      suspected,
      diagnosed,
      attStarted,
      referred,
    };
  }, [filteredPatients]);

  // Month navigation - update currentMonth and currentYear
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleExport = useCallback(async () => {
    if (isExporting || filteredPatients.length === 0) return;
    setIsExporting(true);
    sounds.download();
    try {
      exportPatientsToXLSX(
        filteredPatients as unknown as Record<string, unknown>[],
        `samadhaan-vertex-${filters.state || 'all'}`
      );
    } finally {
      setIsExporting(false);
    }
  }, [filteredPatients, filters.state, isExporting]);

  const handleDayClick = useCallback((date: string) => {
    if (selectedCalendarDate === date) {
      setSelectedCalendarDate(null);
    } else {
      sounds.calendarClick();
      setSelectedCalendarDate(date);
    }
    setView('table');
  }, [selectedCalendarDate]);



  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* New data toast notification */}
      <AnimatePresence>
        {newDataToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">New patient data received</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Single compact header */}
      <div className="flex-shrink-0 sticky top-0 z-20 bg-[#f9f8f5]/95
                      backdrop-blur-sm border-b border-black/[0.06]">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 min-h-12">
          
          {/* Search */}
          <div className="relative w-52 max-w-full">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                         text-[#bab9b4] pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient, serial, facility..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-7 pr-2 py-1.5 bg-white border border-black/[0.08]
                         rounded-md text-xs text-[#28251d] placeholder:text-[#bab9b4]
                         focus:outline-none focus:border-[#01696f] focus:ring-1
                         focus:ring-[#cedcd8] transition-all"
            />
          </div>

          {/* Date range */}
          <input type="date" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="px-2 py-1.5 bg-white border border-black/[0.08] rounded-md
                       text-xs text-[#28251d] focus:outline-none focus:border-[#01696f]
                       focus:ring-1 focus:ring-[#cedcd8] transition-all w-32 max-w-full" />
          <span className="text-xs text-[#bab9b4]">—</span>
          <input type="date" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="px-2 py-1.5 bg-white border border-black/[0.08] rounded-md
                       text-xs text-[#28251d] focus:outline-none focus:border-[#01696f]
                       focus:ring-1 focus:ring-[#cedcd8] transition-all w-32 max-w-full" />

          {/* Quick date shortcuts */}
          <div className="flex gap-1">
            {[{ l: '7D', d: 7 }, { l: '30D', d: 30 }, { l: '90D', d: 90 }].map(
              ({ l, d }) => {
                const to = new Date().toISOString().split('T')[0]
                const from = new Date(Date.now() - d * 86400000).toISOString().split('T')[0]
                const active = filters.dateFrom === from && filters.dateTo === to
                return (
                  <button key={l}
                    onClick={() => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      active
                        ? 'bg-[#01696f] text-white'
                        : 'bg-[#f3f0ec] text-[#7a7974] hover:bg-[#e6e4df]'
                    )}
                  >
                    {l}
                  </button>
                )
              }
            )}
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersExpanded(e => !e)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium',
              'transition-colors border',
              filtersExpanded
                ? 'bg-[#cedcd8]/60 text-[#01696f] border-[#01696f]/20'
                : 'bg-white text-[#7a7974] border-black/[0.08] hover:bg-[#f3f0ec]'
            )}
          >
            <Filter size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-[#01696f] text-white
                              text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="text-xs text-[#7a7974] hover:text-[#28251d] transition-colors
                         flex items-center gap-0.5">
              <X size={10} />
              Clear
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-[24px]" />

          {/* Record count with live progress */}
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="text-xs text-[#7a7974] tabular-nums whitespace-nowrap"
              animate={countPulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <span className="font-semibold text-[#28251d]">
                {filteredPatients.length.toLocaleString()}
              </span>
              {' / '}
              <span className="font-semibold text-[#28251d]">
                {totalCount > 0 ? totalCount.toLocaleString() : summaryData?.total?.toLocaleString() || '...'}
              </span>
            </motion.span>
            
            {/* Live indicator - always spinning */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <svg 
                className="w-3 h-3 text-emerald-600 animate-spin" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Live
              </span>
            </div>
            
            {/* Live progress indicator (only during background loading) */}
            {isLoadingMore && (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-blue-600 font-medium">
                  {progress}%
                </span>
              </div>
            )}
          </div>

          {/* Thin divider */}
          <div className="w-px h-5 bg-black/[0.08]" />

          {/* View toggle */}
          <div className="flex rounded-md border border-black/[0.08] overflow-hidden">
            <button
              onClick={() => { sounds.toggle(); setView('table'); }}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                view === 'table'
                  ? 'bg-[#01696f] text-white'
                  : 'bg-white text-[#7a7974] hover:bg-[#f3f0ec]'
              )}
            >
              ⊞ Table
            </button>
            <button
              onClick={() => { sounds.toggle(); setView('calendar'); }}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                view === 'calendar'
                  ? 'bg-[#01696f] text-white'
                  : 'bg-white text-[#7a7974] hover:bg-[#f3f0ec]'
              )}
            >
              📅 Calendar
            </button>
          </div>

          {/* Export XLSX */}
          {canExport && (
            <button
              onClick={handleExport}
              disabled={isExporting || filteredPatients.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#437a22] text-white
                         rounded-md text-xs font-medium hover:bg-[#2e5c10]
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span className="w-3 h-3 border border-white/30 border-t-white
                                rounded-full animate-spin" />
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              Export XLSX
            </button>
          )}

        </div>

        {/* Expandable secondary filters */}
        <AnimatePresence>
          {filtersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2
                             border-t border-black/[0.04]">
                {[
                  { label: 'State', key: 'state' as const, options: ['', 'Maharashtra', 'Madhya Pradesh', 'Rajasthan', 'Uttar Pradesh', 'Gujarat'] },
                  { label: 'District', key: 'district' as const, options: ['', 'Mumbai', 'Dewas', 'Jaipur', 'Lucknow'] },
                  { label: 'Facility', key: 'facilityType' as const, options: ['', 'CHC', 'PHC', 'Prison', 'DH', 'DRTB Centre'] },
                  { label: 'X-Ray Result', key: 'suspected' as const, options: ['all', 'Suspected TB Case', 'Normal', 'Other Abnormality'] },
                  { label: 'TB Status', key: 'tbDiagnosed' as const, options: ['all', 'Yes', 'No', 'Pending'] },
                  { label: 'Treatment', key: 'treatmentStatus' as const, options: ['all', 'Ongoing', 'Completed', 'Defaulted', 'Died', 'Not Started'] },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium text-[#7a7974] mb-1">
                      {label}
                    </label>
                    <select
                      value={filters[key]}
                      onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white border border-black/[0.08]
                                 rounded-md text-xs text-[#28251d] focus:outline-none
                                 focus:border-[#01696f] transition-all"
                    >
                      {options.map(o => (
                        <option key={o} value={o}>{o || `All ${label}s`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected day banner */}
      {selectedCalendarDate && (
        <div className="flex-shrink-0 flex items-center justify-between
                        px-6 py-2 bg-[#cedcd8]/40 border-b border-[#01696f]/10">
          <span className="text-sm text-[#01696f]">
            Showing records for{' '}
            <strong>{new Date(selectedCalendarDate + 'T00:00:00')
              .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            }</strong>
          </span>
          <button
            onClick={() => setSelectedCalendarDate(null)}
            className="text-xs text-[#01696f] underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'calendar' ? (
          <>
            {/* Monthly Overview Panel - now uses filtered data */}
            {monthlyStats ? (
              <div className="bg-slate-900 text-white rounded-lg p-4 mb-4 mx-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-slate-300">MONTHLY OVERVIEW</h3>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {(monthlyStats.screened || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mb-4">PATIENTS SCREENED</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="border-r border-slate-700">
                    <div className="text-lg font-semibold">{(monthlyStats.suspected || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">SUSPECTED</div>
                  </div>
                  <div className="border-r border-slate-700">
                    <div className="text-lg font-semibold">{(monthlyStats.diagnosed || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">DIAGNOSED</div>
                  </div>
                  <div className="border-r border-slate-700">
                    <div className="text-lg font-semibold">{(monthlyStats.attStarted || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">ATT STARTED</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{(monthlyStats.referred || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">REFERRED</div>
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* Calendar with loading state */}
            {isLoadingYearMetrics ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-slate-400">Loading calendar data...</div>
              </div>
            ) : (
              <ScreeningCalendar
                data={calendarData}
                onDayClick={handleDayClick}
                selectedDate={selectedCalendarDate}
                updatedDates={updatedCalendarDates}
              />
            )}
          </>
        ) : (
          <div className="h-full">
            <NeuralDashboard
              globalPatients={filteredPatients}
              isLoading={isLoadingPatients || isLoadingMore}
              filter={null}
              onSetFilter={() => {}}
              summaryData={summaryData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
