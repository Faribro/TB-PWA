'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronLeft, ChevronRight, AlertCircle, ClockAlert, MapPin, List, Grid3x3, Upload, AlertTriangle, ShieldCheck, Clock, Lock, Unlock, ChevronDown, ChevronUp, Search, ArrowRightCircle, Activity, Pill, ClipboardList, CheckCircle2 } from 'lucide-react';
import { PatientJourneyCompact } from './ui/PatientJourneyCompact';
import { TBFilterToggle, type FilterMode, isSuspectedTB } from './ui/TBFilterToggle';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { useEntityStore } from '@/stores/useEntityStore';
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';
import { SpatialBreadcrumb } from './SpatialBreadcrumb';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { Button } from './ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Z_INDEX } from '@/lib/zIndex';
import { sounds } from '@/lib/sound';
import { useRealtimePatients } from '@/lib/useRealtimePatients';

const supabase = getSupabaseBrowserClient();

interface Patient {
  id: number;
  unique_id: string;
  inmate_id?: string;
  inmate_name: string;
  screening_date: string;
  submitted_on?: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  date_of_tb_diagnosed?: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
  att_completed?: string | null;
  nikshay_id?: string | null;
  facility_name: string;
  screening_district: string;
  district?: string;
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

  const isStalled = phase.phase !== 'Closed' && daysElapsed > 5;
  const suspectedTB = patient.xray_result === 'Suspected TB Case';
  const normalTB = !suspectedTB;

  // Clinical progress calculation
  const clinicalSections = [
    {
      id: 'sputum',
      title: 'Sputum',
      isComplete: Boolean(patient.referral_date),
    },
    {
      id: 'diagnosis',
      title: 'Diagnosis',
      isComplete: Boolean(patient.tb_diagnosed && patient.date_of_tb_diagnosed),
    },
    {
      id: 'treatment',
      title: 'Treatment',
      isComplete: Boolean(patient.att_start_date),
    },
    {
      id: 'nikshay',
      title: 'Nikshay',
      isComplete: Boolean(patient.nikshay_id),
    },
  ];

