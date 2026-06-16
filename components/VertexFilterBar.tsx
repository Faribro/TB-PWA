'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface VertexFilters {
  search: string
  dateFrom: string
  dateTo: string
  state: string
  district: string
  facilityType: string
  suspected: string
  tbDiagnosed: string
  treatmentStatus: string
}

export const DEFAULT_FILTERS: VertexFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  state: '',
  district: '',
  facilityType: '',
  suspected: 'all',
  tbDiagnosed: 'all',
  treatmentStatus: 'all',
}

interface Props {
  filters: VertexFilters
  onChange: (f: VertexFilters) => void
  activeCount: number
  totalCount: number
  onExport: () => void
  isExporting: boolean
  canExport: boolean
}

export function VertexFilterBar({
  filters, onChange, activeCount, totalCount,
  onExport, isExporting, canExport
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const activeFilters = [
    filters.dateFrom && `From: ${filters.dateFrom}`,
    filters.dateTo && `To: ${filters.dateTo}`,
    filters.state && filters.state,
    filters.district && filters.district,
    filters.facilityType && filters.facilityType,
    filters.suspected !== 'all' && `Suspected: ${filters.suspected}`,
    filters.tbDiagnosed !== 'all' && `TB: ${filters.tbDiagnosed}`,
    filters.treatmentStatus !== 'all' && `Rx: ${filters.treatmentStatus}`,
  ].filter(Boolean)

  const clearAll = () => onChange(DEFAULT_FILTERS)

  return (
    <div className="border-b border-black/[0.06] bg-[#f9f8f5]/95 backdrop-blur-sm">
      {/* Primary filter row */}
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2
                                       text-[#bab9b4] pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient, serial, facility…"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-2 bg-white border border-black/[0.08]
                       rounded-lg text-sm text-[#28251d] placeholder:text-[#bab9b4]
                       focus:outline-none focus:border-[#01696f] focus:ring-2
                       focus:ring-[#cedcd8] transition-all"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 bg-white border border-black/[0.08] rounded-lg
                       text-xs text-[#28251d] focus:outline-none focus:border-[#01696f]
                       focus:ring-2 focus:ring-[#cedcd8] transition-all"
          />
          <span className="text-xs text-[#bab9b4]">—</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 bg-white border border-black/[0.08] rounded-lg
                       text-xs text-[#28251d] focus:outline-none focus:border-[#01696f]
                       focus:ring-2 focus:ring-[#cedcd8] transition-all"
          />
        </div>

        {/* Quick date shortcuts */}
        <div className="flex gap-1">
          {[
            { label: '7D', days: 7 },
            { label: '30D', days: 30 },
            { label: '90D', days: 90 },
          ].map(({ label, days }) => {
            const to = new Date().toISOString().split('T')[0]
            const from = new Date(Date.now() - days * 86400000)
              .toISOString().split('T')[0]
            const active = filters.dateFrom === from && filters.dateTo === to
            return (
              <button key={label}
                onClick={() => onChange({ ...filters, dateFrom: from, dateTo: to })}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  active
                    ? 'bg-[#01696f] text-white'
                    : 'bg-[#f3f0ec] text-[#7a7974] hover:bg-[#e6e4df]'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium',
            'transition-colors',
            expanded
              ? 'bg-[#cedcd8]/60 text-[#01696f]'
              : 'bg-[#f3f0ec] text-[#7a7974] hover:bg-[#e6e4df]'
          )}
        >
          <Filter size={12} />
          Filters
          {activeFilters.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#01696f] text-white
                            text-[10px] flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
          <ChevronDown size={11}
            className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>

        {/* Clear all */}
        {activeFilters.length > 0 && (
          <button onClick={clearAll}
            className="flex items-center gap-1 text-xs text-[#7a7974]
                       hover:text-[#28251d] transition-colors">
            <X size={11} />
            Clear
          </button>
        )}

        <div className="flex-1" />

        {/* Record count */}
        <span className="text-xs text-[#7a7974] tabular-nums">
          <span className="font-semibold text-[#28251d]">
            {activeCount.toLocaleString()}
          </span>
          {' '}/{' '}
          {totalCount.toLocaleString()} records
        </span>

        {/* XLSX Export */}
        {canExport && (
          <button
            onClick={onExport}
            disabled={isExporting || activeCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#437a22] text-white
                       rounded-lg text-xs font-medium hover:bg-[#2e5c10]
                       active:bg-[#1e3f0a] transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span className="w-3 h-3 border border-white/30 border-t-white
                              rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {isExporting ? 'Exporting…' : 'Export XLSX'}
          </button>
        )}
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-3 grid grid-cols-5 gap-3">
              {[
                {
                  label: 'State',
                  key: 'state' as keyof VertexFilters,
                  options: ['All States', 'Maharashtra', 'Madhya Pradesh',
                    'Rajasthan', 'Uttar Pradesh', 'Gujarat'],
                },
                {
                  label: 'District',
                  key: 'district' as keyof VertexFilters,
                  options: ['All Districts', 'Mumbai', 'Dewas', 'Jaipur', 'Lucknow'],
                },
                {
                  label: 'Facility Type',
                  key: 'facilityType' as keyof VertexFilters,
                  options: ['All Facilities', 'CHC', 'PHC', 'DH',
                    'Private', 'Prison', 'DRTB Centre'],
                },
                {
                  label: 'Suspected',
                  key: 'suspected' as keyof VertexFilters,
                  options: ['all', 'Yes', 'No'],
                },
                {
                  label: 'TB Diagnosed',
                  key: 'tbDiagnosed' as keyof VertexFilters,
                  options: ['all', 'Yes', 'No', 'Pending'],
                },
                {
                  label: 'Treatment Status',
                  key: 'treatmentStatus' as keyof VertexFilters,
                  options: ['all', 'Ongoing', 'Completed',
                    'Defaulted', 'Died', 'Not Started'],
                },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#7a7974] mb-1">
                    {label}
                  </label>
                  <select
                    value={filters[key]}
                    onChange={e => onChange({ ...filters, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-black/[0.08]
                               rounded-lg text-sm text-[#28251d] focus:outline-none
                               focus:border-[#01696f] transition-all"
                  >
                    {options.map(o => (
                      <option key={o} value={o === 'All States' || o === 'All Districts' || o === 'All Facilities' ? '' : o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex gap-1.5 px-6 pb-2 flex-wrap">
          {activeFilters.map(f => (
            <span key={f as string}
              className="text-xs px-2 py-0.5 rounded-full
                         bg-[#cedcd8] text-[#01696f] font-medium">
              {f as string}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
