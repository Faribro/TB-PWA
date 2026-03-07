'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { RefreshCw, Search, AlertCircle, Filter, X, LayoutGrid, List, Zap, Edit3, Save, Download } from 'lucide-react';
import { PhaseCell } from './PhaseCell';
import { FilterBar, type FilterState } from './FilterBar';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { PatientDetailDrawer } from './PatientDetailDrawer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DataTableProps {
  showDuplicates?: boolean;
}

export function DataTable({ showDuplicates = false }: DataTableProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'compact'>('compact');
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    facilityType: '',
    state: '',
    district: '',
    phase: '',
    overdueOnly: false,
    tbDiagnosed: '',
    hivStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const pageSize = 500; // Increased for better performance with filters

  // Quick update handler
  const handleQuickUpdate = async (patientId: number, field: string, value: any) => {
    const { error } = await supabase
      .from('patients')
      .update({ [field]: value })
      .eq('id', patientId);
    
    if (!error) {
      setPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, [field]: value } : p
      ));
      setEditingCell(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    if (showDuplicates) {
      // Find duplicates by unique_id or kobo_uuid
      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        const duplicates = data.filter((patient, index, arr) => 
          arr.findIndex(p => 
            p.unique_id === patient.unique_id || 
            (p.kobo_uuid && p.kobo_uuid === patient.kobo_uuid)
          ) !== index
        );
        setPatients(duplicates);
        setTotalCount(duplicates.length);
      }
    } else {
      const { data, count } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      setPatients(data || []);
      setTotalCount(count || 0);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [page, showDuplicates]);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const states = [...new Set(patients.map(p => p.screening_state).filter(Boolean))];
    const districts = [...new Set(patients.map(p => p.screening_district).filter(Boolean))];
    const facilityTypes = ['Prison', 'Other Closed Setting', 'JH-CCI', 'DDRC']; // Standardized types
    return { states, districts, facilityTypes };
  }, [patients]);

  const filtered = patients.filter(p => {
    // Search filter
    const matchesSearch = p.inmate_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.unique_id?.toLowerCase().includes(search.toLowerCase()) ||
      p.facility_name?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Facility type filter
    if (filters.facilityType && !p.facility_type?.includes(filters.facilityType)) return false;

    // State filter
    if (filters.state && p.screening_state !== filters.state) return false;

    // District filter
    if (filters.district && p.screening_district !== filters.district) return false;

    // Phase filter
    if (filters.phase) {
      const { phase } = calculatePatientPhase(p);
      if (phase !== filters.phase) return false;
    }

    // TB Diagnosed filter
    if (filters.tbDiagnosed && p.tb_diagnosed !== filters.tbDiagnosed) return false;

    // HIV Status filter
    if (filters.hivStatus && p.hiv_status !== filters.hivStatus) return false;

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
      if (screeningDate) {
        if (filters.dateFrom && screeningDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && screeningDate > new Date(filters.dateTo)) return false;
      }
    }

    // Overdue filter
    if (filters.overdueOnly) {
      const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
      const daysSinceScreening = screeningDate ? 
        Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      if (!p.referral_date && daysSinceScreening < 30) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-3xl overflow-hidden shadow-lg"
    >
      <div className="p-6 border-b border-gray-200/50 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder={showDuplicates ? "Search duplicates..." : "🔍 Instant search: name, ID, facility, district..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
            />
            {search && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-gray-500">{filtered.length} results</span>
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'compact' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Edit Toggle */}
          <Button
            onClick={() => setQuickEditMode(!quickEditMode)}
            variant="outline"
            size="sm"
            className={`px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
              quickEditMode 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Edit
          </Button>
          
          {/* Filter Toggle Button */}
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant="outline"
            size="sm"
            className={`px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
              showAdvancedFilters 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).some(v => v && v !== false) && (
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                {Object.values(filters).filter(v => v && v !== false).length}
              </span>
            )}
          </Button>
          
          <Button onClick={loadData} size="sm" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={() => {
              const csv = [['ID', 'Name', 'State', 'District', 'Facility', 'Phase', 'Screening Date'].join(',')];
              filtered.forEach(p => {
                csv.push([p.unique_id, p.inmate_name, p.screening_state, p.screening_district, p.facility_name, calculatePatientPhase(p).phase, p.screening_date].join(','));
              });
              const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `patients-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            size="sm"
            variant="outline"
            className="px-4 py-2.5 rounded-xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({filtered.length})
          </Button>
          
          {showDuplicates && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Duplicate Records</span>
            </div>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => {
                  const clearedFilters = {
                    facilityType: '',
                    state: '',
                    district: '',
                    phase: '',
                    overdueOnly: false,
                    tbDiagnosed: '',
                    hivStatus: '',
                    dateFrom: '',
                    dateTo: ''
                  };
                  setFilters(clearedFilters);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Filters */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Location</label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value, district: '' }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">All States</option>
                  {filterOptions.states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <select
                  value={filters.district}
                  onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">All Districts</option>
                  {filterOptions.districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              {/* Facility & Phase */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Facility & Phase</label>
                <select
                  value={filters.facilityType}
                  onChange={(e) => setFilters(prev => ({ ...prev, facilityType: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">All Facility Types</option>
                  {filterOptions.facilityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={filters.phase}
                  onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">All Phases</option>
                  <option value="Screening">Screening</option>
                  <option value="Sputum Test">Sputum Test</option>
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="ATT Initiation">ATT Initiation</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Medical Status */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Medical Status</label>
                <select
                  value={filters.tbDiagnosed}
                  onChange={(e) => setFilters(prev => ({ ...prev, tbDiagnosed: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">TB Status - All</option>
                  <option value="Y">TB Positive</option>
                  <option value="N">TB Negative</option>
                </select>
                <select
                  value={filters.hivStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, hivStatus: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">HIV Status - All</option>
                  <option value="Positive">HIV Positive</option>
                  <option value="Negative">HIV Negative</option>
                  <option value="Unknown">HIV Unknown</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Screening Date Range</label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <label className="absolute -top-2 left-2 px-1 bg-white text-xs text-gray-500">From Date</label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      min={filters.dateFrom || undefined}
                    />
                    <label className="absolute -top-2 left-2 px-1 bg-white text-xs text-gray-500">To Date</label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Special Filters */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.overdueOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, overdueOnly: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Show overdue cases only (30+ days without referral)</span>
              </label>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'compact' ? (
          /* Compact Card View - Optimized for 30k rows */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {filtered.map((patient, index) => {
              const phase = calculatePatientPhase(patient);
              return (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(index * 0.01, 0.3) }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => !quickEditMode && setSelectedPatient(patient)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate text-sm">{patient.inmate_name}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{patient.unique_id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      phase.phase === 'Screening' ? 'bg-amber-100 text-amber-700' :
                      phase.phase === 'Diagnosis' ? 'bg-blue-100 text-blue-700' :
                      phase.phase === 'ATT Initiation' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {phase.phase}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">District:</span>
                      <span className="font-medium text-gray-900">{patient.screening_district}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Facility:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{patient.facility_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Screened:</span>
                      <span className="font-medium text-gray-900">{new Date(patient.screening_date).toLocaleDateString()}</span>
                    </div>
                    
                    {quickEditMode && (
                      <div className="pt-2 mt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          {editingCell?.id === patient.id && editingCell?.field === 'referral_date' ? (
                            <>
                              <input
                                type="date"
                                defaultValue={patient.referral_date || ''}
                                onBlur={(e) => handleQuickUpdate(patient.id, 'referral_date', e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                autoFocus
                              />
                              <button onClick={() => setEditingCell(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ id: patient.id, field: 'referral_date' });
                              }}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              <Edit3 className="h-3 w-3" />
                              {patient.referral_date ? 'Update Referral' : 'Add Referral'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!quickEditMode && (
                    <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-blue-600 font-medium">Click to view details →</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">State</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Facility</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phase</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Screening</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50">
            {filtered.map((patient, index) => (
              <motion.tr 
                key={patient.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => setSelectedPatient(patient)}
              >
                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{patient.unique_id}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{patient.inmate_name}</td>
                <td className="px-4 py-3 text-gray-600">{patient.screening_state}</td>
                <td className="px-4 py-3 text-gray-600">{patient.facility_name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {calculatePatientPhase(patient).phase}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{patient.screening_date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {!showDuplicates && (
        <div className="px-4 py-3 border-t border-gray-200/50 flex items-center justify-between bg-gray-50/30">
          <div className="text-xs text-gray-600">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} patients
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="sm" variant="outline">
              Previous
            </Button>
            <div className="flex items-center gap-2 px-3 text-xs text-gray-500">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </div>
            <Button onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)} size="sm" variant="outline">
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Patient Detail Drawer */}
      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdate={loadData}
        />
      )}
    </motion.div>
  );
}
