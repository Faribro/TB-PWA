'use client';

import { Search, SlidersHorizontal, ArrowUpDown, RefreshCw, FileText, Calendar, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusIndicator } from '@/components/StatusIndicator';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';
import type { NexusFilters } from '@/app/dashboard/neural-nexus/page';

interface AdvancedFilterBarProps {
  filters: NexusFilters;
  onFiltersChange: (filters: Partial<NexusFilters>) => void;
  patientCount: number;
  districts: string[];
}

export function AdvancedFilterBar({ filters, onFiltersChange, patientCount, districts }: AdvancedFilterBarProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast.info('Scout initiated. Checking Drive folders...');
    try {
      // ✅ FIX: Call internal API route instead of Google Apps Script directly
      const response = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
      });
      
      if (response.ok) {
        toast.success('Drive sync completed successfully');
      } else {
        toast.error('Drive sync failed. Check logs.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Drive sync failed. Check connection.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return (
    <div className="flex items-center justify-between gap-4 pb-6">
      {/* Left: Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search patients, IDs..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="pl-11 pr-6 py-3 bg-white/50 backdrop-blur-xl border border-white/20 rounded-2xl w-64 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"
          />
        </div>

        <Select value={filters.filterRisk} onValueChange={(v) => onFiltersChange({ filterRisk: v as any })}>
          <SelectTrigger className="h-11 w-40 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="Risk Level" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="All" className="font-bold">All Risk</SelectItem>
            <SelectItem value="high" className="font-bold text-red-600">High Risk (&gt;0.8)</SelectItem>
            <SelectItem value="normal" className="font-bold">Normal Risk</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.filterStatus} onValueChange={(v) => onFiltersChange({ filterStatus: v as any })}>
          <SelectTrigger className="h-11 w-40 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="Link Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="All" className="font-bold">All Status</SelectItem>
            <SelectItem value="linked" className="font-bold text-emerald-600">Linked</SelectItem>
            <SelectItem value="unlinked" className="font-bold">Unlinked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.dateRange} onValueChange={(v) => onFiltersChange({ dateRange: v as any })}>
          <SelectTrigger className="h-11 w-44 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="Date Range" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="all" className="font-bold">All Time</SelectItem>
            <SelectItem value="today" className="font-bold">Today</SelectItem>
            <SelectItem value="7d" className="font-bold">Last 7 Days</SelectItem>
            <SelectItem value="30d" className="font-bold">Last 30 Days</SelectItem>
            <SelectItem value="90d" className="font-bold">Last 90 Days</SelectItem>
            <SelectItem value="custom" className="font-bold text-blue-600">Custom Range...</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom date pickers — only shown when custom is selected */}
        {filters.dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
              className="h-11 px-4 bg-white/50 backdrop-blur-xl border border-white/20 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] hover:border-blue-400 transition-all"
            />
            <span className="text-xs font-bold text-slate-400">→</span>
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
              className="h-11 px-4 bg-white/50 backdrop-blur-xl border border-white/20 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] hover:border-blue-400 transition-all"
            />
          </>
        )}

        <Select value={filters.district || 'all'} onValueChange={(v) => onFiltersChange({ district: v === 'all' ? '' : v })}>
          <SelectTrigger className="h-11 w-48 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="District" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl max-h-60 overflow-y-auto">
            <SelectItem value="all" className="font-bold">All Districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.filterType} onValueChange={(v) => onFiltersChange({ filterType: v as any })}>
          <SelectTrigger className="h-11 w-44 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="Content Type" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="All" className="font-bold">All Diagnostic Types</SelectItem>
            <SelectItem value="dcm" className="font-bold">Only X-Rays (DICOM)</SelectItem>
            <SelectItem value="pdf" className="font-bold text-red-600">Only Reports (PDF)</SelectItem>
            <SelectItem value="jpg" className="font-bold text-emerald-600">Only Lab Results (JPG)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(v) => onFiltersChange({ sortBy: v as any })}>
          <SelectTrigger className="h-11 w-44 text-xs font-bold border-white/20 bg-white/50 backdrop-blur-xl hover:bg-white hover:border-blue-400 transition-all rounded-2xl focus:ring-4 focus:ring-blue-500/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="Sort By" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="genki_desc" className="font-bold">Genki ↓ High First</SelectItem>
            <SelectItem value="genki_asc" className="font-bold">Genki ↑ Low First</SelectItem>
            <SelectItem value="name_asc" className="font-bold">Name A → Z</SelectItem>
            <SelectItem value="name_desc" className="font-bold">Name Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: Status + Sync */}
      <div className="flex items-center gap-3">
        <StatusIndicator />
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Drive'}
        </button>
      </div>
    </div>
  );
}
