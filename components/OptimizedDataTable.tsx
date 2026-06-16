'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Filter, Download, RefreshCw, Edit2, Save, X, ChevronDown, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Patient {
  id: number
  unique_id: string
  inmate_name: string
  screening_state: string
  screening_district: string
  facility_name: string
  screening_date: string
  xray_result: string
  referral_date: string | null
  tb_diagnosed: string | null
  att_start_date: string | null
  age: number
  sex: string
}

interface OptimizedDataTableProps {
  data: Patient[]
  onUpdate: (id: number, field: string, value: any) => Promise<void>
}

export default function OptimizedDataTable({ data, onUpdate }: OptimizedDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)

  // Smart filtering with memoization
  const filteredData = useMemo(() => {
    let filtered = data

    // Search across multiple fields
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.inmate_name?.toLowerCase().includes(search) ||
        p.unique_id?.toLowerCase().includes(search) ||
        p.facility_name?.toLowerCase().includes(search) ||
        p.screening_district?.toLowerCase().includes(search)
      )
    }

    // Apply filters
    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(p => p[key as keyof Patient] === value)
      }
    })

    return filtered
  }, [data, searchTerm, selectedFilters])

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10
  })

  // Quick edit handlers
  const startEdit = useCallback((id: number, field: string, currentValue: any) => {
    setEditingCell({ id, field })
    setEditValue(currentValue || '')
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingCell) {
      await onUpdate(editingCell.id, editingCell.field, editValue)
      setEditingCell(null)
      setEditValue('')
    }
  }, [editingCell, editValue, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  // Bulk selection
  const toggleRowSelection = useCallback((id: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Smart filters based on data
  const filterOptions = useMemo(() => ({
    screening_state: [...new Set(data.map(p => p.screening_state))].filter(Boolean),
    screening_district: [...new Set(data.map(p => p.screening_district))].filter(Boolean),
    xray_result: [...new Set(data.map(p => p.xray_result))].filter(Boolean)
  }), [data])

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Smart Toolbar */}
      <div className="p-4 border-b border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          {/* Instant Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, ID, facility, district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Smart Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">Quick Filters:</span>
          
          {Object.entries(filterOptions).map(([key, options]) => (
            <select
              key={key}
              value={selectedFilters[key] || ''}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, [key]: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{key.replace('_', ' ')}</option>
              {options.slice(0, 10).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}

          {Object.keys(selectedFilters).some(k => selectedFilters[k]) && (
            <button
              onClick={() => setSelectedFilters({})}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredData.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{data.length}</span> patients
            </span>
            {selectedRows.size > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                {selectedRows.size} selected
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Virtual Scrolling Table */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {/* Table Header */}
          <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <div className="w-12 p-3">
                <input type="checkbox" className="rounded" />
              </div>
              <div className="w-32 p-3">ID</div>
              <div className="w-48 p-3">Name</div>
              <div className="w-40 p-3">District</div>
              <div className="w-56 p-3">Facility</div>
              <div className="w-32 p-3">Screening Date</div>
              <div className="w-40 p-3">X-Ray Result</div>
              <div className="w-32 p-3">Referral Date</div>
              <div className="w-32 p-3">Actions</div>
            </div>
          </div>

          {/* Virtual Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const patient = filteredData[virtualRow.index]
            const isSelected = selectedRows.has(patient.id)

            return (
              <div
                key={patient.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className={`flex items-center border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                  isSelected ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRowSelection(patient.id)}
                    className="rounded"
                  />
                </div>
                <div className="w-32 p-3 text-sm font-mono text-slate-600">{patient.unique_id}</div>
                <div className="w-48 p-3 text-sm font-medium text-slate-900">{patient.inmate_name}</div>
                <div className="w-40 p-3 text-sm text-slate-600">{patient.screening_district}</div>
                <div className="w-56 p-3 text-sm text-slate-600 truncate">{patient.facility_name}</div>
                <div className="w-32 p-3 text-sm text-slate-600">
                  {new Date(patient.screening_date).toLocaleDateString()}
                </div>
                <div className="w-40 p-3">
                  {editingCell?.id === patient.id && editingCell?.field === 'xray_result' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 w-7 p-0">
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {patient.xray_result}
                    </Badge>
                  )}
                </div>
                <div className="w-32 p-3">
                  {editingCell?.id === patient.id && editingCell?.field === 'referral_date' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 w-7 p-0">
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-600">
                      {patient.referral_date ? new Date(patient.referral_date).toLocaleDateString() : '-'}
                    </span>
                  )}
                </div>
                <div className="w-32 p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(patient.id, 'referral_date', patient.referral_date)}
                    className="h-7 gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}