'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, Calendar, CheckCircle, MapPin, Search, Check, X, ChevronRight, Clock, Filter, CheckSquare, Square } from 'lucide-react';
import { PatientDetailDrawer } from './PatientDetailDrawer';
import { PhaseCell } from './PhaseCell';
import { AdvancedFilterBar, type FilterState } from './AdvancedFilterBar';
import { calculatePatientPhase } from '@/lib/phase-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  screening_state: string;
  screening_district: string;
  facility_name: string;
  facility_type: string;
  screening_date: string;
  xray_result: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  hiv_status: string | null;
  att_start_date: string | null;
  att_completion_date: string | null;
  risk_score: number;
  age: number;
  sex: string;
  created_at: string;
}

const PHASES = [
  { id: 1, name: 'Screening', icon: AlertTriangle, color: 'amber' },
  { id: 2, name: 'Sputum Test', icon: Activity, color: 'blue' },
  { id: 3, name: 'Diagnosis', icon: Calendar, color: 'purple' },
  { id: 4, name: 'ATT Initiation', icon: CheckCircle, color: 'green' },
  { id: 5, name: 'Closed', icon: CheckCircle, color: 'gray' }
];

export default function CommandCenter() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    fetchPatients();
    const subscription = supabase
      .channel('patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, fetchPatients)
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [page]);

  const fetchPatients = async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    console.log('Fetch result:', { data: data?.length, count, error });
    
    if (data) {
      setPatients(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const updatePatient = async (id: number, updates: Partial<Patient>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const response = await fetch('/api/update-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uniqueId: patient.unique_id,
        updates
      })
    });

    if (response.ok) {
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      if (selectedPatient?.id === id) setSelectedPatient({ ...selectedPatient, ...updates });
    }
  };

  const bulkUpdate = async (updates: Partial<Patient>) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => supabase.from('patients').update(updates).eq('id', id)));
    setPatients(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...updates } : p));
    setSelectedIds(new Set());
  };

  const closeLoop = async (id: number, reason: string) => {
    await updatePatient(id, { tb_diagnosed: 'No', referral_date: new Date().toISOString(), att_start_date: null });
  };

  const getPhase = (p: Patient): number => {
    const { phaseIndex } = calculatePatientPhase(p);
    return phaseIndex + 1; // Convert 0-4 to 1-5 for UI compatibility
  };

  const getDaysInPhase = (p: Patient): number => {
    const date = p.referral_date || p.screening_date;
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (p: Patient): boolean => {
    const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
    const daysSinceScreening = screeningDate ? 
      Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return !p.referral_date && daysSinceScreening > 30;
  };

  const filterOptions = {
    states: [...new Set(patients.map(p => p.screening_state).filter(Boolean))],
    districts: [...new Set(patients.map(p => p.screening_district).filter(Boolean))],
    facilityTypes: ['Prison', 'Other Closed Setting', 'JH-CCI', 'DDRC'] // Standardized types
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = (p.inmate_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.unique_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filters.facilityType && !p.facility_type?.includes(filters.facilityType)) return false;
    if (filters.state && p.screening_state !== filters.state) return false;
    if (filters.district && p.screening_district !== filters.district) return false;
    if (filters.phase) {
      const { phase } = calculatePatientPhase(p);
      if (phase !== filters.phase) return false;
    }
    if (filters.tbDiagnosed && p.tb_diagnosed !== filters.tbDiagnosed) return false;
    if (filters.hivStatus && p.hiv_status !== filters.hivStatus) return false;
    if (filters.dateFrom || filters.dateTo) {
      const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
      if (screeningDate) {
        if (filters.dateFrom && screeningDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && screeningDate > new Date(filters.dateTo)) return false;
      }
    }
    if (filters.overdueOnly && !isOverdue(p)) return false;

    return true;
  });

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedIds(newSet);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} 
          className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Follow-up Track & Chase
            </h1>
            <p className="text-slate-600 text-sm">Monitoring {filteredPatients.length} of {totalCount.toLocaleString()} patients • Page {page} of {Math.ceil(totalCount / pageSize)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 text-sm font-medium">Live Sync</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by name or ID..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" />
          </div>
        </div>
        
        <AdvancedFilterBar
          filters={filters}
          onFilterChange={setFilters}
          states={filterOptions.states}
          districts={filterOptions.districts}
          facilityTypes={filterOptions.facilityTypes}
          isOpen={showAdvancedFilters}
          onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />
      </motion.header>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="bg-blue-500 text-white px-6 py-3 flex items-center justify-between shadow-lg">
            <span className="font-medium">{selectedIds.size} patients selected</span>
            <div className="flex gap-2">
              <button onClick={() => bulkUpdate({ xray_result: 'Normal - Not Suspected' })}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all">
                Mark CXR Normal
              </button>
              <button onClick={() => bulkUpdate({ referral_date: new Date().toISOString() })}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all">
                Refer for Sputum
              </button>
              <button onClick={() => { selectedIds.forEach(id => closeLoop(id, 'Bulk closure')); }}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-all">
                Close Loop (Not TB)
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Patient List */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => setSelectedIds(selectedIds.size === filteredPatients.length ? new Set() : new Set(filteredPatients.map(p => p.id)))}>
                        {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">District</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Facility</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Submitted On</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phase</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient, idx) => {
                    const phase = getPhase(patient);
                    const days = getDaysInPhase(patient);
                    const overdue = isOverdue(patient);
                    
                    return (
                      <motion.tr key={patient.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedPatient(patient)}
                        className={`cursor-pointer transition-all hover:bg-blue-50 ${selectedPatient?.id === patient.id ? 'bg-blue-50' : ''} ${overdue ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelect(patient.id); }}>
                            {selectedIds.has(patient.id) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {overdue && <Clock className="w-4 h-4 text-red-500" />}
                            <div>
                              <div className="font-semibold text-slate-900">{patient.inmate_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{patient.unique_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient.screening_state}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient.screening_district}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient.facility_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {patient.screening_date ? (() => {
                            const date = new Date(patient.screening_date);
                            const dd = String(date.getDate()).padStart(2, '0');
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const yy = String(date.getFullYear()).slice(-2);
                            return `${dd}/${mm}/${yy}`;
                          })() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <PhaseCell patient={patient} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>{days}d</span>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const { phase } = calculatePatientPhase(patient);
                            const statusConfig = {
                              'Screening': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Screening' },
                              'Sputum Test': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Awaiting Sputum' },
                              'Diagnosis': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Pending Diagnosis' },
                              'ATT Initiation': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Starting ATT' },
                              'Closed': { bg: 'bg-gray-100', text: 'text-gray-700', label: patient.tb_diagnosed === 'Y' ? 'Completed' : 'Not TB' }
                            };
                            const config = statusConfig[phase as keyof typeof statusConfig];
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                                {config.label}
                              </span>
                            );
                          })()}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} patients
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  First
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, Math.ceil(totalCount / pageSize)))].map((_, i) => {
                    const pageNum = Math.max(1, page - 2) + i;
                    if (pageNum > Math.ceil(totalCount / pageSize)) return null;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          page === pageNum 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Next
                </button>
                <button onClick={() => setPage(Math.ceil(totalCount / pageSize))} disabled={page >= Math.ceil(totalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Detail Drawer */}
        <AnimatePresence>
          {selectedPatient && (
            <PatientDetailDrawer
              patient={selectedPatient}
              onClose={() => setSelectedPatient(null)}
              onUpdate={fetchPatients}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
