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
    <div className=\"flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm\">\n      {/* Smart Toolbar */}\n      <div className=\"p-4 border-b border-slate-200 space-y-4\">\n        <div className=\"flex items-center gap-3\">\n          {/* Instant Search */}\n          <div className=\"relative flex-1\">\n            <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />\n            <Input\n              placeholder=\"Search by name, ID, facility, district...\"\n              value={searchTerm}\n              onChange={(e) => setSearchTerm(e.target.value)}\n              className=\"pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white\"\n            />\n            {searchTerm && (\n              <button\n                onClick={() => setSearchTerm('')}\n                className=\"absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600\"\n              >\n                <X className=\"w-4 h-4\" />\n              </button>\n            )}\n          </div>\n\n          {/* Quick Actions */}\n          <Button variant=\"outline\" size=\"sm\" className=\"gap-2\">\n            <RefreshCw className=\"w-4 h-4\" />\n            Refresh\n          </Button>\n          <Button variant=\"outline\" size=\"sm\" className=\"gap-2\">\n            <Download className=\"w-4 h-4\" />\n            Export\n          </Button>\n        </div>\n\n        {/* Smart Filters */}\n        <div className=\"flex items-center gap-2 flex-wrap\">\n          <Filter className=\"w-4 h-4 text-slate-500\" />\n          <span className=\"text-sm text-slate-600\">Quick Filters:</span>\n          \n          {Object.entries(filterOptions).map(([key, options]) => (\n            <select\n              key={key}\n              value={selectedFilters[key] || ''}\n              onChange={(e) => setSelectedFilters(prev => ({ ...prev, [key]: e.target.value }))}\n              className=\"text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500\"\n            >\n              <option value=\"\">{key.replace('_', ' ')}</option>\n              {options.slice(0, 10).map(opt => (\n                <option key={opt} value={opt}>{opt}</option>\n              ))}\n            </select>\n          ))}\n\n          {Object.keys(selectedFilters).some(k => selectedFilters[k]) && (\n            <button\n              onClick={() => setSelectedFilters({})}\n              className=\"text-sm text-blue-600 hover:text-blue-700 font-medium\"\n            >\n              Clear all\n            </button>\n          )}\n        </div>\n\n        {/* Results Info */}\n        <div className=\"flex items-center justify-between text-sm\">\n          <div className=\"flex items-center gap-4\">\n            <span className=\"text-slate-600\">\n              Showing <span className=\"font-semibold text-slate-900\">{filteredData.length}</span> of{' '}\n              <span className=\"font-semibold text-slate-900\">{data.length}</span> patients\n            </span>\n            {selectedRows.size > 0 && (\n              <Badge variant=\"secondary\" className=\"gap-1\">\n                <Zap className=\"w-3 h-3\" />\n                {selectedRows.size} selected\n              </Badge>\n            )}\n          </div>\n        </div>\n      </div>\n\n      {/* Virtual Scrolling Table */}\n      <div ref={parentRef} className=\"flex-1 overflow-auto\">\n        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>\n          {/* Table Header */}\n          <div className=\"sticky top-0 z-10 bg-slate-50 border-b border-slate-200\">\n            <div className=\"flex items-center text-xs font-semibold text-slate-600 uppercase tracking-wider\">\n              <div className=\"w-12 p-3\">\n                <input type=\"checkbox\" className=\"rounded\" />\n              </div>\n              <div className=\"w-32 p-3\">ID</div>\n              <div className=\"w-48 p-3\">Name</div>\n              <div className=\"w-40 p-3\">District</div>\n              <div className=\"w-56 p-3\">Facility</div>\n              <div className=\"w-32 p-3\">Screening Date</div>\n              <div className=\"w-40 p-3\">X-Ray Result</div>\n              <div className=\"w-32 p-3\">Referral Date</div>\n              <div className=\"w-32 p-3\">Actions</div>\n            </div>\n          </div>\n\n          {/* Virtual Rows */}\n          {rowVirtualizer.getVirtualItems().map((virtualRow) => {\n            const patient = filteredData[virtualRow.index]\n            const isSelected = selectedRows.has(patient.id)\n\n            return (\n              <div\n                key={patient.id}\n                style={{\n                  position: 'absolute',\n                  top: 0,\n                  left: 0,\n                  width: '100%',\n                  height: `${virtualRow.size}px`,\n                  transform: `translateY(${virtualRow.start}px)`\n                }}\n                className={`flex items-center border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${\n                  isSelected ? 'bg-blue-50' : 'bg-white'\n                }`}\n              >\n                <div className=\"w-12 p-3\">\n                  <input\n                    type=\"checkbox\"\n                    checked={isSelected}\n                    onChange={() => toggleRowSelection(patient.id)}\n                    className=\"rounded\"\n                  />\n                </div>\n                <div className=\"w-32 p-3 text-sm font-mono text-slate-600\">{patient.unique_id}</div>\n                <div className=\"w-48 p-3 text-sm font-medium text-slate-900\">{patient.inmate_name}</div>\n                <div className=\"w-40 p-3 text-sm text-slate-600\">{patient.screening_district}</div>\n                <div className=\"w-56 p-3 text-sm text-slate-600 truncate\">{patient.facility_name}</div>\n                <div className=\"w-32 p-3 text-sm text-slate-600\">\n                  {new Date(patient.screening_date).toLocaleDateString()}\n                </div>\n                <div className=\"w-40 p-3\">\n                  {editingCell?.id === patient.id && editingCell?.field === 'xray_result' ? (\n                    <div className=\"flex items-center gap-1\">\n                      <Input\n                        value={editValue}\n                        onChange={(e) => setEditValue(e.target.value)}\n                        className=\"h-7 text-xs\"\n                        autoFocus\n                      />\n                      <Button size=\"sm\" variant=\"ghost\" onClick={saveEdit} className=\"h-7 w-7 p-0\">\n                        <Save className=\"w-3 h-3\" />\n                      </Button>\n                      <Button size=\"sm\" variant=\"ghost\" onClick={cancelEdit} className=\"h-7 w-7 p-0\">\n                        <X className=\"w-3 h-3\" />\n                      </Button>\n                    </div>\n                  ) : (\n                    <Badge variant=\"secondary\" className=\"text-xs\">\n                      {patient.xray_result}\n                    </Badge>\n                  )}\n                </div>\n                <div className=\"w-32 p-3\">\n                  {editingCell?.id === patient.id && editingCell?.field === 'referral_date' ? (\n                    <div className=\"flex items-center gap-1\">\n                      <Input\n                        type=\"date\"\n                        value={editValue}\n                        onChange={(e) => setEditValue(e.target.value)}\n                        className=\"h-7 text-xs\"\n                        autoFocus\n                      />\n                      <Button size=\"sm\" variant=\"ghost\" onClick={saveEdit} className=\"h-7 w-7 p-0\">\n                        <Save className=\"w-3 h-3\" />\n                      </Button>\n                      <Button size=\"sm\" variant=\"ghost\" onClick={cancelEdit} className=\"h-7 w-7 p-0\">\n                        <X className=\"w-3 h-3\" />\n                      </Button>\n                    </div>\n                  ) : (\n                    <span className=\"text-sm text-slate-600\">\n                      {patient.referral_date ? new Date(patient.referral_date).toLocaleDateString() : '-'}\n                    </span>\n                  )}\n                </div>\n                <div className=\"w-32 p-3\">\n                  <Button\n                    size=\"sm\"\n                    variant=\"ghost\"\n                    onClick={() => startEdit(patient.id, 'referral_date', patient.referral_date)}\n                    className=\"h-7 gap-1\"\n                  >\n                    <Edit2 className=\"w-3 h-3\" />\n                    Edit\n                  </Button>\n                </div>\n              </div>\n            )\n          })}\n        </div>\n      </div>\n    </div>\n  )\n}