  const completedCount = clinicalSections.filter(s => s.isComplete).length;
  const totalCount = clinicalSections.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <div
      data-tour-id="patient-card"
      onClick={onClick}
      className={`relative rounded-2xl p-5 cursor-pointer group overflow-hidden transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl min-h-[160px] flex flex-col justify-between ${
        suspectedTB 
          ? 'bg-gradient-to-br from-rose-50/80 to-pink-50/60 border border-rose-300/60 hover:border-rose-400/80 hover:shadow-rose-200/50' 
          : normalTB
            ? 'bg-gradient-to-br from-emerald-50/80 to-green-50/60 border border-emerald-300/60 hover:border-emerald-400/80 hover:shadow-emerald-200/50'
            : 'bg-gradient-to-br from-white/90 to-gray-50/80 border border-gray-300/60 hover:border-gray-400/80 hover:shadow-gray-200/50'
      } backdrop-blur-sm`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
      
      {/* Left accent bar — dynamic by status */}
      <div 
        className={`absolute left-0 top-4 bottom-4 w-[6px] rounded-r-full shadow-lg ${
          suspectedTB ? 'bg-gradient-to-b from-rose-500 to-rose-600 shadow-rose-500/50' : 
          normalTB ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-500/50' : 
          isStalled ? 'bg-gradient-to-b from-amber-500 to-amber-600 shadow-amber-500/50' : 'bg-gradient-to-b from-gray-400 to-gray-500 shadow-gray-400/50'
        }`}
      />

      <div className="flex justify-between items-start mb-4 pl-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {patient.inmate_name || 'Unknown Patient'}
            </h3>
            {isStalled && (
              <div className="flex items-center gap-1 h-5 px-[7px] bg-amber-50 text-amber-700 border border-amber-200/40 rounded-full">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-bold tracking-wide">STALE</span>
              </div>
            )}
          </div>
          <span className="text-[11px] font-mono font-semibold tracking-wide text-slate-500 bg-slate-100 px-2 py-1 rounded-[5px] mt-1 inline-block">
            {patient.unique_id || patient.kobo_uuid?.substring(0, 8)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canSelect && (
            <input
              type="checkbox"
              checked={triageIds.includes(patient.id)}
              onChange={(e) => { e.stopPropagation(); toggleTriageSelect(patient.id); }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
              title="Select for bulk triage"
            />
          )}
          <PatientJourneyCompact patient={patient} />
        </div>
      </div>

      <div className="space-y-3 pl-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center">
            <MapPin className="w-3 h-3" />
          </div>
          <span className="truncate">{patient.facility_name} &bull; {patient.screening_district}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`px-2.5 py-[3px] rounded bg-white text-[10px] font-bold tracking-widest uppercase shadow-sm ${
            phase.phase === 'Sputum Test' ? 'text-blue-700 border border-blue-200/50' :
            phase.phase === 'Diagnosis' ? 'text-blue-700 border border-blue-200/50' :
            phase.phase === 'ATT Initiation' ? 'text-emerald-700 border border-emerald-200/50' :
            'text-slate-600 border border-slate-200/50'
          }`}>
            {phase.phase}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            {daysElapsed}d Active
          </span>
        </div>

        {/* Compact Clinical Progress */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Care Journey</span>
            <span className={`text-[10px] font-black ${completedCount === totalCount ? 'text-emerald-600' : 'text-amber-600'}`}>
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="flex gap-1">
            {clinicalSections.map((sec) => (
              <div
                key={sec.id}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  sec.isComplete ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                title={`${sec.title}: ${sec.isComplete ? 'Complete' : 'Pending'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export function FollowUpPipeline({ patients: initialPatients, globalPatients, isLoading = false, onPatientClick, onUploadRegister }: FollowUpPipelineProps) {
  const { filter: treeFilter, clearFilter: clearTreeFilter } = useTreeFilter();
  const activeFilters = useEntityStore(s => s.activeFilters);
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [isTriaging, setIsTriaging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [advancedFilters, setAdvancedFilters] = useState({
    name: '',
    facility: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    district: '',
    gender: '',
    ageMin: '',
    ageMax: ''
  });
  const [tbFilteredPatients, setTbFilteredPatients] = useState<Patient[]>([]);
  const ITEMS_PER_PAGE = 50;
  
  // Local state for patients (updated via realtime)
  const [patients, setPatients] = useState<Patient[]>(
    globalPatients ?? initialPatients ?? []
  );

  // DEBUG: Log patient data flow
  console.log('FollowUpPipeline DEBUG - initialPatients:', initialPatients?.length);
  console.log('FollowUpPipeline DEBUG - patients state:', patients.length);

  
  // Realtime subscription — live patient list updates
  const realtimeStatus = useRealtimePatients({
    showToasts: true,
    filterState: activeFilters?.state,
    onInsert: (newPatient) => {
      setPatients(prev => {
        if (prev.some(p => p.id === newPatient.id)) return prev;
        return [newPatient as unknown as Patient, ...prev];
      });
    },
    onUpdate: (updated) => {
      setPatients(prev =>
        prev.map(p => p.id === updated.id ? updated as unknown as Patient : p)
      );
    },
    onDelete: (deletedId) => {
      setPatients(prev => prev.filter(p => p.id !== Number(deletedId)))
    }
  });
  
  const patientData = patients;

  // DEBUG: Log patientData
  console.log('FollowUpPipeline DEBUG - patientData length:', patientData.length);

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

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.inmate_name?.toLowerCase().includes(query)) ||
        (p.facility_name?.toLowerCase().includes(query)) ||
        (p.kobo_uuid?.toLowerCase().includes(query)) ||
        (p.inmate_id?.toString().includes(query))
      );
    }

    if (advancedFilters.name) {
      const nameQuery = advancedFilters.name.toLowerCase();
      filtered = filtered.filter(p => 
        p.inmate_name?.toLowerCase().includes(nameQuery)
      );
    }

    if (advancedFilters.facility) {
      const facilityQuery = advancedFilters.facility.toLowerCase();
      filtered = filtered.filter(p => 
        p.facility_name?.toLowerCase().includes(facilityQuery)
      );
    }

    if (advancedFilters.district) {
      const districtQuery = advancedFilters.district.toLowerCase();
      filtered = filtered.filter(p => 
        p.district?.toLowerCase().includes(districtQuery)
      );
    }

    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        return new Date(dateValue) >= new Date(advancedFilters.dateFrom);
      });
    }

    if (advancedFilters.dateTo) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        return new Date(dateValue) <= new Date(advancedFilters.dateTo);
      });
    }

    if (advancedFilters.status) {
      filtered = filtered.filter(p => {
        switch (advancedFilters.status) {
          case 'suspected':
            return isSuspectedTB(p);
          case 'normal':
            return !isSuspectedTB(p);
          case 'completed':
            return p.att_completed === 'Y';
          default:
            return true;
        }
      });
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

    // DEBUG: Log final filtered result
    console.log('FollowUpPipeline DEBUG - final filtered patients:', filtered.length);
    
    return filtered;
  }, [patientData, treeFilter, activeFilters, searchQuery, advancedFilters]);

  // Sync TB filter when upstream filteredPatients change
  useEffect(() => {
    setTbFilteredPatients(filteredPatients);
    setFilterMode('all');
  }, [filteredPatients]);

  // The source of truth for the patient list below the TB toggle
  const displayPatients = useMemo(() => {
    let patients = tbFilteredPatients.length > 0 || filterMode !== 'all'
      ? tbFilteredPatients
      : filteredPatients;
    
    // DEBUG: Log displayPatients
    console.log('FollowUpPipeline DEBUG - displayPatients length:', patients.length);
    
    return patients;
  }, [tbFilteredPatients, filteredPatients, filterMode]);

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
          <div className="flex items-center gap-2">
            {/* Enhanced Search Bar */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search patients by name, facility, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-10 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md text-sm"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    showAdvancedFilters 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Advanced Filters"
                >
                  <Filter className="w-3 h-3" />
                </button>
              </div>
            </div>
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
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { sounds.toggle(); setViewMode('grid'); }}
                className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Modal */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={advancedFilters.name}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="Search name..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
                  <input
                    type="text"
                    value={advancedFilters.facility}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, facility: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="Search facility..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    value={advancedFilters.district}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, district: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="Search district..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="suspected">Suspected TB</option>
                    <option value="normal">Normal</option>
                    <option value="completed">ATT Completed</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setAdvancedFilters({
                      name: '',
                      facility: '',
                      dateFrom: '',
                      dateTo: '',
                      status: '',
                      district: '',
                      gender: '',
                      ageMin: '',
                      ageMax: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
        
        {/* Applied Filters Display */}
        {(searchQuery || Object.values(advancedFilters).some(v => v)) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60">
            <span className="text-sm font-semibold text-blue-900">Active Filters:</span>
            {searchQuery && (
              <div className="bg-white border border-blue-300 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                <Search className="w-3 h-3" />
                {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setAdvancedFilters({
                  name: '',
                  facility: '',
                  dateFrom: '',
                  dateTo: '',
                  status: '',
                  district: '',
                  gender: '',
                  ageMin: '',
                  ageMax: ''
                });
              }}
              className="text-xs font-medium text-blue-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors ml-auto flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          </div>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-slate-50/40 via-white to-blue-50/30 relative min-h-[500px]">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-rose-400/10 to-orange-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-3xl" />
        </div>
        {displayPatients.length > 0 ? (
          viewMode === 'list' ? (
            <div className="h-full">
              <FiveColumnListView
                patients={displayPatients}
                onPatientClick={onPatientClick}
                isSuspectedTB={isSuspectedTB}
                calculatePatientPhase={calculatePatientPhase}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {displayPatients.map((patient) => (
                <PatientCard
                  key={patient.id || patient.kobo_uuid}
                  patient={patient}
                  onClick={() => onPatientClick?.(patient)}
                  canSelect={canSelectForTriage(patient)}
                  triageIds={triageIds}
                  toggleTriageSelect={toggleTriageSelect}
                />
              ))}
            </div>
          )
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500">No patients found</p>
            </div>
          )
        )}

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

// ─── Two Column List View Component ──────────────────────────────────────
interface TwoColumnListViewProps {
  patients: Patient[];
  onPatientClick?: (patient: Patient) => void;
  isSuspectedTB: (p: Patient) => boolean;
  calculatePatientPhase: (p: Patient) => { phase: string };
}

function FiveColumnListView({ patients, onPatientClick, isSuspectedTB }: TwoColumnListViewProps) {
  // Split into 5 columns
  const fifth = Math.ceil(patients.length / 5);
  const col1 = patients.slice(0, fifth);
  const col2 = patients.slice(fifth, fifth * 2);
  const col3 = patients.slice(fifth * 2, fifth * 3);
  const col4 = patients.slice(fifth * 3, fifth * 4);
  const col5 = patients.slice(fifth * 4);

  // Column refs for potential future scroll features
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLDivElement>(null);
  const col4Ref = useRef<HTMLDivElement>(null);
  const col5Ref = useRef<HTMLDivElement>(null);

  // Removed auto-scroll to prevent rendering issues

  const MiniCard = ({ patient }: { patient: Patient }) => {
    const suspected = isSuspectedTB(patient);
    
    return (
      <div
        onClick={() => onPatientClick?.(patient)}
        className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
          suspected
            ? 'bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 hover:border-rose-300 hover:shadow-lg'
            : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
        }`}
      >
        {/* Status indicator line */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
            suspected 
              ? 'bg-gradient-to-b from-rose-400 to-rose-600' 
              : 'bg-gradient-to-b from-emerald-400 to-emerald-600'
          }`}
        />
        
        <div className="flex items-center justify-between gap-2 pl-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {patient.inmate_name || 'No Name'}
            </h4>
            <p className="text-[10px] text-gray-600 truncate">
              {patient.facility_name || 'No Facility'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {suspected && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                TB
              </span>
            )}
            <span className="text-[8px] text-gray-500 font-medium bg-gray-50 px-1.5 py-0.5 rounded">
              {patient.screening_date ? 
                new Date(patient.screening_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 
                'No Date'
              }
            </span>
          </div>
        </div>
      </div>
    );
  };

  const Column = ({ title, patients, count, scrollRef }: { 
    title: string; 
    patients: Patient[]; 
    count: number; 
    scrollRef: React.RefObject<HTMLDivElement>;
  }) => {
    return (
      <div className="flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-gray-700 uppercase">{title}</span>
          </div>
          <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {count}
          </span>
        </div>
        
        {/* Scroll container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 space-y-2"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {patients.map((patient, index) => (
            <MiniCard key={`${title}-${patient.id}-${index}`} patient={patient} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full grid grid-cols-5 gap-3 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
      <Column title="C1" patients={col1} count={col1.length} scrollRef={col1Ref} />
      <Column title="C2" patients={col2} count={col2.length} scrollRef={col2Ref} />
      <Column title="C3" patients={col3} count={col3.length} scrollRef={col3Ref} />
      <Column title="C4" patients={col4} count={col4.length} scrollRef={col4Ref} />
      <Column title="C5" patients={col5} count={col5.length} scrollRef={col5Ref} />
    </div>
  );
}
