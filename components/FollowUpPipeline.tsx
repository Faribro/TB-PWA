'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronLeft, ChevronRight, AlertCircle, ClockAlert, MapPin, List, Grid3x3, Upload, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { TBFilterToggle, type FilterMode, isSuspectedTB } from './ui/TBFilterToggle';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { useEntityStore } from '@/stores/useEntityStore';
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';
import { SpatialBreadcrumb } from './SpatialBreadcrumb';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { Button } from './ui/button';
import { createClient } from '@supabase/supabase-js';
import { Z_INDEX } from '@/lib/zIndex';
import { sounds } from '@/lib/sound';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  screening_date: string;
  submitted_on?: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  facility_name: string;
  screening_district: string;
  screening_state?: string;
  chest_x_ray_result?: string;
  xray_result?: string;
  symptoms_present?: string;
  kobo_uuid?: string;
}

interface FollowUpPipelineProps {
  patients?: Patient[];
  globalPatients?: Patient[];
  isLoading?: boolean;
  onPatientClick?: (patient: Patient) => void;
  onUploadRegister?: () => void;
}

// Task 2: Explicit Inline PatientCard Component
const PatientCard = ({ patient, onClick, canSelect, triageIds, toggleTriageSelect }: { 
  patient: Patient; 
  onClick: () => void;
  canSelect: boolean;
  triageIds: number[];
  toggleTriageSelect: (id: number) => void;
}) => {
  const phase = calculatePatientPhase(patient);
  const calculateDaysElapsed = (screeningDateStr: string | undefined) => {
    if (!screeningDateStr) return 0;
    const screeningDate = new Date(screeningDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - screeningDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysElapsed = calculateDaysElapsed(patient.screening_date);

  return (
    <motion.div
      data-tour-id="patient-card"
      layout
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 30 },
        show: { 
          opacity: 1, 
          scale: 1, 
          y: 0,
          transition: { type: "spring", stiffness: 280, damping: 22 }
        }
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,74,153,0.12)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[160px]"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {patient.inmate_name || 'Unknown Patient'}
          </h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md mt-1 inline-block">
            {patient.kobo_uuid?.substring(0, 8) || patient.unique_id?.substring(0, 8)}
          </span>
        </div>
        {canSelect && (
          <input
            type="checkbox"
            checked={triageIds.includes(patient.id)}
            onChange={(e) => { e.stopPropagation(); toggleTriageSelect(patient.id); }}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{patient.facility_name}, {patient.screening_district}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-sm ${
            phase.phase === 'Sputum Test' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
            phase.phase === 'Diagnosis' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
            phase.phase === 'ATT Initiation' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
            'bg-slate-50 text-slate-700 border border-slate-200/50'
          }`}>
            {phase.phase}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {daysElapsed}d Active
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export function FollowUpPipeline({ patients, globalPatients, isLoading = false, onPatientClick, onUploadRegister }: FollowUpPipelineProps) {
  const { filter: treeFilter, clearFilter: clearTreeFilter } = useTreeFilter();
  const activeFilters = useEntityStore(s => s.activeFilters);
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [isTriaging, setIsTriaging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [tbFilteredPatients, setTbFilteredPatients] = useState<Patient[]>([]);
  const ITEMS_PER_PAGE = 50;
  
  const patientData = globalPatients ?? patients ?? [];

  const filteredPatients = useMemo(() => {
    let filtered = patientData;

    // Apply Universal State Filter
    if (activeFilters?.state) {
      filtered = filtered.filter(p => 
        normalizeGeographicKey(p.screening_state) === normalizeGeographicKey(activeFilters.state)
      );
    }

    // Apply Universal District Filter (from Sonic) OR Tree District Filter
    const targetDistrict = activeFilters?.district || treeFilter.district;
    if (targetDistrict) {
      filtered = filtered.filter(p => 
        normalizeGeographicKey(p.screening_district) === normalizeGeographicKey(targetDistrict)
      );
    }

    if (treeFilter.date) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.toISOString().split('T')[0] === treeFilter.date;
      });
    } else if (treeFilter.month !== undefined && treeFilter.year) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.getFullYear() === treeFilter.year && pDate.getMonth() === treeFilter.month;
      });
    } else if (treeFilter.year) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.getFullYear() === treeFilter.year;
      });
    }

    if (treeFilter.actionType) {
      filtered = filtered.filter(p => {
        switch (treeFilter.actionType) {
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

    if (activeFilters?.phase) {
      filtered = filtered.filter(p => calculatePatientPhase(p).phase === activeFilters.phase);
    }

    if (activeFilters?.status === 'High Alert') {
      filtered = filtered.filter(p => {
        const isAbnormal = p.xray_result?.toLowerCase().includes('abnormal');
        const noTreatment = !p.att_start_date && !p.referral_date;
        return isAbnormal && noTreatment;
      });
    }

    // Notify Sonic of filter change
    if (treeFilter.actionType || treeFilter.date || treeFilter.district || treeFilter.year) {
      window.dispatchEvent(new CustomEvent('sonic-search', {
        detail: {
          filterType: treeFilter.actionType || 'date',
          query: treeFilter.district || treeFilter.date || `${treeFilter.year}`,
        }
      }));
    }

    return filtered;
  }, [patientData, treeFilter, activeFilters]);

  // Sync TB filter when upstream filteredPatients change
  useEffect(() => {
    setTbFilteredPatients(filteredPatients);
    setFilterMode('all');
  }, [filteredPatients]);

  // The source of truth for the patient list below the TB toggle
  const displayPatients = tbFilteredPatients.length > 0 || filterMode !== 'all'
    ? tbFilteredPatients
    : filteredPatients;

  // Task 2: Paginate filtered results
  const paginatedPatients = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return displayPatients.slice(start, end);
  }, [displayPatients, currentPage]);

  const totalPages = Math.ceil(displayPatients.length / ITEMS_PER_PAGE);

  const hasActiveFilter = treeFilter.year || treeFilter.month !== undefined || treeFilter.district || treeFilter.date || treeFilter.actionType || activeFilters?.district || activeFilters?.state || activeFilters?.phase || activeFilters?.status !== 'All';

  const canSelectForTriage = (patient: Patient): boolean => {
    const xrayResult = (patient.chest_x_ray_result || patient.xray_result || '').toLowerCase();
    const symptomsText = (patient.symptoms_present || '').toLowerCase();
    
    const hasAbnormalXray = xrayResult.includes('abnormal') ||
                           xrayResult.includes('suspected') ||
                           xrayResult.includes('tb') ||
                           xrayResult.includes('positive') ||
                           xrayResult.includes('detected') ||
                           xrayResult === 'a' ||
                           xrayResult === 's';
    
    const hasSymptoms = symptomsText && 
                       symptomsText !== '' && 
                       symptomsText !== 'none' &&
                       symptomsText !== 'no' &&
                       !symptomsText.includes('no symptoms') &&
                       symptomsText !== 'nil' &&
                       symptomsText !== 'na' &&
                       symptomsText !== 'n/a';
    
    return !hasAbnormalXray && !hasSymptoms;
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: paginatedPatients.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  const eligibleCount = useMemo(() => {
    return paginatedPatients.filter(p => canSelectForTriage(p)).length;
  }, [paginatedPatients]);

  const toggleTriageSelect = (id: number) => {
    setTriageIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const eligibleIds = paginatedPatients
      .filter(p => canSelectForTriage(p))
      .map(p => p.id);
    
    if (triageIds.length === eligibleIds.length) {
      setTriageIds([]);
    } else {
      setTriageIds(eligibleIds);
    }
  };

  const handleBulkTriage = async () => {
    setIsTriaging(true);
    sounds.primaryAction();
    const selectedPatients = paginatedPatients.filter(p => triageIds.includes(p.id));
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
      
      sounds.success();
      setTriageIds([]);
    } catch (error) {
      sounds.error();
    } finally {
      setIsTriaging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 gap-4 bg-[#F4F6F9]">
        <div className="flex items-center justify-between mb-4">
          <div className="w-1/3 h-8 bg-slate-200 animate-pulse rounded-md" />
          <div className="w-32 h-6 bg-slate-200 animate-pulse rounded-full" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-full h-[110px] bg-white border border-slate-100 rounded-xl animate-pulse shadow-sm flex flex-col justify-between p-5 mt-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="w-48 h-6 bg-slate-200 rounded mb-2" />
                <div className="w-24 h-5 bg-slate-200 rounded mb-2" />
                <div className="w-32 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-20 h-6 bg-slate-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col glass-light relative">
      <div className="p-3 border-b border-white/20 bg-white/10 backdrop-blur-md">
        {/* Inmate List Header — Compact */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
            Inmate List
          </h2>
          <div className="flex items-center gap-1.5">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-8 flex items-center text-xs font-bold text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 px-3 rounded-md shadow-sm border border-slate-300/50"
            >
              {filteredPatients.length.toLocaleString()} {hasActiveFilter ? 'filtered' : 'total'}
            </motion.div>
            {onUploadRegister && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onUploadRegister}
                className="h-8 flex items-center gap-1.5 px-3 bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 text-white rounded-md font-bold text-xs shadow-sm hover:shadow-md transition-all"
                title="Upload handwritten register for OCR extraction"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </motion.button>
            )}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md p-0.5 h-8">
              <button
                onClick={() => { sounds.toggle(); setViewMode('list'); }}
                className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { sounds.toggle(); setViewMode('grid'); }}
                className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {hasActiveFilter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl mb-4"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Active Filters:</span>
            
            {activeFilters?.state && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {activeFilters.state}
              </div>
            )}

            {(activeFilters?.district || treeFilter.district) && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {activeFilters?.district || treeFilter.district}
              </div>
            )}

            {treeFilter.actionType && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {treeFilter.actionType.charAt(0).toUpperCase() + treeFilter.actionType.slice(1)}
              </div>
            )}
            
            {treeFilter.date && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {new Date(treeFilter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            
            <button
              onClick={() => {
                clearTreeFilter();
                useEntityStore.getState().setGlobalFilter({ state: null, district: null });
              }}
              aria-label="Clear all filters"
              className="text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors ml-auto flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </motion.div>
        )}
        
        {/* Filter Toggle + Checkbox Row — Compact */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={triageIds.length > 0 && triageIds.length === eligibleCount && eligibleCount > 0}
            onChange={toggleSelectAllEligible}
            disabled={eligibleCount === 0}
            aria-label={eligibleCount === 0 ? 'No eligible patients for bulk triage' : `Select all ${eligibleCount} eligible patients`}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            title={eligibleCount === 0 ? 'No eligible patients for bulk triage' : `Select all ${eligibleCount} eligible patients`}
          />
          <TBFilterToggle
            patients={filteredPatients}
            onFilterChange={(filtered, mode) => {
              setTbFilteredPatients(filtered);
              setFilterMode(mode);
              setCurrentPage(0);
            }}
            className="mb-0 w-full max-w-[420px]"
          />
        </div>
        
        <AnimatePresence>
          {hasActiveFilter && <SpatialBreadcrumb />}
        </AnimatePresence>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 cyan-scrollbar">
        {paginatedPatients.length > 0 ? (
          viewMode === 'list' ? (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const patient = paginatedPatients[virtualRow.index];
              const phase = calculatePatientPhase(patient);
              const canSelect = canSelectForTriage(patient);

              // Phase Aging Validation
              const calculateDaysElapsed = (screeningDateStr: string | undefined) => {
                if (!screeningDateStr) return 0;
                const screeningDate = new Date(screeningDateStr);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - screeningDate.getTime());
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
              };
              const daysElapsed = calculateDaysElapsed(patient.screening_date);
              const isStalled = phase.phase !== 'Closed' && daysElapsed > 5;
              const suspectedTB = isSuspectedTB(patient);
              const normalTB = !suspectedTB;

              return (
                <div
                  key={patient.id}
                  style={{
                    position: 'absolute',
                    top: virtualRow.start,
                    left: 0,
                    right: 0,
                    padding: '4px 0',
                  }}
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: virtualRow.index * 0.03 }}
                    className={`relative rounded-xl p-4 cursor-pointer group overflow-hidden ${
                      suspectedTB 
                        ? 'bg-white border-2 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.15),0_4px_20px_-4px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.25),0_8px_30px_-4px_rgba(244,63,94,0.4)]' 
                        : normalTB
                          ? 'bg-white border-2 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.1),0_4px_15px_-4px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2),0_8px_25px_-4px_rgba(16,185,129,0.3)]'
                          : 'bg-white border border-slate-200/60 shadow-sm hover:shadow-md'
                    } transition-all duration-300`}
                  >
                    {/* Animated gradient border glow for suspected TB */}
                    {suspectedTB && (
                      <motion.div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        animate={{ 
                          boxShadow: ['inset 0 0 0 2px rgba(244,63,94,0.3)', 'inset 0 0 0 3px rgba(244,63,94,0.5)', 'inset 0 0 0 2px rgba(244,63,94,0.3)'] 
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {normalTB && !suspectedTB && (
                      <motion.div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        animate={{ 
                          boxShadow: ['inset 0 0 0 2px rgba(16,185,129,0.2)', 'inset 0 0 0 3px rgba(16,185,129,0.35)', 'inset 0 0 0 2px rgba(16,185,129,0.2)'] 
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    
                    {/* Left accent bar — dynamic by status */}
                    <div 
                      className={`absolute left-0 top-3 bottom-3 w-[4px] rounded-r-full ${
                        suspectedTB ? 'bg-gradient-to-b from-rose-500 to-rose-600' : 
                        normalTB ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' : 
                        isStalled ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    />
                    <div className="grid grid-cols-[20px_1fr_auto] gap-3 pl-3">
                      {/* Checkbox */}
                      <div className="flex items-center" title={!canSelect ? 'Requires manual follow-up: Abnormal X-Ray or Symptoms Present' : 'Select for bulk triage'}>
                        <input
                          type="checkbox"
                          checked={triageIds.includes(patient.id)}
                          onChange={(e) => { e.stopPropagation(); toggleTriageSelect(patient.id); }}
                          disabled={!canSelect}
                          aria-label={canSelect ? `Select ${patient.inmate_name} for triage` : 'Patient requires manual follow-up'}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Main content */}
                      <div
                        data-tour-id="patient-card"
                        onClick={() => onPatientClick?.(patient)}
                      >
                        {/* Row 1: Name + Stale badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-bold text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">
                            {patient.inmate_name}
                          </h3>
                          {isStalled && (
                            <div className="flex items-center gap-1 h-5 px-[7px] bg-amber-50 text-amber-700 border border-amber-200/40 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-bold tracking-wide">STALE ({daysElapsed}d)</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Row 2: ID badge */}
                        <div className="inline-flex items-center mb-1.5">
                          <span className="bg-gray-100 text-gray-700 rounded-[5px] px-[7px] py-[2px] text-[11px] font-semibold font-mono tracking-wide">
                            {patient.unique_id}
                          </span>
                        </div>
                        
                        {/* Row 3: Facility • District */}
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <span>{patient.facility_name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{patient.screening_district}</span>
                        </div>
                      </div>
                      
                      {/* Right column: Action badge + Date */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`h-[26px] px-2.5 flex items-center rounded-md text-[11px] font-bold tracking-wide uppercase ${
                          phase.phase === 'Sputum Test' ? 'bg-blue-50 text-blue-700 border border-blue-200/30' :
                          phase.phase === 'Diagnosis' ? 'bg-blue-50 text-blue-700 border border-blue-200/30' :
                          phase.phase === 'ATT Initiation' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/30' :
                          'bg-slate-50 text-slate-600 border border-slate-200/30'
                        }`}>
                          {phase.phase}
                        </span>
                        <span className="h-[22px] px-2 flex items-center bg-gray-50 text-gray-500 border border-gray-200/50 rounded-[5px] text-[11px] font-semibold">
                          {(() => {
                            const dateValue = patient.screening_date || patient.submitted_on;
                            if (!dateValue) return 'N/A';
                            const date = new Date(dateValue);
                            if (isNaN(date.getTime())) return 'Invalid';
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          })()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
          ) : (
            <motion.div 
              layout 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, delayChildren: 0.1 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4"
            >
              <AnimatePresence mode="popLayout">
                {paginatedPatients.map((patient) => (
                  <PatientCard
                    key={patient.id || patient.kobo_uuid}
                    patient={patient}
                    onClick={() => onPatientClick?.(patient)}
                    canSelect={canSelectForTriage(patient)}
                    triageIds={triageIds}
                    toggleTriageSelect={toggleTriageSelect}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : null}

        {/* Empty state for filter mode */}
        {!isLoading && tbFilteredPatients.length === 0 && filterMode !== 'all' && patientData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
              {filterMode === 'suspected' 
                ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              No {filterMode === 'suspected' ? 'Suspected TB' : 'Normal'} patients
            </p>
            <p className="text-xs text-slate-400 text-center max-w-[200px]">
              All patients in this facility fall under the 
              {filterMode === 'suspected' ? ' normal' : ' suspected TB'} category
            </p>
          </motion.div>
        )}

        {/* Empty state — no patients at all */}
        {!isLoading && (!patientData || patientData.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mb-3">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5"/><path d="m22 8-5 5"/>
              </svg>
              <div className="text-slate-500 text-lg font-semibold mb-1">No patients found</div>
              <div className="text-slate-400 text-sm">
                {hasActiveFilter ? 'We couldn\'t find any patients matching your filters.' : 'There are currently no patients in the pipeline.'}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Task 2: Pagination Controls */}
      {filteredPatients.length > ITEMS_PER_PAGE && (
        <div className="border-t border-white/20 bg-white/10 backdrop-blur-md p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600">
            Page {currentPage + 1} of {totalPages} • Showing {paginatedPatients.length} of {displayPatients.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { sounds.buttonClick(); setCurrentPage(p => Math.max(0, p - 1)); }}
              disabled={currentPage === 0}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              onClick={() => { sounds.buttonClick(); setCurrentPage(p => Math.min(totalPages - 1, p + 1)); }}
              disabled={currentPage === totalPages - 1}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {triageIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            style={{ zIndex: Z_INDEX.modal }}
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
                    className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_0_#047857,0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_0_#047857,0_12px_24px_rgba(16,185,129,0.5)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#047857] active:translate-y-1.5 transition-all font-bold"
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
  );
}
