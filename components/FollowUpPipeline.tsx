'use client';

import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronLeft, ChevronRight, AlertCircle, ClockAlert, MapPin, List, Grid3x3, Upload, AlertTriangle, ShieldCheck, Clock, Lock, Unlock, ChevronDown, ChevronUp, Search, ArrowRightCircle, Activity, Pill, ClipboardList, CheckCircle2 } from 'lucide-react';
import { PatientJourneyCompact } from './ui/PatientJourneyCompact';
import { TBFilterToggle, type FilterMode, isSuspectedTB, isTBDiagnosed, isATTInitiated, isATTCompleted } from './ui/TBFilterToggle';
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

// Function to get dynamic location text based on filters
function getLocationText(displayPatients: Patient[]) {
  const activeFilters = useEntityStore.getState().activeFilters;
  
  // Priority 1: Use active filters if available
  if (activeFilters?.state && activeFilters?.district) {
    return `${activeFilters.state}, ${activeFilters.district}`;
  } else if (activeFilters?.state) {
    return activeFilters.state;
  }
  
  // Priority 2: Derive from display patients (facility-scoped or date-scoped)
  if (displayPatients && displayPatients.length > 0) {
    const firstPatient = displayPatients[0];
    const state = firstPatient.screening_state || firstPatient.state || 'Unknown';
    const district = firstPatient.screening_district || firstPatient.district || 'Unknown';
    return `${state}, ${district}`;
  }
  
  return 'All Locations';
}

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
  state?: string;
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
  extraHeaderButtons?: React.ReactNode;
}

// Helper function to get the most recent clinical date for display
const getMostRecentClinicalDate = (patient: Patient) => {
  const dates = [];
  
  if (patient.screening_date) dates.push(new Date(patient.screening_date));
  if (patient.referral_date) dates.push(new Date(patient.referral_date));
  if (patient.date_of_tb_diagnosed) dates.push(new Date(patient.date_of_tb_diagnosed));
  if (patient.att_start_date) dates.push(new Date(patient.att_start_date));
  if (patient.att_completion_date) dates.push(new Date(patient.att_completion_date));
  
  if (dates.length === 0) return null;
  
  // Sort dates in descending order and return the most recent
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates[0];
};

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
    const now = new Date();
    const date = new Date(screeningDateStr);
    const diffTime = Math.abs(now.getTime() - date.getTime());
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

