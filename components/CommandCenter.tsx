'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, Calendar, CheckCircle, MapPin, Search, Check, X, ChevronRight, Clock, Filter, CheckSquare, Square, Grid3X3, List, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import { PatientDetailDrawer } from './PatientDetailDrawer';
import { PatientTile } from './PatientTile';
import { PhaseCell } from './PhaseCell';
import { AdvancedFilterBar, type FilterState } from './AdvancedFilterBar';
import AnalyticsOverview from './AnalyticsOverview';
import ThreeBackground from './ThreeBackground';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { Button } from './ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { useSWRPatients, useSWRAllPatients, useSWRFilterMetadata } from '@/hooks/useSWRPatients';
import { createClient } from '@supabase/supabase-js';
import { LinesAndDotsLoader } from './LinesAndDotsLoader';

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
  submitted_on?: string;
  xray_result: string;
  chest_x_ray_result?: string;
  symptoms_present?: string;
  kobo_uuid?: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  hiv_status: string | null;
  att_start_date: string | null;
  att_completion_date: string | null;
  risk_score: number;
  age: number;
  sex: string;
  created_at: string;
  current_phase?: string;
}

const PHASES = [
  { id: 1, name: 'Screening', icon: AlertTriangle, color: 'amber' },
  { id: 2, name: 'Sputum Test', icon: Activity, color: 'blue' },
  { id: 3, name: 'Diagnosis', icon: Calendar, color: 'purple' },
  { id: 4, name: 'ATT Initiation', icon: CheckCircle, color: 'green' },
  { id: 5, name: 'Closed', icon: CheckCircle, color: 'gray' }
];

interface FilterMetadata {
  states: string[];
  locationMap: Map<string, string[]>;
  facilityTypes: string[];
}

interface CommandCenterProps {
  globalPatients?: any[];
  isLoading?: boolean;
  initialFilter?: any;
}

