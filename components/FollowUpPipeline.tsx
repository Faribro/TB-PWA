'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { SpatialBreadcrumb } from './SpatialBreadcrumb';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { Button } from './ui/button';
import { createClient } from '@supabase/supabase-js';

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
}

export function FollowUpPipeline({ patients, globalPatients, isLoading = false, onPatientClick }: FollowUpPipelineProps) {
  const { filter, clearFilter } = useTreeFilter();
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [isTriaging, setIsTriaging] = useState(false);
  
  const patientData = globalPatients ?? patients ?? [];

  const filteredPatients = useMemo(() => {
    let filtered = patientData;

    if (filter.date) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.toISOString().split('T')[0] === filter.date;
      });
    } else if (filter.district && filter.month !== undefined && filter.year) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue || p.screening_district !== filter.district) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.getFullYear() === filter.year && pDate.getMonth() === filter.month;
      });
    } else if (filter.month !== undefined && filter.year) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.getFullYear() === filter.year && pDate.getMonth() === filter.month;
      });
    } else if (filter.year) {
      filtered = filtered.filter(p => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const pDate = new Date(dateValue);
        if (isNaN(pDate.getTime())) return false;
        return pDate.getFullYear() === filter.year;
      });
    }

    if (filter.actionType) {
      filtered = filtered.filter(p => {
        switch (filter.actionType) {
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

    return filtered;
  }, [patientData, filter]);

  const displayPatients = useMemo(() => filteredPatients.slice(0, 500), [filteredPatients]);

  const hasActiveFilter = filter.year || filter.month !== undefined || filter.district || filter.date || filter.actionType;

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

  const eligibleCount = useMemo(() => {
    return filteredPatients.filter(p => canSelectForTriage(p)).length;
  }, [filteredPatients]);

  const toggleTriageSelect = (id: number) => {
    setTriageIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const eligibleIds = filteredPatients
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
    const selectedPatients = filteredPatients.filter(p => triageIds.includes(p.id));
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
    } finally {
      setIsTriaging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="inline-block">
            <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading patients...</p>
          <p className="text-sm text-slate-500 mt-1">0 patients</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      <div className="p-6 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        {hasActiveFilter && filter.actionType && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl mb-4"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Active Filters:</span>
            
            {filter.actionType && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {filter.actionType.charAt(0).toUpperCase() + filter.actionType.slice(1)}
              </div>
            )}
            
            {filter.date && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {new Date(filter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            
            {filter.district && (
              <div className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                {filter.district}
              </div>
            )}
            
            <button
              onClick={clearFilter}
              className="text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors ml-auto flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </motion.div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={triageIds.length > 0 && triageIds.length === eligibleCount && eligibleCount > 0}
              onChange={toggleSelectAllEligible}
              disabled={eligibleCount === 0}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
              title={eligibleCount === 0 ? 'No eligible patients for bulk triage' : `Select all ${eligibleCount} eligible patients`}
            />
            <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">Patient List</h2>
          </div>
          <div className="flex items-center gap-2">
            {eligibleCount > 0 && (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                {eligibleCount} eligible for triage
              </div>
            )}
            <div className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              {filteredPatients.length.toLocaleString()} {hasActiveFilter ? 'filtered' : 'total'}
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {hasActiveFilter && <SpatialBreadcrumb />}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 cyan-scrollbar">
        {displayPatients && displayPatients.length > 0 ? displayPatients.map((patient) => {
          const phase = calculatePatientPhase(patient);
          const canSelect = canSelectForTriage(patient);
          
          return (
            <div key={patient.id} className="w-full group">
              <div className="backdrop-blur-xl bg-white/90 hover:bg-white border-2 border-slate-200/60 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group-hover:scale-[1.01]">
                <div className="flex items-start gap-4">
                  <div className="pt-1" title={!canSelect ? 'Requires manual follow-up: Abnormal X-Ray or Symptoms Present' : ''}>
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
                  <div className="flex-1 cursor-pointer" onClick={() => onPatientClick?.(patient)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-sm font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg">{patient.unique_id}</div>
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            phase.phase === 'Sputum Test' ? 'bg-amber-100 text-amber-700' :
                            phase.phase === 'Diagnosis' ? 'bg-purple-100 text-purple-700' :
                            phase.phase === 'ATT Initiation' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {phase.phase}
                          </div>
                        </div>
                        
                        <div className="text-slate-900 font-bold text-lg mb-2">{patient.inmate_name}</div>
                        
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                          <span>{patient.facility_name}</span>
                          <span className="text-slate-400">•</span>
                          <span>{patient.screening_district}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {(() => {
                            const dateValue = patient.screening_date || patient.submitted_on;
                            if (!dateValue) return 'N/A';
                            const date = new Date(dateValue);
                            if (isNaN(date.getTime())) return 'Invalid Date';
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : null}

        {!isLoading && filteredPatients.length > 0 && (
          <div className="text-center py-4 text-xs text-slate-500 font-medium border-t border-slate-200 mt-4">
            Showing {displayPatients.length} of {filteredPatients.length.toLocaleString()} filtered records
            {filteredPatients.length > 500 && ' • Use filters to narrow results'}
          </div>
        )}

        {!isLoading && (!patientData || patientData.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64"
          >
            <div className="text-center">
              <div className="text-slate-400 text-lg font-bold mb-2">No patients found</div>
              <div className="text-slate-500 text-sm font-medium">
                {hasActiveFilter ? 'Try adjusting your filters' : 'No data available'}
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
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
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
  );
}