export function FollowUpPipeline({ patients: initialPatients, globalPatients, isLoading = false, onPatientClick, onUploadRegister, extraHeaderButtons }: FollowUpPipelineProps) {
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

  // Sync with prop changes
  useEffect(() => {
    const newPatients = globalPatients ?? initialPatients ?? [];
    if (newPatients.length > 0) {
      setPatients(newPatients);
    }
  }, [globalPatients, initialPatients]);



  
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
      setPatients(prev => {
        const newList = prev.map(p => p.id === updated.id ? updated as unknown as Patient : p);
        // Also update the patient if drawer is open
        if (onPatientClick) {
          // Trigger parent component to refresh
          window.dispatchEvent(new CustomEvent('patient-updated', { detail: updated }));
        }
        return newList;
      });
    },
    onDelete: (deletedId) => {
      setPatients(prev => prev.filter(p => p.id !== Number(deletedId)))
    }
  });
  
  const patientData = patients;

  const filteredPatients = useMemo(() => {
    let filtered = patientData;

    // Apply Universal State Filter
    if (activeFilters?.state) {
      filtered = filtered.filter(p => {
        const patientState = normalizeGeographicKey(p.screening_state);
        const filterState = normalizeGeographicKey(activeFilters.state);
        return patientState === filterState;
      });
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
      <div 
        className="h-full flex flex-col p-6 gap-4"
        style={{ background: '#fafafa' }}
      >
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer {
            background: linear-gradient(90deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
        `}</style>
        {/* Glassmorphism Header Skeleton */}
        <div 
          className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)',
          }}
        >
          <div className="w-1/3 h-8 shimmer rounded-md" />
          <div className="w-32 h-6 shimmer rounded-full" />
        </div>
        
        {/* Premium Card Skeletons */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="w-full h-[110px] rounded-xl flex flex-col justify-between p-5 mt-2 shimmer"
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="w-48 h-6 bg-slate-200/50 rounded mb-2" />
                <div className="w-24 h-5 bg-slate-200/50 rounded mb-2" />
                <div className="w-32 h-4 bg-slate-200/50 rounded" />
              </div>
              <div className="w-20 h-6 bg-slate-200/50 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: '#fafafa' }}>
      {/* Animated Gradient Mesh Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(6,182,212,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 80%, rgba(99,102,241,0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 10% 70%, rgba(244,63,94,0.04) 0%, transparent 35%)
          `,
        }}
      />
      
      
      {/* Glassmorphism Header */}
      <div 
        className="px-4 py-3 border-b relative z-10"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {/* Animated Statistics Sentence and Controls - Awwwards Premium Theme */}
        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes borderGlow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .premium-gradient-text {
            background: linear-gradient(90deg, #06b6d4, #0891b2, #06b6d4, #22d3ee);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 4s ease infinite;
            filter: drop-shadow(0 0 12px rgba(6,182,212,0.5));
          }
          .premium-gradient-amber {
            background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b, #d97706);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease infinite;
            filter: drop-shadow(0 0 10px rgba(245,158,11,0.45));
          }
          .premium-gradient-rose {
            background: linear-gradient(90deg, #f43f5e, #fb7185, #f43f5e, #e11d48);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3.5s ease infinite;
            filter: drop-shadow(0 0 12px rgba(244,63,94,0.55));
          }
          .premium-location {
            position: relative;
            color: #b45309;
            font-weight: 800;
            letter-spacing: 0.02em;
          }
          .premium-location::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: -4px;
            right: -4px;
            height: 3px;
            background: linear-gradient(90deg, transparent, #fbbf24, #f59e0b, #fbbf24, transparent);
            border-radius: 3px;
            box-shadow: 0 0 12px rgba(245,158,11,0.7), 0 0 24px rgba(251,191,36,0.4), 0 0 36px rgba(245,158,11,0.2);
            animation: borderGlow 2s ease-in-out infinite;
          }
          .glass-card {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.5);
            box-shadow: 
              0 1px 2px rgba(0,0,0,0.02),
              0 4px 8px rgba(0,0,0,0.03),
              0 8px 16px rgba(0,0,0,0.03),
              0 16px 32px rgba(0,0,0,0.02),
              inset 0 1px 0 rgba(255,255,255,0.8);
          }
          .shimmer-bg {
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
          }
          .content-optimized {
            content-visibility: auto;
            contain: layout style paint;
          }
          .cards-container {
            content-visibility: auto;
            contain: layout style;
          }
        `}</style>
        <div className="flex items-center justify-between gap-6 w-full">
          {/* Statistics Sentence - Left Side with Neon Emphasis */}
          <HeaderStats displayPatients={displayPatients} />
          
          {/* Centered Search Bar and Controls */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Premium Glassmorphism Search Bar */}
            <div className="relative group">
              <Search 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 w-4 h-4" 
                style={{ color: 'rgba(107,114,128,0.8)' }}
              />
              <input
                type="text"
                placeholder="Search inmates by name, ID, or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[320px] pl-11 pr-11 py-2.5 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-300 text-sm font-medium"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,1)';
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(6,182,212,0.12), 0 0 0 3px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.9)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)';
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    showAdvancedFilters 
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title="Advanced Filters"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {onUploadRegister && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onUploadRegister}
                className="h-10 flex items-center gap-1.5 px-4 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-xl font-bold text-xs transition-all border border-amber-400/50"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1), 0 0 0 1px rgba(245,158,11,0.4), 0 0 28px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.3)';
                }}
                title="Upload handwritten register for OCR extraction"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Register
              </motion.button>
            )}
            {extraHeaderButtons}
            <div 
              className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 h-10"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <button
                onClick={() => { sounds.toggle(); setViewMode('list'); }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                style={viewMode === 'list' ? {
                  boxShadow: '0 0 0 1px rgba(6,182,212,0.4), 0 0 12px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                } : {}}
                aria-label="List view"
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => { sounds.toggle(); setViewMode('grid'); }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                style={viewMode === 'grid' ? {
                  boxShadow: '0 0 0 1px rgba(6,182,212,0.4), 0 0 12px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                } : {}}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Modal - Premium White Theme */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 z-50 mt-3 w-[600px] bg-white/98 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-2xl shadow-slate-900/10 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-cyan-600" />
                  Advanced Filters
                </h3>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Inmate Name</label>
                  <input
                    type="text"
                    value={advancedFilters.name}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 placeholder-slate-400 text-sm"
                    placeholder="Search name..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Facility</label>
                  <input
                    type="text"
                    value={advancedFilters.facility}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, facility: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 placeholder-slate-400 text-sm"
                    placeholder="Search facility..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">District</label>
                  <input
                    type="text"
                    value={advancedFilters.district}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, district: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 placeholder-slate-400 text-sm"
                    placeholder="Search district..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">From Date</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-slate-800 text-sm"
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
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-500 hover:to-cyan-600 transition-all shadow-lg shadow-cyan-500/20 text-sm font-bold"
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
            className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl mb-4 mx-auto max-w-4xl shadow-sm"
          >
            <Filter className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-semibold text-slate-700">Active Filters:</span>
            
            {activeFilters?.state && (
              <div className="bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                {activeFilters.state}
              </div>
            )}

            {(activeFilters?.district || treeFilter.district) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                {activeFilters?.district || treeFilter.district}
              </div>
            )}

            {treeFilter.actionType && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                {treeFilter.actionType.charAt(0).toUpperCase() + treeFilter.actionType.slice(1)}
              </div>
            )}
            
            {treeFilter.date && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
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
        
        {/* Filter Toggle + Checkbox Row — Compact and Centered */}
        <div className="flex items-center justify-center gap-4 w-full pt-1">
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
            className="mb-0"
          />
        </div>
        
        <AnimatePresence>
          {hasActiveFilter && <SpatialBreadcrumb />}
        </AnimatePresence>
      </div>

      <div ref={scrollRef} className="flex-1 p-3 bg-gradient-to-br from-slate-50 via-white to-slate-50 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-rose-400/10 to-orange-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-3xl" />
        </div>
        {displayPatients.length > 0 ? (
          viewMode === 'list' ? (
            <SevenColumnListView
              patients={displayPatients}
              onPatientClick={onPatientClick}
              isSuspectedTB={isSuspectedTB}
            />
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
}

function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (hasAnimated.current) {
      setCount(target);
      return;
    }
    if (target === 0) { 
      setCount(0); 
      hasAnimated.current = true;
      return; 
    }
    // Smaller numbers animate faster
    const actualDuration = target === 1 ? 300 : duration;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / actualDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(target);
        hasAnimated.current = true;
      }
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

// ─── Memoized Header Stats Component ─────────────────────────────────────
interface HeaderStatsProps {
  displayPatients: Patient[];
}

const HeaderStats = memo(function HeaderStats({ displayPatients }: HeaderStatsProps) {
  // Memoize expensive calculations
  const stats = useMemo(() => {
    const screenedCount = displayPatients.length;
    const tbCount = displayPatients.filter(p => p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes').length;
    const suspectedCount = displayPatients.filter(p => {
      const xrayResult = p.xray_result || p.chest_x_ray_result || (p as any)['Chest X-ray Result'];
      if (!xrayResult) return false;
      const resultStr = xrayResult.toString().toLowerCase();
      return resultStr === 'suspected tb case' || resultStr.includes('abnormal') || resultStr.includes('suspected');
    }).length;
    return { screenedCount, tbCount, suspectedCount };
  }, [displayPatients]);

  const animatedScreened = useCountUp(stats.screenedCount);
  const animatedTb = useCountUp(stats.tbCount);
  const animatedSuspected = useCountUp(stats.suspectedCount);

  return (
    <div className="text-holder-stats flex-1 min-w-0">
      <h1 className="stats-typer text-sm font-semibold tracking-wide">
        <span className="text-gray-500">On</span>{' '}
        <span className="premium-gradient-text font-bold">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {', in '}
        <span className="premium-location">{getLocationText(displayPatients)}</span>
        {' — '}
        <span className="text-lg font-bold text-gray-900">{animatedScreened}</span>
        <span className="text-gray-500 font-normal ml-1">screened</span>
        <span className="mx-2 text-gray-300">|</span>
        {stats.tbCount > 0 ? (
          <span className="premium-gradient-rose text-lg font-bold">{animatedTb}</span>
        ) : (
          <span className="text-lg font-bold text-gray-500">{animatedTb}</span>
        )}
        <span className="text-gray-500 font-normal ml-1">TB+</span>
        <span className="mx-2 text-gray-300">|</span>
        {stats.suspectedCount > 0 ? (
          <span className="premium-gradient-amber text-lg font-bold">{animatedSuspected}</span>
        ) : (
          <span className="text-lg font-bold text-gray-500">{animatedSuspected}</span>
        )}
        <span className="text-gray-500 font-normal ml-1">suspected</span>
      </h1>
    </div>
  );
});

// Status-based styling configuration
const statusStyles = {
  normal: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/50',
    borderColor: 'border-emerald-200',
  },
  suspected: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  tbDiagnosed: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  attInitiated: {
    border: 'border-l-blue-400',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  attCompleted: {
    border: 'border-l-violet-400',
    bg: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  default: {
    border: 'border-l-gray-300',
    bg: 'bg-white',
    borderColor: 'border-gray-200',
  },
};

// Helper function to determine patient status with priority
const getPatientStatus = (
  patient: Patient,
  isSuspectedTB: (p: Patient) => boolean
): 'normal' | 'suspected' | 'tbDiagnosed' | 'attInitiated' | 'attCompleted' | 'default' => {
  if (isATTCompleted(patient)) return 'attCompleted';
  if (isATTInitiated(patient)) return 'attInitiated';
  if (isTBDiagnosed(patient)) return 'tbDiagnosed';
  if (isSuspectedTB(patient)) return 'suspected';
  return 'normal';
};

const MiniCard = memo(function MiniCard({ 
  patient, 
  cardIndex, 
  hasStatusTint,
  onPatientClick,
  isSuspectedTB
}: { 
  patient: Patient; 
  cardIndex: number; 
  hasStatusTint: boolean;
  onPatientClick?: (patient: Patient) => void;
  isSuspectedTB: (p: Patient) => boolean;
}) {
  const status = getPatientStatus(patient, isSuspectedTB);
  const styles = statusStyles[status];
  const isTb = status === 'tbDiagnosed' || status === 'suspected';
  
  // Alternating background for normal cards only
  const isEven = cardIndex % 2 === 1;
  const alternatingBg = !hasStatusTint && isEven ? 'bg-gray-50/60' : '';
  
  // Determine hover background based on alternating state
  const hoverBg = alternatingBg ? 'hover:bg-white' : 'hover:bg-gray-50';
  
  // Status glow color
  const statusGlowColor = {
    normal: 'rgba(16,185,129,0.15)',
    suspected: 'rgba(245,158,11,0.25)',
    tbDiagnosed: 'rgba(244,63,94,0.3)',
    attInitiated: 'rgba(59,130,246,0.2)',
    attCompleted: 'rgba(139,92,246,0.2)',
    default: 'rgba(0,0,0,0.05)',
  }[status];
  
  return (
    <motion.div
      onClick={() => onPatientClick?.(patient)}
      className={`group relative px-3 py-2 cursor-pointer gpu-accelerated ${styles.bg} ${alternatingBg} ${hoverBg}`}
      style={{
        borderRadius: '4px 8px 8px 4px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: `
          0 1px 2px rgba(0,0,0,0.04),
          0 2px 4px rgba(0,0,0,0.03),
          0 4px 8px rgba(0,0,0,0.02),
          inset 0 1px 0 rgba(255,255,255,0.8),
          0 0 0 1px rgba(0,0,0,0.08)
        `,
        willChange: 'transform',
        contain: 'layout paint',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `
          0 2px 4px rgba(0,0,0,0.05),
          0 4px 8px rgba(0,0,0,0.04),
          0 8px 16px rgba(0,0,0,0.03),
          0 16px 32px ${statusGlowColor},
          inset 0 1px 0 rgba(255,255,255,0.9),
          0 0 0 1px rgba(0,0,0,0.12),
          0 0 20px ${statusGlowColor}
        `;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.04),
          0 2px 4px rgba(0,0,0,0.03),
          0 4px 8px rgba(0,0,0,0.02),
          inset 0 1px 0 rgba(255,255,255,0.8),
          0 0 0 1px rgba(0,0,0,0.08)
        `;
      }}
      whileTap={{ scale: 0.98 }}
      layout={false}
    >
      {/* Status indicator line with glow */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1 ${styles.border}`}
        style={{ 
          borderRadius: '4px 0 0 4px',
          boxShadow: `0 0 8px ${statusGlowColor}, 0 0 16px ${statusGlowColor}`,
        }}
      />
      
      <div className="flex items-center justify-between gap-2 pl-2.5">
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-gray-900 leading-tight truncate" style={{ color: '#111827' }}>
            {patient.inmate_name || 'No Name'}
          </h4>
          <p className="text-[10px] font-medium uppercase tracking-wide truncate" style={{ letterSpacing: '0.04em', color: '#9ca3af' }}>
            {patient.facility_name || 'SJ'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isTb && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase">
              TB
            </span>
          )}
          <span className="text-[11px] tabular-nums" style={{ letterSpacing: '0', color: '#6b7280' }}>
            {(() => {
              const mostRecentDate = getMostRecentClinicalDate(patient);
              return mostRecentDate ? 
                mostRecentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 
                '02 May';
            })()}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

const PipelineColumn = memo(function PipelineColumn({ 
  title, 
  patients, 
  count, 
  index: columnIndex,
  onPatientClick,
  isSuspectedTB,
}: { 
  title: string; 
  patients: Patient[]; 
  count: number; 
  index: number;
  onPatientClick?: (patient: Patient) => void;
  isSuspectedTB: (p: Patient) => boolean;
}) {
  return (
    <div 
      className={`flex flex-col min-w-0 h-full ${columnIndex < 6 ? 'border-r' : ''}`}
      style={{ borderRightColor: columnIndex < 6 ? 'rgba(0,0,0,0.15)' : undefined }}
    >
      {/* Column Header - Sticky with Glassmorphism */}
      <div 
        className="px-3 py-2.5 sticky top-0 z-10"
        style={{ 
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 -1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <span 
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ 
              color: '#374151',
              letterSpacing: '0.06em',
              textShadow: '0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            Col {columnIndex + 1}
          </span>
          <span 
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ 
              color: '#6b7280',
              background: 'rgba(0,0,0,0.04)',
              letterSpacing: '0.02em',
            }}
          >
            {count}
          </span>
        </div>
      </div>
      
      {/* Cards container - no scroll, shares parent scroll */}
      <div className="px-2 py-2 space-y-2 cards-container">
        {patients.map((patient, idx) => {
          const status = getPatientStatus(patient, isSuspectedTB);
          const hasStatusTint = status !== 'normal' && status !== 'default';
          return (
            <MiniCard 
              key={`${title}-${patient.id}-${idx}`} 
              patient={patient} 
              cardIndex={idx}
              hasStatusTint={hasStatusTint}
              onPatientClick={onPatientClick}
              isSuspectedTB={isSuspectedTB}
            />
          );
        })}
      </div>
    </div>
  );
});

function SevenColumnListView({ patients, onPatientClick, isSuspectedTB }: TwoColumnListViewProps) {
  // Memoize column split calculations
  const columns = useMemo(() => {
    const seventh = Math.ceil(patients.length / 7);
    return {
      col1: patients.slice(0, seventh),
      col2: patients.slice(seventh, seventh * 2),
      col3: patients.slice(seventh * 2, seventh * 3),
      col4: patients.slice(seventh * 3, seventh * 4),
      col5: patients.slice(seventh * 4, seventh * 5),
      col6: patients.slice(seventh * 5, seventh * 6),
      col7: patients.slice(seventh * 6),
    };
  }, [patients]);
  
  const { col1, col2, col3, col4, col5, col6, col7 } = columns;

  return (
    <>
      <style>{`
        .premium-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .premium-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.03);
          border-radius: 4px;
        }
        .premium-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.25);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .premium-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.40);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .premium-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
        .smooth-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          will-change: scroll-position;
          contain: layout paint;
        }
        .gpu-accelerated {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
      <div 
        className="w-full grid grid-cols-7 px-0 overflow-y-auto premium-scrollbar smooth-scroll gpu-accelerated"
        style={{ 
          maxHeight: 'calc(100vh - 180px)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px) saturate(150%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: `
            0 1px 2px rgba(0,0,0,0.02),
            0 4px 8px rgba(0,0,0,0.03),
            0 8px 16px rgba(0,0,0,0.03),
            0 16px 32px rgba(0,0,0,0.02),
            0 32px 64px rgba(0,0,0,0.01),
            inset 0 1px 0 rgba(255,255,255,0.8),
            0 0 0 1px rgba(0,0,0,0.08)
          `,
          overscrollBehavior: 'contain',
        }}
      >
        <PipelineColumn title="C1" patients={col1} count={col1.length} index={0} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C2" patients={col2} count={col2.length} index={1} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C3" patients={col3} count={col3.length} index={2} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C4" patients={col4} count={col4.length} index={3} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C5" patients={col5} count={col5.length} index={4} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C6" patients={col6} count={col6.length} index={5} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
        <PipelineColumn title="C7" patients={col7} count={col7.length} index={6} onPatientClick={onPatientClick} isSuspectedTB={isSuspectedTB} />
      </div>
    </>
  );
}