export default memo(function CommandCenter({ globalPatients = [], isLoading = false, initialFilter }: CommandCenterProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [isTriaging, setIsTriaging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
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
  const [showDashboard, setShowDashboard] = useState(true);
  const [sortBy, setSortBy] = useState('submitted_on');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Mock user session - replace with actual auth
  const userRole = 'State M&E';
  const userState = undefined; // Set to 'Maharashtra' to test state filtering

  // SWR hooks with state-based security - REMOVED: useSWRPatients call
  // Now using globalPatients prop directly from parent
  const { data: filterMetadata } = useSWRFilterMetadata(userState);

  // Dummy mutate function for compatibility
  const mutate = async () => {};
  const totalCount = globalPatients.length;

  // Define isSLABreach before using it
  const isSLABreach = useCallback((patient: Patient): boolean => {
    const submittedDate = patient.submitted_on || patient.screening_date;
    if (!submittedDate) return false;
    const daysSince = (Date.now() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24);
    const phase = (patient.current_phase || '').toLowerCase();
    return daysSince > 7 && !phase.includes('treatment') && !phase.includes('closed');
  }, []);

  // Client-side filters with Spark filter logic
  const patients = useMemo(() => {
    let filtered = globalPatients;
    
    // Apply Spark filter (actionType)
    if (initialFilter?.actionType) {
      filtered = filtered.filter(p => {
        switch (initialFilter.actionType) {
          case 'sputum':
            return !p.referral_date;
          case 'diagnosis':
            return p.referral_date && !p.tb_diagnosed;
          case 'treatment':
            return p.tb_diagnosed === 'Y' && !p.att_start_date;
          case 'admin':
            return true;
          default:
            return true;
        }
      });
    }
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.inmate_name?.toLowerCase().includes(searchLower) ||
        p.unique_id?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply other filters
    filtered = filtered.filter(p => {
      if (filters.state && p.screening_state !== filters.state) return false;
      if (filters.district && p.screening_district !== filters.district) return false;
      if (filters.facilityType && p.facility_type !== filters.facilityType) return false;
      if (filters.tbDiagnosed && p.tb_diagnosed !== filters.tbDiagnosed) return false;
      if (filters.hivStatus && p.hiv_status !== filters.hivStatus) return false;
      if (filters.phase && calculatePatientPhase(p).phase !== filters.phase) return false;
      if (filters.overdueOnly && !isSLABreach(p)) return false;
      return true;
    });
    
    return filtered;
  }, [globalPatients, debouncedSearch, filters, isSLABreach, initialFilter]);

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
      mutate();
      if (selectedPatient?.id === id) setSelectedPatient({ ...selectedPatient, ...updates });
    }
  };

  const bulkUpdate = async (updates: Partial<Patient>) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => supabase.from('patients').update(updates).eq('id', id)));
    mutate();
    setSelectedIds(new Set());
  };

  // Paginate the filtered patients
  const paginatedPatients = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return patients.slice(startIndex, endIndex);
  }, [patients, page, pageSize]);
  
  const filteredPatients = paginatedPatients;
  const displayTotalCount = patients.length;

  const canSelectForTriage = useCallback((patient: Patient): boolean => {
    const xrayResult = (patient.chest_x_ray_result || patient.xray_result || '').toLowerCase();
    const symptomsText = (patient.symptoms_present || '').toLowerCase();
    
    const isNormalXray = xrayResult.includes('normal') || 
                         xrayResult.includes('not-detected') || 
                         xrayResult.includes('latent') || 
                         xrayResult === 'l';
    
    const noSymptoms = !symptomsText || 
                       symptomsText === '' || 
                       symptomsText.includes('no symptoms') || 
                       symptomsText === 'none';
    
    const canSelect = isNormalXray && noSymptoms;
    
    console.log('Patient triage check:', patient.inmate_name, {
      xrayResult: patient.chest_x_ray_result || patient.xray_result,
      symptomsPresent: patient.symptoms_present,
      isNormalXray,
      noSymptoms,
      canSelect
    });
    
    return canSelect;
  }, []);

  const eligibleCount = useMemo(() => {
    return filteredPatients.filter(p => canSelectForTriage(p)).length;
  }, [filteredPatients, canSelectForTriage]);

  const toggleTriageSelect = (id: number) => {
    setTriageIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const eligibleIds = filteredPatients
      .filter(p => canSelectForTriage(p))
      .map(p => p.id);
    
    if (triageIds.length === eligibleIds.length && eligibleIds.length > 0) {
      setTriageIds([]);
    } else {
      setTriageIds(eligibleIds);
    }
  };

  const handleBulkTriage = async () => {
    setIsTriaging(true);
    const selectedPatients = patients.filter(p => triageIds.includes(p.id));
    const uuidsToSync = selectedPatients.map(p => p.kobo_uuid).filter(Boolean);
    
    try {
      await Promise.all([
        supabase
          .from('patients')
          .update({ 
            tb_diagnosed: 'No',
            current_phase: 'Closed (Not TB)',
            is_active: false
          })
          .in('id', triageIds),
        
        fetch('/api/triage-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bulk_triage',
            uuids: uuidsToSync
          })
        })
      ]);
      
      setTriageIds([]);
      mutate();
    } finally {
      setIsTriaging(false);
    }
  };



  const closeLoop = async (id: number, reason: string) => {
    await updatePatient(id, { tb_diagnosed: 'No', referral_date: new Date().toISOString(), att_start_date: null });
  };

  const getPhase = (p: Patient): number => {
    const { phaseIndex } = calculatePatientPhase(p);
    return phaseIndex + 1; // Convert 0-4 to 1-5 for UI compatibility
  };

  const getDaysInPhase = (p: Patient): number => {
    const date = p.submitted_on || p.referral_date || p.screening_date;
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (p: Patient): boolean => {
    const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
    const daysSinceScreening = screeningDate ? 
      Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return !p.referral_date && daysSinceScreening > 30;
  };

  const availableDistricts = filters.state 
    ? filterMetadata?.locationMap.get(filters.state) || [] 
    : [];

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedIds(newSet);
  };

  if (isLoading && globalPatients.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LinesAndDotsLoader progress={75} />
      </div>
    );
  }

  return (
    <>
      <ThreeBackground />
      <div className="h-screen flex flex-col relative z-10">
      {/* Header */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900/40 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Inmate Track and Chase
            </h1>
            <p className="text-slate-300 text-sm">Monitoring {totalCount.toLocaleString()} patients • Showing {displayTotalCount.toLocaleString()} • Page {page} of {Math.ceil(displayTotalCount / pageSize)}{initialFilter?.actionType && ` • Filter: ${initialFilter.actionType}`}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-600">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={() => setShowDashboard(!showDashboard)}
              variant="outline"
              size="sm"
              className="bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400 shadow-lg font-bold"
            >
              {showDashboard ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showDashboard ? 'Hide' : 'Show'} Dashboard
            </Button>
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" />
          </div>
          
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant="outline"
            className={`transition-all border-2 ${
              showAdvancedFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-md' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).filter(v => v && v !== false).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {Object.values(filters).filter(v => v && v !== false).length}
              </span>
            )}
          </Button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
          >
            <option value="submitted_on">Sort: Submitted Date</option>
            <option value="screening_date">Sort: Screening Date</option>
            <option value="inmate_name">Sort: Name</option>
          </select>
        </div>
        
        <AdvancedFilterBar
          filters={filters}
          onFilterChange={setFilters}
          states={filterMetadata?.states || []}
          districts={availableDistricts}
          facilityTypes={filterMetadata?.facilityTypes || []}
          isOpen={showAdvancedFilters}
          searchTerm={searchTerm}
        />
      </motion.header>

      {showDashboard && (
        <div className="px-6" style={{ willChange: 'auto' }}>
          <AnalyticsOverview patients={globalPatients} totalCount={globalPatients.length || totalCount} isSLABreach={isSLABreach} />
        </div>
      )}

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
          {viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPatients.slice(0, 50).map((patient, idx) => (
                <PatientTile
                  key={patient.id}
                  patient={patient}
                  onClick={() => setSelectedPatient(patient)}
                  index={idx}
                />
              ))}
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 flex items-center justify-between bg-white rounded-xl px-6 py-4 shadow-sm">
              <div className="text-sm text-slate-600">
                Showing {displayTotalCount > 0 ? ((page - 1) * pageSize) + 1 : 0} to {Math.min(page * pageSize, displayTotalCount)} of {displayTotalCount.toLocaleString()} patients
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
                  {[...Array(Math.min(5, Math.ceil(displayTotalCount / pageSize)))].map((_, i) => {
                    const pageNum = Math.max(1, page - 2) + i;
                    if (pageNum > Math.ceil(displayTotalCount / pageSize)) return null;
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
                <button onClick={() => setPage(p => Math.min(Math.ceil(displayTotalCount / pageSize), p + 1))} disabled={page >= Math.ceil(displayTotalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Next
                </button>
                <button onClick={() => setPage(Math.ceil(displayTotalCount / pageSize))} disabled={page >= Math.ceil(displayTotalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Last
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={triageIds.length > 0 && triageIds.length === eligibleCount && eligibleCount > 0}
                        onChange={toggleSelectAllEligible}
                        disabled={eligibleCount === 0}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={eligibleCount === 0 ? 'No eligible patients for bulk triage' : `Select all ${eligibleCount} eligible patients`}
                      />
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
                    const canSelect = canSelectForTriage(patient);
                    
                    return (
                      <motion.tr key={patient.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedPatient(patient)}
                        className={`cursor-pointer transition-all hover:bg-blue-50 ${selectedPatient?.id === patient.id ? 'bg-blue-50' : ''} ${overdue ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div title={!canSelect ? 'Requires manual follow-up: Abnormal X-Ray or Symptoms Present' : ''}>
                            <input
                              type="checkbox"
                              checked={triageIds.includes(patient.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleTriageSelect(patient.id);
                              }}
                              disabled={!canSelect}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>
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
            
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing {displayTotalCount > 0 ? ((page - 1) * pageSize) + 1 : 0} to {Math.min(page * pageSize, displayTotalCount)} of {displayTotalCount.toLocaleString()} patients
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
                  {[...Array(Math.min(5, Math.ceil(displayTotalCount / pageSize)))].map((_, i) => {
                    const pageNum = Math.max(1, page - 2) + i;
                    if (pageNum > Math.ceil(displayTotalCount / pageSize)) return null;
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
                <button onClick={() => setPage(p => Math.min(Math.ceil(displayTotalCount / pageSize), p + 1))} disabled={page >= Math.ceil(displayTotalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Next
                </button>
                <button onClick={() => setPage(Math.ceil(displayTotalCount / pageSize))} disabled={page >= Math.ceil(displayTotalCount / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 hover:bg-slate-50">
                  Last
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Patient Detail Drawer */}
        <AnimatePresence>
          {selectedPatient && (
            <PatientDetailDrawer
              patient={selectedPatient}
              isOpen={!!selectedPatient}
              onClose={() => setSelectedPatient(null)}
              onUpdate={mutate}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating Triage Action Bar */}
      <AnimatePresence>
        {triageIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl px-6 py-4">
              {isTriaging ? (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </motion.div>
                  <div className="text-sm font-medium text-slate-700">
                    Syncing {triageIds.length} patients to Master Database...
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-slate-700">
                    {triageIds.length} patient{triageIds.length > 1 ? 's' : ''} selected
                  </div>
                  <Button
                    onClick={handleBulkTriage}
                    disabled={isTriaging}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
                  >
                    Mark as Not TB ({triageIds.length} Patient{triageIds.length > 1 ? 's' : ''})
                  </Button>
                  <Button
                    onClick={() => setTriageIds([])}
                    variant="ghost"
                    disabled={isTriaging}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
});



