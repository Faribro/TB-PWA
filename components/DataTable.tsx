'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { RefreshCw, Search, AlertCircle, Filter, X, LayoutGrid, List, Zap, Edit3, Save, Download, FileSpreadsheet } from 'lucide-react';
import { PhaseCell } from './PhaseCell';
import { FilterBar, type FilterState } from './FilterBar';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { PatientDetailDrawer } from './PatientDetailDrawer';
import { LinesAndDotsLoader } from './LinesAndDotsLoader';
import * as XLSX from 'xlsx';

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
  const [progress, setProgress] = useState(0);
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

  // XLSX Export Handler
  const handleExportXLSX = async () => {
    // Fetch ALL filtered data without pagination
    let query = supabase.from('patients').select('*');
    
    if (search) {
      query = query.or(`inmate_name.ilike.%${search}%,unique_id.ilike.%${search}%,facility_name.ilike.%${search}%`);
    }
    if (filters.state) query = query.eq('screening_state', filters.state);
    if (filters.district) query = query.eq('screening_district', filters.district);
    if (filters.tbDiagnosed) query = query.eq('tb_diagnosed', filters.tbDiagnosed);
    if (filters.hivStatus) query = query.eq('hiv_status', filters.hivStatus);
    if (filters.dateFrom) query = query.gte('screening_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('screening_date', filters.dateTo);
    
    const { data } = await query.order('created_at', { ascending: false });
    
    if (data) {
      // Transform data for Excel
      const excelData = data.map(p => ({
        'Patient ID': p.unique_id,
        'Name': p.inmate_name,
        'Age': p.age,
        'Sex': p.sex,
        'State': p.screening_state,
        'District': p.screening_district,
        'Facility': p.facility_name,
        'Screening Date': p.screening_date,
        'X-Ray Result': p.xray_result,
        'Referral Date': p.referral_date || '',
        'TB Diagnosed': p.tb_diagnosed || '',
        'ATT Start Date': p.att_start_date || '',
        'Phase': calculatePatientPhase(p).phase
      }));
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `TB_Patient_Export_${today}.xlsx`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 100);
    
    if (showDuplicates) {
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
      // SERVER-SIDE FILTERING - Build query with filters
      let query = supabase.from('patients').select('*', { count: 'exact' });
      
      // Apply search filter
      if (search) {
        query = query.or(`inmate_name.ilike.%${search}%,unique_id.ilike.%${search}%,facility_name.ilike.%${search}%`);
      }
      
      // Apply state filter
      if (filters.state) {
        query = query.eq('screening_state', filters.state);
      }
      
      // Apply district filter
      if (filters.district) {
        query = query.eq('screening_district', filters.district);
      }
      
      // Apply TB diagnosed filter
      if (filters.tbDiagnosed) {
        query = query.eq('tb_diagnosed', filters.tbDiagnosed);
      }
      
      // Apply HIV status filter
      if (filters.hivStatus) {
        query = query.eq('hiv_status', filters.hivStatus);
      }
      
      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte('screening_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('screening_date', filters.dateTo);
      }
      
      const { data, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      setPatients(data || []);
      setTotalCount(count || 0);
    }
    
    clearInterval(progressInterval);
    setProgress(100);
    setTimeout(() => setLoading(false), 200);
  };

  useEffect(() => {
    loadData();
  }, [page, showDuplicates, search, filters]);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const states = [...new Set(patients.map(p => p.screening_state).filter(Boolean))];
    const districts = [...new Set(patients.map(p => p.screening_district).filter(Boolean))];
    const facilityTypes = ['Prison', 'Other Closed Setting', 'JH-CCI', 'DDRC']; // Standardized types
    return { states, districts, facilityTypes };
  }, [patients]);

  // Remove client-side filtering since we're doing server-side
  const filtered = patients;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LinesAndDotsLoader progress={progress} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-2xl overflow-hidden shadow-lg text-sm"
    >
      <div className="p-3 border-b border-gray-200/50 space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder={showDuplicates ? "Search duplicates..." : "🔍 Instant search: name, ID, facility, district..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm h-8"
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all h-8 ${
                viewMode === 'compact' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all h-8 ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            onClick={() => setQuickEditMode(!quickEditMode)}
            variant="outline"
            size="sm"
            className={`px-3 py-1.5 rounded-lg border-2 transition-all duration-200 h-8 text-xs ${
              quickEditMode 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Quick Edit
          </Button>
          
          {/* Filter Toggle Button */}
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant="outline"
            size="sm"
            className={`px-3 py-1.5 rounded-lg border-2 transition-all duration-200 h-8 text-xs ${
              showAdvancedFilters 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {Object.values(filters).some(v => v && v !== false) && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                {Object.values(filters).filter(v => v && v !== false).length}
              </span>
            )}
          </Button>
          
          <Button onClick={loadData} size="sm" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          
          <Button
            onClick={handleExportXLSX}
            size="sm"
            variant="outline"
            className="px-3 py-1.5 rounded-lg h-8 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Export Excel
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
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
            <tr>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">ID</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">State</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Facility</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Phase</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Screening</th>
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
                <td className="px-3 py-1.5 text-gray-700 font-mono text-[11px]">{patient.unique_id}</td>
                <td className="px-3 py-1.5 text-gray-900 font-medium">{patient.inmate_name}</td>
                <td className="px-3 py-1.5 text-gray-600">{patient.screening_state}</td>
                <td className="px-3 py-1.5 text-gray-600">{patient.facility_name}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                    {calculatePatientPhase(patient).phase}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-600">{patient.screening_date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {!showDuplicates && (
        <div className="px-3 py-2 border-t border-gray-200/50 flex items-center justify-between bg-gray-50/30">
          <div className="text-[11px] text-gray-600">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} patients
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="sm" variant="outline" className="h-7 px-2.5 text-xs">
              Previous
            </Button>
            <div className="flex items-center gap-2 px-2.5 text-[11px] text-gray-500">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </div>
            <Button onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)} size="sm" variant="outline" className="h-7 px-2.5 text-xs">
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Patient Detail Drawer */}
      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen={true}
          onClose={() => setSelectedPatient(null)}
          onUpdate={loadData}
        />
      )}
    </motion.div>
  );
}
