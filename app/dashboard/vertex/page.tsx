'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const national = isSuperuser(scope);
  const setFilter = useEntityStore(s => s.setGlobalFilter);

  // State/district filters for query
  const [filters, setFilters] = useState<VertexFilters>(DEFAULT_FILTERS);
  const selectedState = filters.state;
  const selectedDistrict = filters.district;

  // Fetch patients with filters - ONLY for table view
  const { 
    patients: globalPatients, 
    meta, 
    total, 
    isLoading: isLoadingPatients, 
    error: patientsError,
    mutate: mutatePatients 
  } = useSWRAllPatients(scope, {
    limit: 10000,
    filters: {
      state: selectedState,
      district: selectedDistrict,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: filters.search
    }
  });
  
  // SOURCE A: Calendar + metrics data (NEVER use patients for calendar)
  // ONE call for full year calendar data (cached 5min)
  const { 
    data: yearMetrics, 
    error: yearMetricsError,
    isLoading: isLoadingYearMetrics
  } = useSWR(
    view === 'calendar' 
      ? `/api/vertex/metrics?year=${currentYear}&view=year&state=${selectedState || 'all'}&district=${selectedDistrict || 'all'}`
      : null,
    fetcher,
    {
      dedupingInterval: 300000, // 5 min — calendar data
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

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
      dedupingInterval: 60000,
      revalidateOnFocus: false,
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
    filters.tbDiagnosed !== 'all' ? '1' : '',
    filters.treatmentStatus !== 'all' ? '1' : '',
  ].filter(Boolean).length;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredPatients = useMemo(() => {
    return globalPatients.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = [
          p.inmate_name,
          p.serial_no,
          p.facility_name,
          p.staff_name
        ].some(v => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filters.dateFrom && p.screening_date && p.screening_date < filters.dateFrom) return false;
      if (filters.dateTo && p.screening_date && p.screening_date > filters.dateTo) return false;
      if (filters.state && p.screening_state !== filters.state) return false;
      if (filters.district && p.screening_district !== filters.district) return false;
      if (filters.facilityType && p.facility_type !== filters.facilityType) return false;
      if (filters.tbDiagnosed !== 'all' && p.tb_diagnosed !== filters.tbDiagnosed) return false;
      if (filters.treatmentStatus !== 'all' && p.treatment_status !== filters.treatmentStatus) return false;
      if (selectedCalendarDate && p.screening_date !== selectedCalendarDate) return false;
      return true;
    });
  }, [globalPatients, filters, selectedCalendarDate]);

  // Calendar dots use yearMetrics
  const calendarData = useMemo(() => {
    return yearMetrics?.dailyBreakdown || [];
  }, [yearMetrics]);

  // Monthly overview panel uses monthMetrics
  const monthlyStats = useMemo(() => {
    if (!monthMetrics) return null;
    return {
      screened: monthMetrics.screened,
      suspected: monthMetrics.suspected,
      diagnosed: monthMetrics.diagnosed,
      attStarted: monthMetrics.attStarted,
      referred: monthMetrics.referred,
    };
  }, [monthMetrics]);

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
  }, [filteredPatients, filters.state]);

  const handleDayClick = useCallback((date: string) => {
    sounds.calendarClick();
    setSelectedCalendarDate(prev => prev === date ? null : date);
    setView('table');
  }, []);



  return (
    <div className="flex flex-col h-full overflow-hidden">
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

          {/* Record count */}
          <span className="text-xs text-[#7a7974] tabular-nums whitespace-nowrap">
            <span className="font-semibold text-[#28251d]">
              {filteredPatients.length.toLocaleString()}
            </span>
            {' / '}
            {total.toLocaleString()}
            {meta && (
              <span className="text-[10px] text-slate-400 ml-1">
                (fetched {meta.returned?.toLocaleString()} in {Math.ceil((meta.returned || 0) / 500)} batches)
              </span>
            )}
          </span>

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
              <div className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2
                             border-t border-black/[0.04]">
                {[
                  { label: 'State', key: 'state' as const, options: ['', 'Maharashtra', 'Madhya Pradesh', 'Rajasthan', 'Uttar Pradesh', 'Gujarat'] },
                  { label: 'District', key: 'district' as const, options: ['', 'Mumbai', 'Dewas', 'Jaipur', 'Lucknow'] },
                  { label: 'Facility', key: 'facilityType' as const, options: ['', 'CHC', 'PHC', 'Prison', 'DH', 'DRTB Centre'] },
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
            {/* Monthly Overview Panel - with loading & error states */}
            {isLoadingMonthMetrics ? (
              <MetricsSkeleton />
            ) : monthMetricsError ? (
              <MetricsError 
                error={monthMetricsError} 
                onRetry={() => mutateMonthMetrics()} 
              />
            ) : monthlyStats ? (
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
              />
            )}
          </>
        ) : (
          <div className="h-full">
            <NeuralDashboard
              globalPatients={filteredPatients}
              isLoading={isLoadingPatients}
              filter={null}
              onSetFilter={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
