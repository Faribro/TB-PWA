'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFailedUpdateRetry } from '@/hooks/useFailedUpdateRetry';
import { useForm } from 'react-hook-form';
import { User, FileText, Activity, Pill, Shield, ChevronDown, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save, ClipboardList, X, MapPin, XCircle, Search, ArrowRightCircle, Settings2, AlertTriangle, Zap, TrendingUp, Award, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { HorizontalHoverAccordion } from './ui/HorizontalHoverAccordion';
import { type PatientFormData } from '@/lib/schemas';
import { calculatePatientPhase } from '@/lib/phase-engine';
import PatientHistory from './PatientHistory';
import { ClinicalTimeline } from './ClinicalTimeline';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { VoiceInput } from './VoiceInput';
import { useHotkeys } from '@/hooks/useHotkeys';
import { calculatePatientRisk } from '@/lib/risk-engine';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { useSessionScope, isSuperuser } from '@/hooks/useSessionScope';
import { SyncStatusBadge } from './ui/SyncStatusBadge';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { DemographicsCarousel } from './DemographicsCarousel';
import { usePatientRealtimeUpdates } from '@/hooks/usePatientRealtimeUpdates';
import { CLINICAL_FORM_FIELD_TO_COLUMN, CLINICAL_DATE_COLUMNS } from '@/lib/db/clinicalFields';
import { buildClinicalDiffPayload } from '@/lib/db/buildClinicalDiffPayload';

const supabaseClient = getSupabaseBrowserClient();

// Normalize HIV status from DB (lowercase) to form option values (Title case)
const normalizeHivStatus = (val: string | null | undefined): string => {
  if (!val) return '';
  const v = val.trim().toLowerCase();
  if (v === 'positive') return 'Positive';
  if (v === 'negative') return 'Negative';
  if (v === 'unknown') return 'Unknown';
  return val; // pass through if already correct
};

// Normalize ART status from DB to form option values
const normalizeArtStatus = (val: string | null | undefined): string => {
  if (!val) return '';
  const v = val.trim().toLowerCase();
  if (v === 'pre art' || v === 'pre_art') return 'Pre ART';
  if (v === 'on art' || v === 'on_art') return 'On ART';
  return val;
};

// Helper to format dates for HTML5 date inputs (yyyy-MM-dd)
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    // If it's already in yyyy-MM-dd format, validate and return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Validate the date is actually valid
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      // Check if the date was auto-corrected by checking year/month/day
      const parts = dateStr.split('-');
      if (date.getFullYear() !== parseInt(parts[0]) || 
          (date.getMonth() + 1) !== parseInt(parts[1]) || 
          date.getDate() !== parseInt(parts[2])) {
        return ''; // Invalid date like 2026-13-01 or 2026-05-32
      }
      return dateStr;
    }
    // Handle ISO timestamps with timezone (e.g., "2026-05-01T00:00:00+00:00")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Use local date parts to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

interface PatientDetailDrawerProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col gap-0.5 group">
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500 mb-1">{label}</label>
    <div className="text-[13px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5 transition-all group-hover:bg-white group-hover:border-slate-300">
      {value || <span className="text-slate-400 font-normal italic">Not recorded</span>}
    </div>
  </div>
);

const EditableField = ({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (val: string) => void; type?: string }) => (
  <div className="group">
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400 mb-1">{label}</label>
    <Input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full text-[13px] font-medium rounded-[10px] border-[1.5px] px-3 transition-all duration-150 outline-none ${value ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/10`}
    />
  </div>
);

const EditableSelect = ({ label, value, onChange, options }: { label: string; value: any; onChange: (val: string) => void; options: { value: string; label: string }[] }) => (
  <div className="group">
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400 mb-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-10 w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] font-medium appearance-none outline-none transition-all duration-150 pr-10 ${value ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/10`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const Section = ({ title, icon: Icon, children, isCurrent = false }: { title: string; icon: any; children: React.ReactNode; isCurrent?: boolean }) => (
  <div className={`p-4 rounded-2xl border transition-all duration-500 ${isCurrent ? 'bg-white border-blue-100 shadow-md ring-1 ring-blue-50/50' : 'bg-slate-50/30 border-slate-100/50'}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-xl transition-colors ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className={`text-sm font-black uppercase tracking-tight ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{title}</h3>
      {isCurrent && (
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Attention Required</span>
        </div>
      )}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export function PatientDetailDrawer({ patient, isOpen, onClose, onUpdate }: PatientDetailDrawerProps) {
  const scope = useSessionScope();
  const [localPatient, setLocalPatient] = useState(patient);
  const { mutate } = useSWRConfig();
  const { status, setSaving, setSyncing, setSynced, setError, reset: resetSyncStatus } = useSyncStatus(patient?.id ?? null);
  const { getFailedUpdatesCount } = useFailedUpdateRetry();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseLoop, setShowCloseLoop] = useState(false);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const [activeTab, setActiveTab] = useState('clinical');
  // Tracks whether the canonical fresh fetch has completed for the current patient
  const [fetchedPatient, setFetchedPatient] = useState<any>(null);

  // Refs for managing save state and form reset timing
  const justSavedRef = useRef(false);
  const justSavedTimestampRef = useRef<number>(0);
  const hasFetchedRef = useRef(false);

  const { watch, getValues, reset, setValue, formState: { isDirty } } = useForm<PatientFormData>({
    defaultValues: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': '',
      'Name of facility where referred to (Give code/name of all facilities)': '',
      'TB diagnosed (Y/N)': '',
      'Date of TB Diagnosed (dd/mm/yy)': '',
      'Type of TB Diagnosed (P/EP)': '',
      'Date of starting ATT (dd/mm/yyyy)': '',
      'Date of Treatment Completion (dd/mm/yyyy)': '',
      'HIV Status (Positive/Negative/Unknown)': '',
      'Status at the time of referral (Pre ART/On ART)': '',
      'ART Number (if on ART at the time of referral)': '',
      'NIKSHAY/ABHA ID': '',
      'Date of registration (dd/mm/yyyy)': '',
      'Remarks': '',
      'Other Facility Name': ''
    }
  });

  const watchedReferralDate = watch('Date of referral for TB Examination (sputum) (dd/mm/yy)');
  const watchedFacility = watch('Name of facility where referred to (Give code/name of all facilities)');
  const watchedTbDiagnosed = watch('TB diagnosed (Y/N)');
  const watchedDiagnosisDate = watch('Date of TB Diagnosed (dd/mm/yy)');
  const watchedAttStart = watch('Date of starting ATT (dd/mm/yyyy)');
  const watchedHivStatus = watch('HIV Status (Positive/Negative/Unknown)');
  const watchedNikshay = watch('NIKSHAY/ABHA ID');
  const watchedArtStatus = watch('Status at the time of referral (Pre ART/On ART)');
  const watchedAttCompletion = watch('Date of Treatment Completion (dd/mm/yyyy)');

  // Clear invalid clinical dependent fields automatically when parent fields transition
  useEffect(() => {
    if (watchedTbDiagnosed && watchedTbDiagnosed !== 'Y') {
      const fieldsToClear = [
        'Date of TB Diagnosed (dd/mm/yy)',
        'Type of TB Diagnosed (P/EP)',
        'Date of starting ATT (dd/mm/yyyy)',
        'Date of Treatment Completion (dd/mm/yyyy)',
        'NIKSHAY/ABHA ID',
        'Date of registration (dd/mm/yyyy)'
      ] as const;
      
      fieldsToClear.forEach(field => {
        if (getValues(field)) {
          setValue(field, '', { shouldDirty: true });
        }
      });
    }
  }, [watchedTbDiagnosed, setValue, getValues]);

  useEffect(() => {
    if (watchedHivStatus && watchedHivStatus !== 'Positive') {
      const fieldsToClear = [
        'Status at the time of referral (Pre ART/On ART)',
        'ART Number (if on ART at the time of referral)'
      ] as const;
      
      fieldsToClear.forEach(field => {
        if (getValues(field)) {
          setValue(field, '', { shouldDirty: true });
        }
      });
    }
  }, [watchedHivStatus, setValue, getValues]);

  useEffect(() => {
    if (watchedHivStatus === 'Positive' && watchedArtStatus && watchedArtStatus !== 'On ART') {
      const field = 'ART Number (if on ART at the time of referral)';
      if (getValues(field)) {
        setValue(field, '', { shouldDirty: true });
      }
    }
  }, [watchedHivStatus, watchedArtStatus, setValue, getValues]);

  // Force refresh session scope when drawer opens to prevent stale access control data
  useEffect(() => {
    mutate('/api/me');
  }, [mutate]);

  useEffect(() => {
    console.log('[PatientDetailDrawer] 🔄 Patient prop changed:', {
      patientId: patient?.id,
      kobo_uuid: patient?.kobo_uuid,
      updated_at: patient?.updated_at,
      hasClinicalData: {
        referral_date: patient?.referral_date,
        referred_facility: patient?.referred_facility,
        hiv_status: patient?.hiv_status,
        tb_diagnosed: patient?.tb_diagnosed,
        tb_diagnosis_date: patient?.tb_diagnosis_date,
        att_start_date: patient?.att_start_date,
        art_status: patient?.art_status,
        nikshay_abha_id: patient?.nikshay_abha_id
      }
    });
    
    if (patient && Object.keys(patient).length > 0) {
      const isSamePatient =
        (patient?.id && localPatient?.id && patient.id === localPatient.id) ||
        (patient?.unique_id && localPatient?.unique_id && patient.unique_id === localPatient.unique_id);

      if (isSamePatient) {
        // Only accept patient prop if we haven't just saved (within last 1 second)
        // AND the incoming prop has at least as many fields as current localPatient
        if (Date.now() - justSavedTimestampRef.current > 1000) {
          const incomingKeys = Object.keys(patient).filter(k => patient[k] !== undefined).length;
          const currentKeys = Object.keys(localPatient || {}).filter(k => (localPatient || {})[k] !== undefined).length;
          if (incomingKeys >= currentKeys) {
            console.log('[PatientDetailDrawer] ✅ Same patient - accepting fresh patient prop');
            setLocalPatient(patient);
          } else {
            console.log('[PatientDetailDrawer] ⏭️ Skipping prop update - incoming has fewer fields than fetched patient');
          }
        } else {
          console.log('[PatientDetailDrawer] ⏭️ Skipping prop update - just saved');
        }
        return;
      }

      // Different patient - reset EVERYTHING
      console.log('[PatientDetailDrawer] 🆕 Different patient - resetting all');
      setLocalPatient(patient);
      justSavedTimestampRef.current = 0; // Clear timestamp for new patient
      hasFetchedRef.current = false; // Reset fetch flag for new patient
      // Reset form to default values for new patient
      reset({
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': '',
        'Name of facility where referred to (Give code/name of all facilities)': '',
        'TB diagnosed (Y/N)': '',
        'Date of TB Diagnosed (dd/mm/yy)': '',
        'Type of TB Diagnosed (P/EP)': '',
        'Date of starting ATT (dd/mm/yyyy)': '',
        'Date of Treatment Completion (dd/mm/yyyy)': '',
        'HIV Status (Positive/Negative/Unknown)': '',
        'Status at the time of referral (Pre ART/On ART)': '',
        'ART Number (if on ART at the time of referral)': '',
        'NIKSHAY/ABHA ID': '',
        'Date of registration (dd/mm/yyyy)': '',
        'Remarks': '',
        'Other Facility Name': ''
      }, { keepDefaultValues: false });
    }
  }, [patient, reset, localPatient]);

  // Debug: Monitor isSubmitting state changes
  useEffect(() => {
    console.log('[PatientDetailDrawer] 🔄 isSubmitting state changed to:', isSubmitting);
  }, [isSubmitting]);

  // Sync internal open state with prop
  useEffect(() => {
    if (!isOpen && internalOpen) {
      // Drawer just closed - clear fetch flag and canonical patient
      hasFetchedRef.current = false;
      setFetchedPatient(null);
      // DO NOT clear justSavedTimestampRef - keep it to prevent overwriting saved data on re-open
    }
    setInternalOpen(isOpen);
  }, [isOpen]);

  // Fetch fresh patient data when drawer opens — this is the CANONICAL source for form prefill
  useEffect(() => {
    if (!patient?.id || !isOpen) return;

    // Reset fetchedPatient so form waits for fresh data
    setFetchedPatient(null);

    const url = new URL('/api/patient-sync', window.location.origin);
    url.searchParams.set('patientId', patient.id);

    fetch(url.toString())
      .then(res => {
        if (res.ok) return res.json();
        throw new Error(`Failed to fetch patient: ${res.status}`);
      })
      .then(data => {
        if (data?.patient) {
          console.log('[PatientDetailDrawer] ✅ Fresh fetch complete — setting canonical patient');
          setFetchedPatient(data.patient);
          setLocalPatient(data.patient);
          justSavedTimestampRef.current = 0;
          justSavedRef.current = false;
        }
      })
      .catch(err => {
        console.error('[PatientDetailDrawer] ❌ Fresh fetch failed, falling back to prop:', err);
        // Fallback: use the patient prop so form is not permanently blank
        setFetchedPatient(patient);
      });
  }, [patient?.id, isOpen]);
  
  useEffect(() => {
    if (isSubmitting) {
      justSavedRef.current = true;
    } else if (justSavedRef.current) {
      // We just finished saving - clear the flag but DON'T reset form
      // The form values are already correct from the save payload
      justSavedRef.current = false;
      justSavedTimestampRef.current = Date.now();
      console.log('[PatientDetailDrawer] ✅ Skip form reset - just completed save');
    }
  }, [isSubmitting]);
  
  // Reset form ONLY from the canonical fetched patient — never from the stale prop
  useEffect(() => {
    if (!fetchedPatient || !internalOpen) return;

    const resetValues = {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': formatDateForInput(fetchedPatient.referral_date),
      'Name of facility where referred to (Give code/name of all facilities)': fetchedPatient.referred_facility || '',
      'TB diagnosed (Y/N)': fetchedPatient.tb_diagnosed || '',
      'Date of TB Diagnosed (dd/mm/yy)': formatDateForInput(fetchedPatient.tb_diagnosis_date),
      'Type of TB Diagnosed (P/EP)': fetchedPatient.tb_type || '',
      'Date of starting ATT (dd/mm/yyyy)': formatDateForInput(fetchedPatient.att_start_date),
      'Date of Treatment Completion (dd/mm/yyyy)': formatDateForInput(fetchedPatient.att_completion_date),
      'HIV Status (Positive/Negative/Unknown)': normalizeHivStatus(fetchedPatient.hiv_status),
      'Status at the time of referral (Pre ART/On ART)': normalizeArtStatus(fetchedPatient.art_status),
      'ART Number (if on ART at the time of referral)': fetchedPatient.art_number || '',
      'NIKSHAY/ABHA ID': fetchedPatient.nikshay_abha_id || '',
      'Date of registration (dd/mm/yyyy)': formatDateForInput(fetchedPatient.registration_date),
      'Remarks': fetchedPatient.remarks || '',
      'Other Facility Name': fetchedPatient.other_facility_name || ''
    };

    console.log('[PatientDetailDrawer] ✅ Form reset from canonical fetched patient:', {
      id: fetchedPatient.id,
      referral_date: resetValues['Date of referral for TB Examination (sputum) (dd/mm/yy)'],
      tb_diagnosed: resetValues['TB diagnosed (Y/N)'],
      hiv_status: resetValues['HIV Status (Positive/Negative/Unknown)']
    });

    reset(resetValues, { keepDefaultValues: false });
  }, [fetchedPatient, internalOpen, reset]);
  
  // Form will be re-initialized when localPatient or internalOpen changes

  // ── Demographics State — Kobo-canonical keys with legacy fallbacks ──
  // Key names match the Kobo XLSX field names exactly. Supabase column mapping
  // happens in mapDemographics (read) and handleSaveDemographics (write).
  const mapDemographics = (p: any) => ({
    // §1 Screening Details
    staffname:         p?.staff_name         || '',
    submittedon:       formatDateForInput(p?.submitted_on),
    screeningstate:    p?.screening_state     || '',
    screeningdistrict: p?.screening_district  || '',
    facilitycode:      p?.facility_name       || '',
    facilitytype:      p?.facility_type       || '',
    screeningdate:     formatDateForInput(p?.screening_date),
    uniqueid:          p?.unique_id           || '',
    // §2 Identity
    inmatename:        p?.inmate_name         || '',
    inmatetype:        p?.inmate_type         || '',
    fatherhusbandname: p?.father_husband_name || '',
    dateofbirth:       formatDateForInput(p?.date_of_birth),
    age:               p?.age                 || '',
    sex:               p?.sex                 || '',
    contactnumber:     p?.contact_number      || '',
    // §3 Location
    address:           p?.address             || '',
    // §4 TB Screening (editable in demographics, not in clinical accordion)
    xrayresult:        p?.xray_result         || p?.chest_x_ray_result        || '',
    symptoms10s:       p?.symptoms_10s        || p?.symptoms_present          || '',
    tbpasthistory:     p?.tb_past_history     || '',
  });

  const [editedDemographics, setEditedDemographics] = useState(mapDemographics(localPatient));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes (form isDirty OR demographics editing)
  useEffect(() => {
    setHasUnsavedChanges(isDirty || isEditingDemographics);
  }, [isDirty, isEditingDemographics]);

  // Re-sync demographics when a new patient is opened
  useEffect(() => {
    if (localPatient) {
      // Check if there's a local backup with newer changes
      const backup = localStorage.getItem(`patient-${localPatient.id}-backup`);
      if (backup) {
        try {
          const backupPatient = JSON.parse(backup);
          const backupDate = new Date(backupPatient.client_timestamp || 0);
          const serverDate = new Date(localPatient.updated_at || 0);
          
          if (backupDate > serverDate) {
            console.log('[PatientDetailDrawer] Using local backup with newer changes');
            setLocalPatient(backupPatient);
            setEditedDemographics(mapDemographics(backupPatient));
            setIsEditingDemographics(false);
            toast.info('📝 Restored unsaved changes from local backup', { id: 'backup-restore' });
            return;
          }
        } catch (e) {
          console.error('[PatientDetailDrawer] Failed to parse backup:', e);
        }
      }
      
      setEditedDemographics(mapDemographics(localPatient));
      setIsEditingDemographics(false);
    }
  }, [localPatient]);

  const handleClose = (open: boolean) => {
    // If trying to close (open=false) and has unsaved changes, block it
    if (!open && hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Close anyway?')) {
        return; // Block close
      }
      // User confirmed, clear unsaved state
      setHasUnsavedChanges(false);
    }
    
    if (!open) {
      setInternalOpen(false);
      onClose();
    }
  };

  // Listen for save event from DemographicsCarousel
  useEffect(() => {
    const handleSaveDemographicsEvent = (e: CustomEvent) => {
      console.log('[PatientDetailDrawer] saveDemographicsEvent received from carousel');
      console.log('[PatientDetailDrawer] Event detail (flushed changes):', JSON.stringify(e.detail, null, 2));
      // No conversion needed - event detail uses snake_case keys directly from localValues
      // These match our canonical field mapping
      const flushedChanges = e.detail || {};
      console.log('[PatientDetailDrawer] Using flushed changes directly (snake_case):', JSON.stringify(flushedChanges, null, 2));
      
      // Merge flushed changes with editedDemographics
      const mergedDemographics = { ...editedDemographics, ...flushedChanges };
      console.log('[PatientDetailDrawer] Merged demographics for save:', JSON.stringify(mergedDemographics, null, 2));
      handleSaveDemographics(mergedDemographics);
    };

    document.addEventListener('saveDemographicsEvent', handleSaveDemographicsEvent as EventListener);
    return () => {
      document.removeEventListener('saveDemographicsEvent', handleSaveDemographicsEvent as EventListener);
    };
  }, [editedDemographics, localPatient]);

  // Listen for close loop event from DemographicsCarousel
  useEffect(() => {
    const handleOpenCloseLoopEvent = () => {
      console.log('[PatientDetailDrawer] openCloseLoopModal event received from carousel');
      setShowCloseLoop(true);
    };

    document.addEventListener('openCloseLoopModal', handleOpenCloseLoopEvent);
    return () => {
      document.removeEventListener('openCloseLoopModal', handleOpenCloseLoopEvent);
    };
  }, []);

  // Listen for submit clinical update event from DemographicsCarousel
  useEffect(() => {
    const handleSubmitClinicalEvent = () => {
      console.log('[PatientDetailDrawer] submitClinicalUpdateEvent received from carousel');
      handleSaveClinical();
    };

    document.addEventListener('submitClinicalUpdateEvent', handleSubmitClinicalEvent);
    return () => {
      document.removeEventListener('submitClinicalUpdateEvent', handleSubmitClinicalEvent);
    };
  }, [localPatient]);

  const hotkeys = useMemo(() => ({
    'meta+s': (e: KeyboardEvent) => {
      e.preventDefault();
      if (isOpen && !isSubmitting && !isSavingDemographics) {
        if (isEditingDemographics) handleSaveDemographics();
        else handleSaveClinical();
      }
    },
    'escape': () => { if (isOpen && !isSubmitting) handleClose(false); }
  }), [isOpen, isSubmitting, isSavingDemographics, isEditingDemographics, hasUnsavedChanges]);

  useHotkeys(hotkeys);

  const { phase } = useMemo(
    () => calculatePatientPhase(localPatient),
    [localPatient]
  );
  const isClosed = phase === 'Closed';
  
  // Authorization check with Maharashtra-Mumbai grouping
  const isAuthorized = useMemo(() => {
    if (!scope || !localPatient) return true;
    
    // CRITICAL: Admin and PM have unrestricted access
    const superuserCheck = isSuperuser(scope);
    
    // DEFENSIVE: If scope.role is 'admin' but scope.state is not null, this is a bug
    // Admin should always have null state. Force access anyway.
    if (scope.role === 'admin' || scope.role === 'Program Manager' || scope.role === 'PM') {
      console.log('[PatientDetailDrawer] Admin/PM detected, forcing access despite scope state:', scope);
      return true;
    }
    
    console.log('[PatientDetailDrawer] SUPERUSER CHECK:', {
      scope,
      isSuperuser: superuserCheck,
      roleFromScope: scope.role,
      expectedRoles: ['admin', 'Program Manager'],
      matchesAdmin: scope.role === 'admin',
      matchesPM: scope.role === 'Program Manager'
    });
    
    if (superuserCheck) return true;
    
    if (!scope.state) return true;
    
    const patientState = localPatient.screening_state?.trim();
    const userState = scope.state?.trim();
    
    console.log('[PatientDetailDrawer] Authorization check:', {
      patientState,
      userState,
      patientStateRaw: localPatient.screening_state,
      userStateRaw: scope.state,
      isSuperuser: superuserCheck,
      role: scope.role
    });
    
    // Direct match
    if (patientState === userState) return true;
    
    // Maharashtra-Mumbai grouping: Maharashtra SPM can access Mumbai patients
    if (userState === 'Maharashtra' && patientState === 'Mumbai') return true;
    if (userState === 'Mumbai' && patientState === 'Maharashtra') return true;
    
    return false;
  }, [scope, localPatient]);

  const handleSaveClinical = async () => {
    console.log('[PatientDetailDrawer] 🚀 Clinical save started - isSubmitting was:', isSubmitting);
    const formData = getValues();
    console.log('[PatientDetailDrawer] 📝 Form data:', formData);

    // Guardrail 1: Don't save if we haven't fetched canonical patient yet
    if (!fetchedPatient) {
      const errorMsg = 'Assertion failed: fetchedPatient is null during clinical save';
      console.error('[PatientDetailDrawer] ❌', errorMsg);
      toast.error('Cannot save: Patient data still loading');
      throw new Error(errorMsg);
    }

    setSaving();
    setIsSubmitting(true);
    console.log('[PatientDetailDrawer] 🔄 isSubmitting set to true');

    try {
      // Build diff-based payload
      const { payload, diffResults } = buildClinicalDiffPayload({
        formData,
        fetchedPatient,
        onLog: (msg, data) => console.log(`[PatientDetailDrawer] ${msg}`, data)
      });

      // Log diff summaries in dev mode
      if (process.env.NODE_ENV === 'development') {
        const added = diffResults.filter(r => r.status === 'added').map(r => r.dbColumn);
        const changed = diffResults.filter(r => r.status === 'changed').map(r => r.dbColumn);
        const cleared = diffResults.filter(r => r.status === 'intentional_clear').map(r => r.dbColumn);
        const unchanged = diffResults.filter(r => r.status === 'unchanged').map(r => r.dbColumn);
        console.log('[PatientDetailDrawer] 📊 Clinical Save Diff Summary:', {
          added,
          changed,
          cleared,
          unchanged
        });
      }

      // Add identifier
      payload.id = localPatient.kobo_uuid || localPatient.id;

      const patientKeys = Object.keys(localPatient || {});
      console.log('[PatientDetailDrawer] 🔍 Patient keys:', patientKeys);
      console.log('[PatientDetailDrawer] 🔍 Available identifiers:', {
        id: localPatient.id,
        kobo_uuid: localPatient.kobo_uuid,
        unique_id: localPatient.unique_id,
        serial_number: localPatient.serial_number
      });

      console.log('[PatientDetailDrawer] 📝 Sending clinical update:', {
        patientId: localPatient.kobo_uuid || localPatient.id,
        payload
      });

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.kobo_uuid || localPatient.id, // Use kobo_uuid as primary identifier, fallback to id
          updates: payload
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('[PatientDetailDrawer] ❌ API Error Response:', {
          status: res.status,
          statusText: res.statusText,
          errorData: JSON.stringify(errorData, null, 2),
          error: errorData.error,
          detail: errorData.detail,
          hint: errorData.hint,
          code: errorData.code,
          updates: errorData.updates,
          diagnostic: errorData.diagnostic
        });

        // Enhanced error messaging for better UX
        let userMessage = 'Save failed';
        if (errorData.error === 'DB_WRITE_FAILED') {
          userMessage = 'Database connection issue - please try again in a few minutes';
        } else if (errorData.error === 'SUPABASE_CONNECTIVITY_FAILED') {
          userMessage = 'Service temporarily unavailable - please try again later';
        } else if (errorData.error === 'SUPABASE_CONNECTION_ERROR') {
          userMessage = 'Network connection issue - please check your connection';
        } else if (errorData.detail) {
          userMessage = `Save failed: ${errorData.detail}`;
        }

        setError(userMessage);
        
        // Store failed update locally for retry when service is restored
        const failedUpdate = {
          patientId: localPatient.id,
          updates: payload,
          timestamp: new Date().toISOString(),
          error: errorData.error,
          detail: errorData.detail
        };
        
        try {
          const existingFailed = JSON.parse(localStorage.getItem('failedPatientUpdates') || '[]');
          existingFailed.push(failedUpdate);
          localStorage.setItem('failedPatientUpdates', JSON.stringify(existingFailed));
          console.log('[PatientDetailDrawer] 💾 Failed update stored locally for retry:', failedUpdate);
        } catch (storageError) {
          console.warn('[PatientDetailDrawer] ⚠️ Could not store failed update locally:', storageError);
        }
        
        throw new Error(errorData.error || 'Sync failed');
      }

      const responseData = await res.json();
      setSyncing();
      
      console.log('[PatientDetailDrawer] ✅ Save successful, response:', responseData);

      // Verify API response contains expected persisted updates
      if (!responseData.success || !responseData.patient) {
        throw new Error('Invalid API response: missing success flag or patient object');
      }

      // Check each updated field against response
      const mismatches: string[] = [];
      Object.entries(payload).forEach(([key, val]) => {
        if (key === 'id' || key === 'updated_at') return;
        const responseVal = responseData.patient[key];
        
        if (CLINICAL_DATE_COLUMNS.has(key as any)) {
          const normVal = val ? new Date(val).toISOString().split('T')[0] : null;
          const normResp = responseVal ? new Date(responseVal).toISOString().split('T')[0] : null;
          if (normVal !== normResp) {
            mismatches.push(`${key}: expected ${normVal}, got ${normResp}`);
          }
        } else {
          const strVal = val !== null && val !== undefined ? String(val).trim() : '';
          const strResp = responseVal !== null && responseVal !== undefined ? String(responseVal).trim() : '';
          if (strVal !== strResp) {
            mismatches.push(`${key}: expected "${strVal}", got "${strResp}"`);
          }
        }
      });

      if (mismatches.length > 0) {
        console.warn('[PatientDetailDrawer] ⚠️ API response verification warning - field mismatch:', mismatches);
      } else {
        console.log('[PatientDetailDrawer] ✅ API response verification: all fields match!');
      }

      console.log('[PatientDetailDrawer] 🔍 Response patient clinical fields:', {
        referral_date: responseData.patient?.referral_date,
        referred_facility: responseData.patient?.referred_facility,
        tb_diagnosed: responseData.patient?.tb_diagnosed,
        tb_diagnosis_date: responseData.patient?.tb_diagnosis_date,
        att_start_date: responseData.patient?.att_start_date,
        hiv_status: responseData.patient?.hiv_status
      });
      
      // Update local state with confirmed server data
      if (responseData.patient) {
        setLocalPatient(responseData.patient);
        // Update canonical patient so form reset effect uses fresh server data
        setFetchedPatient(responseData.patient);
        
        justSavedRef.current = false;
        justSavedTimestampRef.current = Date.now();
        
        // Keep current form values clean (user already sees correct values)
        reset(getValues(), { keepValues: true, keepDirty: false });
      }
      
      // Optimistic SWR mutation with confirmed data and revalidate bulk API
      await mutate(
        (key: unknown) => {
          // Revalidate all patient-related keys
          if (typeof key === 'string' && key.startsWith('/api/patients')) return true;
          if (Array.isArray(key) &&
              ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
          return false;
        },
        responseData.patient, // Provide the updated data directly
        { revalidate: true } // Do revalidate to get fresh data for parent
      );
      onUpdate();
      
      setHasUnsavedChanges(false);
      setSynced(responseData.patient.sheets_synced_at || new Date().toISOString());
      
      toast.success('✅ Clinical data saved successfully', { id: 'clinical-save' });
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to sync');
      toast.error('❌ Failed to save. Please try again.');
    } finally {
      console.log('[PatientDetailDrawer] 🔄 Finally block reached - resetting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  // Real-time updates using centralized hook
  usePatientRealtimeUpdates({
    patientId: patient?.id || '',
    isEditing: isEditingDemographics || isDirty, // Block updates when form is dirty
    onUpdate: (data) => {
      console.log('[PatientDetailDrawer] Realtime update received:', data);
      console.log('[PatientDetailDrawer] Form isDirty:', isDirty);
      console.log('[PatientDetailDrawer] isEditingDemographics:', isEditingDemographics);
      
      // Update local patient state (for display only)
      setLocalPatient(data);
      setEditedDemographics(mapDemographics(data));
      
      // Check if sheets sync completed
      if (data.synced_to_sheets === true && status.state === 'syncing') {
        setSynced(data.sheets_synced_at || new Date().toISOString());
      }
      
      // CRITICAL FIX: Update form values with realtime data when NOT editing
      // This ensures clinical tab reflects updates in real-time
      if (!isDirty && !isEditingDemographics) {
        console.log('[PatientDetailDrawer] ✅ Updating form with realtime data');
        // Build update object with formatted dates
        const formUpdates: Record<string, any> = {};
        for (const [formKey, dbColumn] of Object.entries(CLINICAL_FORM_FIELD_TO_COLUMN)) {
          const value = data[dbColumn];
          if (value !== undefined && value !== null) {
            // Format dates for HTML5 date inputs
            if (formKey.toLowerCase().includes('date')) {
              formUpdates[formKey] = formatDateForInput(value);
            } else {
              formUpdates[formKey] = value;
            }
          } else {
            // Set empty string for null/undefined values to clear the field
            formUpdates[formKey] = '';
          }
        }
        
        console.log('[PatientDetailDrawer] Form updates to apply:', formUpdates);
        
        // Update form values without marking as dirty
        // Use Object.keys to iterate and setValue individually for better reactivity
        Object.entries(formUpdates).forEach(([key, value]) => {
          setValue(key as any, value, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
        });
        
        console.log('[PatientDetailDrawer] ✅ Form values updated successfully');
      } else {
        console.log('[PatientDetailDrawer] ⏸️ Skipping form update - user is editing');
      }
    }
  });

  const handleSaveDemographics = async (demographicsOverride?: Record<string, any>) => {
    setIsSavingDemographics(true);
    setSaving(); // Set sync status to saving

    // Use merged demographics if provided, otherwise use editedDemographics
    const demographicsToSave = demographicsOverride || editedDemographics;
    console.log('[PatientDetailDrawer] Using demographics for save:', demographicsToSave);

    try {
      // Canonical mapping of all editable fields from UI (snake_case) to DB columns
      const DEMOGRAPHICS_EDITABLE_FIELDS: Record<string, string> = {
        // Identity & Contact
        father_husband_name: 'father_husband_name',
        date_of_birth: 'date_of_birth',
        age: 'age',
        sex: 'sex',
        inmate_type: 'inmate_type',
        contact_number: 'contact_number',
        address: 'address',
        inmate_type_other: 'inmate_type_other',
        inmate_name: 'inmate_name',
        
        // Screening Encounter
        screening_date: 'screening_date',
        facility_name: 'facility_name',
        facility_type: 'facility_type',
        screening_state: 'screening_state',
        screening_district: 'screening_district',
        staff_name: 'staff_name',
        submitted_on: 'submitted_on',
        screening_state_other: 'screening_state_other',
        screening_district_other: 'screening_district_other',
        
        // Diagnostics & Treatment
        xray_result: 'xray_result',
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'Date of referral for TB Examination (sputum) (dd/mm/yy)',
        'Name of facility where referred to (Give code/name of all facilities)': 'Name of facility where referred to (Give code/name of all facilities)',
        tb_past_history: 'tb_past_history',
        tb_diagnosed_select: 'tb_diagnosed',
        diagnosis_date: 'diagnosis_date',
        att_start_date: 'att_start_date',
        referral_date: 'referral_date',
        referred_to_facility: 'referred_to_facility',
        referred_to_facility_other: 'referred_to_facility_other',
        treatment_regimen: 'treatment_regimen',
        
        // HIV / ART Status
        hiv_status: 'hiv_status',
        art_started: 'art_started',
        art_center: 'art_center',
        cpt_given: 'cpt_given',
        
        // Registration & System
        unique_id: 'unique_id',
        nikshay_id: 'nikshay_id',
        abha_id: 'abha_id'
      };

      // Build payload programmatically from demographicsToSave
      const payload: Record<string, any> = {
        id: localPatient.kobo_uuid || localPatient.id, // Use kobo_uuid as primary identifier, fallback to id
        updated_at: new Date().toISOString()
      };

      // Include all fields that have values in demographicsToSave
      for (const [uiKey, dbColumn] of Object.entries(DEMOGRAPHICS_EDITABLE_FIELDS)) {
        if (demographicsToSave[uiKey] !== undefined) {
          payload[dbColumn] = demographicsToSave[uiKey];
        }
      }

      // Development safeguard: warn if any field in demographicsToSave is not mapped
      if (process.env.NODE_ENV === 'development') {
        for (const key of Object.keys(demographicsToSave)) {
          if (!DEMOGRAPHICS_EDITABLE_FIELDS[key] && key !== 'symptoms10s') {
            console.warn(`[PatientDetailDrawer] ⚠️ Unmapped field in demographicsToSave: "${key}"`);
          }
        }
      }

      console.log('[PatientDetailDrawer] 🔍 BEFORE SAVE - editedDemographics.screeningdate:', editedDemographics.screeningdate, '(type:', typeof editedDemographics.screeningdate, ')');
      console.log('[patient-sync] 🔍 PAYLOAD screening_date:', payload.screening_date, '(type:', typeof payload.screening_date, ')');
      console.log('[PatientDetailDrawer] 🔍 DEMOGRAPHICS Patient data structure:', {
        id: localPatient.id,
        kobo_uuid: localPatient.kobo_uuid,
        unique_id: localPatient.unique_id,
        hasKoboUuid: !!localPatient.kobo_uuid,
        finalPatientId: localPatient.kobo_uuid || localPatient.id
      });
      console.log('[PatientDetailDrawer] 🔍 FULL PAYLOAD being sent:', JSON.stringify(payload));
      
      // CHANGE 4: Optimistic update — show changes immediately before API confirms
      const optimisticPatient = { 
        ...localPatient, 
        ...Object.fromEntries(
          Object.entries(payload).filter(([_, v]) => v !== undefined)
        )
      };
      setLocalPatient(optimisticPatient);

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.kobo_uuid || localPatient.id, // Use kobo_uuid as primary identifier, fallback to id
          updates: payload
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Sync failed');
        throw new Error(errorData.error || 'Save failed');
      }

      const responseData = await res.json();
      setSyncing(); // Set sync status to syncing

      console.log('[PatientDetailDrawer] ✅ Demographics save successful, response:', responseData);
      console.log('[PatientDetailDrawer] 🔍 RESPONSE patient screening_date:', responseData.patient?.screening_date, '(type:', typeof responseData.patient?.screening_date, ')');
      console.log('[PatientDetailDrawer] 🔍 RESPONSE patient ALL fields:');
      if (responseData.patient) {
        for (const [k, v] of Object.entries(responseData.patient)) {
          console.log(`[PatientDetailDrawer]   "${k}": "${v}" (type: ${typeof v})`);
        }
      }

      // CHANGE 3: Update local state with server-confirmed data and set synced status
      if (responseData.patient) {
        setLocalPatient(responseData.patient);
        setEditedDemographics(mapDemographics(responseData.patient));
        setSynced(
          responseData.patient.sheets_synced_at || new Date().toISOString()
        );
      }
      
      // CHANGE 1: Non-blocking background cache refresh — do NOT await
      // The UI already has the correct data from responseData.patient
      mutate(
        (key: unknown) => {
          if (Array.isArray(key) &&
              ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
          return false;
        },
        undefined,
        { revalidate: true }
      ).catch(err => 
        console.warn('[demographics] Background SWR revalidation failed:', err)
      );
      
      setIsEditingDemographics(false);
      setHasUnsavedChanges(false);
      onUpdate();

      // Update form default values to mark changes as clean
      const currentValues = getValues();
      reset(currentValues, { keepValues: true });

      // Show success toast
      toast.success('✅ Demographics saved to Supabase & Google Sheets', { 
        id: 'demo-save',
        description: 'Changes synced successfully'
      });
      
      // CHANGE 2: Removed redundant Supabase re-fetch
      // responseData.patient from the API already contains the confirmed persisted state
    } catch (error) {
      console.error('[handleSaveDemographics] Save failed:', error);
      setError('Failed to sync');
      
      // Still update local state even if server sync fails
      const updatedPatient = { ...localPatient, ...editedDemographics };
      setLocalPatient(updatedPatient);
      setIsEditingDemographics(false);
      setHasUnsavedChanges(false);
      
      // Update form default values to mark changes as clean
      const currentValues = getValues();
      reset(currentValues, { keepValues: true });
      
      // Save to localStorage as backup
      localStorage.setItem(`patient-${localPatient.id}-backup`, JSON.stringify(updatedPatient));
      
      toast.error('❌ Failed to save. Changes saved locally.', { id: 'demo-save', duration: 5000 });
    } finally {
      setIsSavingDemographics(false);
    }
  };

  const handleCloseLoop = async (reason: string) => {
    if (!reason) return;
    setIsSubmitting(true);

    try {
      const payload = {
        id: localPatient.id,
        tb_diagnosed: 'N',
        closure_reason: reason,
        remarks: `Loop closed: ${reason}`,
        updated_at: new Date().toISOString()
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Save failed');
      }

      await mutate(
        (key: unknown) => {
          if (Array.isArray(key) &&
              ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
          return false;
        },
        undefined,
        { revalidate: true }
      );
      onUpdate();
      setHasUnsavedChanges(false);
      setInternalOpen(false);
      onClose();

      toast.success('✅ Loop closed successfully', { id: 'close-loop' });
    } catch (error) {
      toast.error('❌ Failed to close loop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const risk = useMemo(
    () => calculatePatientRisk(localPatient),
    [localPatient]
  );

  if (!patient) return null;

  if (!localPatient) {
    return (
      <Sheet open={internalOpen} onOpenChange={handleClose}>
        <SheetContent hideCloseButton className="w-full md:w-[90vw] md:max-w-[850px] lg:max-w-[1024px] xl:max-w-[1280px] !z-[500] p-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading patient data...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={internalOpen} onOpenChange={handleClose}>
      <SheetContent 
        hideCloseButton
        className="w-full md:w-[90vw] md:max-w-[850px] lg:max-w-[1024px] xl:max-w-[1280px] !z-[500] p-0 flex flex-col overflow-hidden"
        onEscapeKeyDown={(e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            handleClose(false);
          }
        }}
        onPointerDownOutside={(e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            handleClose(false);
          }
        }}
      >
        {!isAuthorized ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Access Denied</h3>
            <p className="text-sm text-slate-500">
              This patient belongs to <span className="font-bold text-slate-700">{localPatient.screening_state}</span>.
              Your account is scoped to <span className="font-bold text-slate-700">{scope?.state}</span>.
            </p>
          </div>
        ) : (
          <>
            {/* ── Compact 72px header ── */}
            <SheetHeader className="shrink-0 p-0 border-0">
              <div className="flex items-center gap-3 px-7 py-3 border-b border-black/[0.06] bg-white">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/20">
                  <span className="text-sm font-black text-white leading-none">
                    {localPatient?.inmate_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name + risk indicator */}
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                      {localPatient?.inmate_name || 'Loading...'}
                    </SheetTitle>
                    {risk.riskLevel === 'high' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title={risk.reason} />
                    )}
                  </div>
                  {/* Row 2: Single line — all meta with breathing room */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const items = [
                        localPatient?.facility_type,
                        localPatient?.facility_name,
                        localPatient?.screening_state,
                        localPatient?.age ? `${localPatient.age} yrs` : null,
                        localPatient?.sex ? String(localPatient.sex).toLowerCase() : null,
                        localPatient?.inmate_type || null,
                        localPatient?.screening_date ? `Screened: ${String(localPatient.screening_date).slice(0, 10)}` : null,
                      ].filter(Boolean) as string[];
                      return items.map((item, i) => (
                        <span key={i} className="flex items-center gap-2">
                          {i > 0 && <span className="w-[3px] h-[3px] rounded-full bg-slate-300 flex-shrink-0" />}
                          <span className="text-[12px] font-bold text-slate-700 leading-none">{item}</span>
                        </span>
                      ));
                    })()}
                    <span className="inline-flex items-center gap-1 bg-slate-900 text-white rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest flex-shrink-0">
                      <span className="w-1 h-1 rounded-full bg-white/50" />
                      {phase ?? 'Screening'}
                    </span>
                    <SyncStatusBadge
                      state={status.state}
                      message={status.message}
                      lastSyncedAt={status.lastSyncedAt}
                    />
                  </div>

                </div>
                <button onClick={() => handleClose(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors duration-150" aria-label="Close drawer">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

            </SheetHeader>

            <Tabs defaultValue="clinical" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 28px' }}>
                <TabsList className="bg-transparent gap-0 h-10 w-full justify-start rounded-none p-0">
                  <TabsTrigger
                    value="clinical"
                    data-tour-id="clinical-tab"
                    className="rounded-none h-10 px-1 mr-6 text-[12px] font-bold tracking-[0.04em] uppercase text-slate-400 border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 data-[state=active]:border-gray-900 hover:text-slate-600 transition-colors"
                  >
                    Clinical
                  </TabsTrigger>
                  <TabsTrigger
                    value="demographics"
                    data-tour-id="demographics-tab"
                    className="rounded-none h-10 px-1 mr-6 text-[12px] font-bold tracking-[0.04em] uppercase text-slate-400 border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 data-[state=active]:border-gray-900 hover:text-slate-600 transition-colors"
                  >
                    Demographics
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="w-full h-full flex flex-col">
                  <TabsContent value="clinical" className="mt-0 p-6 pb-6">
                    {!fetchedPatient ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 animate-pulse">
                        <Sparkles className="w-8 h-8 animate-spin text-slate-400" />
                        <p className="text-[13px] font-medium">Loading clinical record from server...</p>
                      </div>
                    ) : (
                      (() => {
                      // Debug: Log step indicator logic
                      console.log('[PatientDetailDrawer] 🚦 Step Indicator Debug:');
                      console.log('  watchedReferralDate:', watchedReferralDate);
                      console.log('  watchedFacility:', watchedFacility);
                      console.log('  watchedTbDiagnosed:', watchedTbDiagnosed);
                      console.log('  watchedDiagnosisDate:', watchedDiagnosisDate);
                      console.log('  watchedAttStart:', watchedAttStart);
                      console.log('  watchedHivStatus:', watchedHivStatus);
                      console.log('  watchedNikshay:', watchedNikshay);
                      console.log('  localPatient data:', {
                        referral_date: localPatient.referral_date,
                        referred_facility: localPatient.referred_facility,
                        tb_diagnosed: localPatient.tb_diagnosed,
                        tb_diagnosis_date: localPatient.tb_diagnosis_date,
                        att_start_date: localPatient.att_start_date,
                        hiv_status: localPatient.hiv_status,
                        nikshay_abha_id: localPatient.nikshay_abha_id
                      });
                      
                      // Calculate step completion status
                      const sputumComplete = Boolean((watchedReferralDate || localPatient.referral_date) && (watchedFacility || localPatient.referred_facility));
                      const diagnosisComplete = Boolean((watchedTbDiagnosed || localPatient.tb_diagnosed) && (watchedDiagnosisDate || localPatient.tb_diagnosis_date));
                      const treatmentComplete = Boolean(watchedAttStart || localPatient.att_start_date);
                      const hivComplete = Boolean(watchedHivStatus || localPatient.hiv_status);
                      const nikshayComplete = Boolean(watchedNikshay || localPatient.nikshay_abha_id);
                      
                      console.log('  Step completion status:');
                      console.log('    Sputum & Referral:', sputumComplete);
                      console.log('    Diagnosis:', diagnosisComplete);
                      console.log('    Treatment:', treatmentComplete);
                      console.log('    HIV & ART:', hivComplete);
                      console.log('    Nikshay:', nikshayComplete);

                      const isStale = phase !== 'Closed' && (() => {
                        const sd = localPatient?.screening_date;
                        if (!sd) return false;
                        const d = new Date(sd);
                        if (isNaN(d.getTime())) return false;
                        return (Date.now() - d.getTime()) / 86400000 > 5;
                      })();

                      const showTreatmentAndNikshay = watchedTbDiagnosed === 'Y';

                      const clinicalSections = [
                        {
                          id: 'sputum',
                          title: 'Sputum & Referral',
                          icon: <FileText className="w-4 h-4" />,
                          isComplete: sputumComplete,
                          isCurrent: !sputumComplete && phase === 'Sputum Test',
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale && phase === 'Sputum Test',
                        },
                        {
                          id: 'diagnosis',
                          title: 'Diagnosis',
                          icon: <Activity className="w-4 h-4" />,
                          isComplete: diagnosisComplete,
                          isCurrent: !diagnosisComplete && sputumComplete && phase === 'Diagnosis',
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale && phase === 'Diagnosis',
                        },
                        ...(showTreatmentAndNikshay ? [
                          {
                            id: 'treatment',
                            title: 'Treatment',
                            icon: <Pill className="w-4 h-4" />,
                            isComplete: treatmentComplete,
                            isCurrent: !treatmentComplete && diagnosisComplete && phase === 'ATT Initiation',
                            completionLabel: 'Submitted',
                            pendingLabel: 'Pending',
                            currentLabel: 'In Progress',
                            isAttentionRequired: isStale && phase === 'ATT Initiation',
                          }
                        ] : []),
                        {
                          id: 'hiv',
                          title: 'HIV & ART Status',
                          icon: <Shield className="w-4 h-4" />,
                          isComplete: hivComplete,
                          isCurrent: !hivComplete && (showTreatmentAndNikshay ? treatmentComplete : diagnosisComplete),
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale,
                        },
                        ...(showTreatmentAndNikshay ? [
                          {
                            id: 'nikshay',
                            title: 'Nikshay & Registration',
                            icon: <ClipboardList className="w-4 h-4" />,
                            isComplete: nikshayComplete,
                            isCurrent: false,
                            completionLabel: 'Submitted',
                            pendingLabel: 'Pending',
                            currentLabel: 'In Progress',
                          }
                        ] : []),
                      ];

                      return (
                        <>
                          {/* ── Horizontal Hover Accordion sections ── */}
                          <div className="flex gap-3 h-[260px] mt-4">
                            {clinicalSections.map((section, index) => (
                              <HorizontalHoverAccordion
                                key={section.id}
                                title={section.title}
                                icon={section.icon}
                                isComplete={section.isComplete}
                                isCurrent={section.isCurrent}
                                isAttentionRequired={section.isAttentionRequired}
                                completionLabel={section.completionLabel}
                                pendingLabel={section.pendingLabel}
                                currentLabel={section.currentLabel}
                              >
                                {section.id === 'sputum' && (
                                  <div data-tour-id="sputum-referral-section" className="space-y-3">
                                    <EditableField label="Referral Date" value={watchedReferralDate} onChange={(val) => setValue('Date of referral for TB Examination (sputum) (dd/mm/yy)', val, { shouldDirty: true })} type="date" />
                                    <EditableSelect
                                      label="Referred Facility"
                                      value={watchedFacility}
                                      onChange={(val) => setValue('Name of facility where referred to (Give code/name of all facilities)', val, { shouldDirty: true })}
                                      options={[
                                        { value: '', label: 'Select facility' },
                                        { value: 'DMC-Designated microscopy centre', label: 'DMC-Designated microscopy centre' },
                                        { value: 'TDC-TB Diagnostic Centre', label: 'TDC-TB Diagnostic Centre' },
                                        { value: 'CBNAAT', label: 'CBNAAT' },
                                        { value: 'DST-Drug susceptibility testing', label: 'DST-Drug susceptibility testing' },
                                        { value: 'Radiology', label: 'Radiology' },
                                        { value: 'Histopathology', label: 'Histopathology' },
                                        { value: 'ART Centre', label: 'ART Centre' },
                                        { value: 'Pvt. & Others', label: 'Pvt. & Others' },
                                        { value: 'Other', label: 'Other (specify)' }
                                      ]}
                                    />
                                    {watchedFacility === 'Other' && (
                                      <EditableField 
                                        label="Specify Other Facility" 
                                        value={watch('Other Facility Name') || ''} 
                                        onChange={(val) => setValue('Other Facility Name', val, { shouldDirty: true })} 
                                      />
                                    )}
                                  </div>
                                )}
                                {section.id === 'diagnosis' && (
                                  <div data-tour-id="diagnosis-section" className="space-y-3">
                                    <EditableSelect
                                      label="TB Diagnosed"
                                      value={watchedTbDiagnosed}
                                      onChange={(val) => setValue('TB diagnosed (Y/N)', val, { shouldDirty: true })}
                                      options={[
                                        { value: '', label: 'Select' }, 
                                        { value: 'Y', label: 'Yes' }, 
                                        { value: 'N', label: 'No' }
                                      ]}
                                    />
                                    {watchedTbDiagnosed === 'Y' && (
                                      <>
                                        <EditableField label="Date of Diagnosis" value={watchedDiagnosisDate} onChange={(val) => setValue('Date of TB Diagnosed (dd/mm/yy)', val, { shouldDirty: true })} type="date" />
                                        <EditableSelect
                                          label="Type of TB"
                                          value={watch('Type of TB Diagnosed (P/EP)')}
                                          onChange={(val) => setValue('Type of TB Diagnosed (P/EP)', val, { shouldDirty: true })}
                                          options={[
                                            { value: '', label: 'Select' },
                                            { value: 'Pulmonary', label: 'Pulmonary' },
                                            { value: 'Extrapulmonary Tuberculosis', label: 'Extrapulmonary Tuberculosis' },
                                            { value: 'Unknown', label: 'Unknown' }
                                          ]}
                                        />
                                      </>
                                    )}
                                    {watchedTbDiagnosed === 'N' && (
                                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 mt-1">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Clinical Notice</p>
                                        <p className="text-[11.5px] text-slate-300 font-medium leading-relaxed">
                                          Downstream treatment and Nikshay fields are skipped because TB was not diagnosed. Use "Close Loop (Not TB)" below to close this patient's case.
                                        </p>
                                      </div>
                                    )}
                                    {watchedTbDiagnosed === '' && (
                                      <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl mt-1">
                                        <p className="text-[11.5px] text-slate-400 italic">Select TB Diagnosed to reveal further fields.</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {section.id === 'treatment' && (
                                  <div data-tour-id="att-initiation-section" className="space-y-3">
                                    <EditableField label="Start Date" value={watchedAttStart} onChange={(val) => setValue('Date of starting ATT (dd/mm/yyyy)', val, { shouldDirty: true })} type="date" />
                                    <EditableField label="Completion Date" value={watch('Date of Treatment Completion (dd/mm/yyyy)')} onChange={(val) => setValue('Date of Treatment Completion (dd/mm/yyyy)', val, { shouldDirty: true })} type="date" />
                                  </div>
                                )}
                                {section.id === 'hiv' && (
                                  <div data-tour-id="hiv-art-section" className="space-y-3">
                                    <EditableSelect
                                      label="HIV Status"
                                      value={watchedHivStatus}
                                      onChange={(val) => setValue('HIV Status (Positive/Negative/Unknown)', val, { shouldDirty: true })}
                                      options={[
                                        { value: '', label: 'Select' },
                                        { value: 'Positive', label: 'Positive' },
                                        { value: 'Negative', label: 'Negative' },
                                        { value: 'Unknown', label: 'Unknown' }
                                      ]}
                                    />
                                    {watchedHivStatus === 'Positive' && (
                                      <>
                                        <EditableSelect
                                          label="ART Status"
                                          value={watchedArtStatus}
                                          onChange={(val) => setValue('Status at the time of referral (Pre ART/On ART)', val, { shouldDirty: true })}
                                          options={[
                                            { value: '', label: 'Select' },
                                            { value: 'Pre ART', label: 'Pre ART' },
                                            { value: 'On ART', label: 'On ART' }
                                          ]}
                                        />
                                        {watchedArtStatus === 'On ART' && (
                                          <EditableField label="ART Number" value={watch('ART Number (if on ART at the time of referral)')} onChange={(val) => setValue('ART Number (if on ART at the time of referral)', val, { shouldDirty: true })} />
                                        )}
                                        {watchedArtStatus === 'Pre ART' && (
                                          <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl mt-1">
                                            <p className="text-[11.5px] text-slate-300 font-medium">
                                              ART Number not required for Pre ART status.
                                            </p>
                                          </div>
                                        )}
                                        {watchedArtStatus === '' && (
                                          <div className="p-2 bg-white/5 border border-white/10 rounded-xl mt-1">
                                            <p className="text-[11.5px] text-slate-400 italic">Select ART Status to reveal ART Number.</p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {(watchedHivStatus === 'Negative' || watchedHivStatus === 'Unknown') && (
                                      <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl mt-1">
                                        <p className="text-[11.5px] text-slate-300 font-medium">
                                          ART details not required for HIV {watchedHivStatus} status.
                                        </p>
                                      </div>
                                    )}
                                    {watchedHivStatus === '' && (
                                      <div className="p-2 bg-white/5 border border-white/10 rounded-xl mt-1">
                                        <p className="text-[11.5px] text-slate-400 italic">Select HIV Status to reveal ART details.</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {section.id === 'nikshay' && (
                                  <div data-tour-id="nikshay-section" className="space-y-3">
                                    <EditableField label="Nikshay ID" value={watchedNikshay} onChange={(val) => setValue('NIKSHAY/ABHA ID', val, { shouldDirty: true })} />
                                    <EditableField label="Registration Date" value={watch('Date of registration (dd/mm/yyyy)')} onChange={(val) => setValue('Date of registration (dd/mm/yyyy)', val, { shouldDirty: true })} type="date" />
                                  </div>
                                )}
                              </HorizontalHoverAccordion>
                            ))}
                          </div>
                          
                          <ClinicalTimeline
                            screeningDate={localPatient?.screening_date}
                            xrayResult={localPatient?.xray_result || localPatient?.chest_x_ray_result}
                            symptoms10s={localPatient?.symptoms_10s || localPatient?.symptoms_present}
                            referralDate={watchedReferralDate}
                            referredFacility={watchedFacility}
                            tbDiagnosed={watchedTbDiagnosed}
                            diagnosisDate={watchedDiagnosisDate}
                            attStartDate={watchedAttStart}
                            nikshayId={watchedNikshay}
                            treatmentCompletionDate={watchedAttCompletion}
                            closureReason={localPatient?.closure_reason}
                          />
                        </>
                      );
                    })())}
                  </TabsContent>

                  <TabsContent value="demographics" className="mt-0 h-full flex flex-col">
                    <DemographicsCarousel
                      patient={localPatient}
                      editedDemographics={editedDemographics}
                      setEditedDemographics={setEditedDemographics as React.Dispatch<React.SetStateAction<Record<string, any>>>}
                      isEditingDemographics={isEditingDemographics}
                      setIsEditingDemographics={setIsEditingDemographics}
                    />
                    {/* Legacy sections preserved below for reference */}
                    <div className="p-4 space-y-0 hidden">
                      {/* Lock/Unlock Toggle */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 mb-5">
                        <div className="flex items-center gap-2">
                          {isEditingDemographics ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{isEditingDemographics ? 'Editing — Sections 1–4 unlocked' : 'Read-Only'}</span>
                        </div>
                        <button
                          onClick={() => setIsEditingDemographics(!isEditingDemographics)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${isEditingDemographics ? 'bg-white text-slate-600 border border-slate-200 shadow-sm' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {isEditingDemographics ? 'Lock' : 'Unlock to Edit'}
                        </button>
                      </div>

                      {/* ─────────────────────────────────────
                          §1 · Screening Details
                          koboid keys: staffname, submittedon, screeningstate,
                          screeningdistrict, facilitycode, facilitytype,
                          screeningdate, uniqueid
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Screening Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        {isEditingDemographics ? (
                          <>
                            <EditableField label="Name of the Staff" value={editedDemographics.staffname} onChange={(v) => setEditedDemographics({...editedDemographics, staffname: v})} />
                            <EditableField label="Submitted On" value={editedDemographics.submittedon} onChange={(v) => setEditedDemographics({...editedDemographics, submittedon: v})} type="date" />
                            <EditableField label="State" value={editedDemographics.screeningstate} onChange={(v) => setEditedDemographics({...editedDemographics, screeningstate: v})} />
                            <EditableField label="District" value={editedDemographics.screeningdistrict} onChange={(v) => setEditedDemographics({...editedDemographics, screeningdistrict: v})} />
                            <div className="col-span-2"><EditableField label="Facility Name" value={editedDemographics.facilitycode} onChange={(v) => setEditedDemographics({...editedDemographics, facilitycode: v})} /></div>
                            <EditableField label="Facility Type" value={editedDemographics.facilitytype} onChange={(v) => setEditedDemographics({...editedDemographics, facilitytype: v})} />
                            <EditableField label="Date of Screening — CH/X-Ray" value={editedDemographics.screeningdate} onChange={(v) => setEditedDemographics({...editedDemographics, screeningdate: v})} type="date" />
                            <div className="col-span-2"><EditableField label="Unique ID" value={editedDemographics.uniqueid} onChange={(v) => setEditedDemographics({...editedDemographics, uniqueid: v})} /></div>
                          </>
                        ) : (
                          <>
                            <ReadOnlyField label="Name of the Staff" value={editedDemographics.staffname} />
                            <ReadOnlyField label="Submitted On" value={editedDemographics.submittedon} />
                            <ReadOnlyField label="State" value={editedDemographics.screeningstate} />
                            <ReadOnlyField label="District" value={editedDemographics.screeningdistrict} />
                            <div className="col-span-2"><ReadOnlyField label="Facility Name" value={editedDemographics.facilitycode} /></div>
                            <ReadOnlyField label="Facility Type" value={editedDemographics.facilitytype} />
                            <ReadOnlyField label="Date of Screening — CH/X-Ray" value={editedDemographics.screeningdate} />
                            <div className="col-span-2"><ReadOnlyField label="Unique ID" value={editedDemographics.uniqueid} /></div>
                          </>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §2 · Identity
                          kobo keys: inmatename, inmatetype, fatherhusbandname,
                          dateofbirth, age, sex, contactnumber
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Identity</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        {isEditingDemographics ? (
                          <>
                            <div className="col-span-2"><EditableField label="Inmate Name" value={editedDemographics.inmatename} onChange={(v) => setEditedDemographics({...editedDemographics, inmatename: v})} /></div>
                            <div className="col-span-2"><EditableField label="Inmate Type" value={editedDemographics.inmatetype} onChange={(v) => setEditedDemographics({...editedDemographics, inmatetype: v})} /></div>
                            <div className="col-span-2"><EditableField label="Father / Husband's Name" value={editedDemographics.fatherhusbandname} onChange={(v) => setEditedDemographics({...editedDemographics, fatherhusbandname: v})} /></div>
                            <EditableField label="Date of Birth" value={editedDemographics.dateofbirth} onChange={(v) => setEditedDemographics({...editedDemographics, dateofbirth: v})} type="date" />
                            <EditableField label="Age" value={editedDemographics.age} onChange={(v) => setEditedDemographics({...editedDemographics, age: v})} />
                            <EditableSelect label="Sex" value={editedDemographics.sex} onChange={(v) => setEditedDemographics({...editedDemographics, sex: v})} options={[{value:'', label:'Select'}, {value:'Male', label:'Male'}, {value:'Female', label:'Female'}, {value:'TG', label:'Transgender'}]} />
                            <EditableField label="Contact Number" value={editedDemographics.contactnumber} onChange={(v) => setEditedDemographics({...editedDemographics, contactnumber: v})} />
                          </>
                        ) : (
                          <>
                            <div className="col-span-2"><ReadOnlyField label="Inmate Name" value={editedDemographics.inmatename} /></div>
                            <div className="col-span-2"><ReadOnlyField label="Inmate Type" value={editedDemographics.inmatetype} /></div>
                            <div className="col-span-2"><ReadOnlyField label="Father / Husband's Name" value={editedDemographics.fatherhusbandname} /></div>
                            <ReadOnlyField label="Date of Birth" value={editedDemographics.dateofbirth} />
                            <ReadOnlyField label="Age" value={editedDemographics.age} />
                            <ReadOnlyField label="Sex" value={editedDemographics.sex} />
                            <ReadOnlyField label="Contact Number" value={editedDemographics.contactnumber} />
                          </>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §3 · Location / Address
                          kobo key: address
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Location / Address</span>
                      </div>
                      <div className="mb-5">
                        {isEditingDemographics ? (
                          <EditableField label="Address" value={editedDemographics.address} onChange={(v) => setEditedDemographics({...editedDemographics, address: v})} />
                        ) : (
                          <ReadOnlyField label="Address" value={editedDemographics.address} />
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §4 · TB Screening
                          kobo keys: xrayresult, symptoms10s, tbpasthistory
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">TB Screening</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <div className="col-span-2">
                          {isEditingDemographics ? (
                            <EditableSelect
                              label="Chest X-Ray Result"
                              value={editedDemographics.xrayresult}
                              onChange={(v) => setEditedDemographics({...editedDemographics, xrayresult: v})}
                              options={[
                                { value: '', label: 'Select result' },
                                { value: 'Normal', label: 'Normal' },
                                { value: 'Suspected TB Case', label: 'Suspected TB Case' },
                                { value: 'Other Abnormality', label: 'Other Abnormality' },
                              ]}
                            />
                          ) : (
                            <>
                              <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400 mb-1">Chest X-Ray Result</label>
                              <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold ${
                                (localPatient?.xray_result || localPatient?.chest_x_ray_result) === 'Suspected TB Case'
                                  ? 'bg-amber-50 border border-amber-200/60 text-amber-700'
                                  : (localPatient?.xray_result || localPatient?.chest_x_ray_result)
                                  ? 'bg-emerald-50 border border-emerald-200/60 text-emerald-700'
                                  : 'bg-slate-50 border border-slate-200 text-slate-400'
                              }`}>
                                {(localPatient?.xray_result || localPatient?.chest_x_ray_result) === 'Suspected TB Case' && <AlertTriangle className="w-3.5 h-3.5" />}
                                {(localPatient?.xray_result || localPatient?.chest_x_ray_result) && (localPatient?.xray_result || localPatient?.chest_x_ray_result) !== 'Suspected TB Case' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {localPatient?.xray_result || localPatient?.chest_x_ray_result || 'Not recorded'}
                              </div>
                            </>
                          )}
                        </div>
                        {isEditingDemographics ? (
                          <>
                            <EditableSelect
                              label="10S Symptoms Present"
                              value={editedDemographics.symptoms10s}
                              onChange={(v) => setEditedDemographics({...editedDemographics, symptoms10s: v})}
                              options={[{value:'', label:'Select'}, {value:'Yes', label:'Yes'}, {value:'No', label:'No'}]}
                            />
                            <EditableSelect
                              label="Past History of TB"
                              value={editedDemographics.tbpasthistory}
                              onChange={(v) => setEditedDemographics({...editedDemographics, tbpasthistory: v})}
                              options={[{value:'', label:'Select'}, {value:'Yes', label:'Yes'}, {value:'No', label:'No'}]}
                            />
                          </>
                        ) : (
                          <>
                            <ReadOnlyField label="10S Symptoms Present" value={editedDemographics.symptoms10s} />
                            <ReadOnlyField label="Past History of TB" value={editedDemographics.tbpasthistory} />
                          </>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §5 · Referral / Diagnosis
                          Read-only mirror — clinical tab is the write path.
                          kobo keys: referraldate, referredfacility, tbdiagnosed,
                          tbdiagnosisdate, tbtype, attstartdate, attcompletiondate
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Referral / Diagnosis</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">Edit via Clinical tab</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <ReadOnlyField label="Date of Referral for TB Examination" value={localPatient?.referral_date} />
                        <ReadOnlyField label="Facility Referred To" value={localPatient?.referred_facility} />
                        <ReadOnlyField label="TB Diagnosed" value={localPatient?.tb_diagnosed} />
                        <ReadOnlyField label="Date of TB Diagnosis" value={localPatient?.tb_diagnosis_date} />
                        <ReadOnlyField label="Type of TB Diagnosed" value={localPatient?.tb_type} />
                        <ReadOnlyField label="Date of Starting ATT" value={localPatient?.att_start_date} />
                        <ReadOnlyField label="Date of Treatment Completion" value={localPatient?.att_completion_date} />
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §6 · HIV / ART
                          Read-only mirror — clinical tab is the write path.
                          kobo keys: hivstatus, artstatusatreferral, artnumber
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">HIV / ART</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">Edit via Clinical tab</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <ReadOnlyField label="HIV Status" value={localPatient?.hiv_status} />
                        <ReadOnlyField label="ART Status at Referral" value={localPatient?.art_status} />
                        <ReadOnlyField label="ART Number" value={localPatient?.art_number} />
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §7 · Nikshay / Registration
                          Read-only mirror — clinical tab is the write path.
                          kobo keys: nikshayabhaid, nikshayregistrationdate, remarks
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <ClipboardList className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Nikshay / Registration</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">Edit via Clinical tab</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <div className="col-span-2"><ReadOnlyField label="NIKSHAY / ABHA ID" value={localPatient?.nikshay_abha_id} /></div>
                        <ReadOnlyField label="Date of Nikshay Registration" value={localPatient?.registration_date} />
                        <ReadOnlyField label="Remarks" value={localPatient?.remarks} />
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ─────────────────────────────────────
                          §8 · Administrative Metadata
                          Always read-only.
                          kobo key: kobouuid
                      ───────────────────────────────────── */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Settings2 className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Administrative Metadata</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3 mb-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">KoboUUID</p>
                          <p className="text-[12px] font-mono font-medium text-slate-600 break-all leading-relaxed">
                            {localPatient?.kobo_uuid || <span className="text-slate-300 font-sans font-normal italic">Not recorded</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              {/* Action Bar - Fixed at bottom, only visible on Clinical Tab */}
              {activeTab === 'clinical' && (
                <div className="shrink-0 px-6 py-3 border-t border-black/[0.06] bg-white">
                  {!isClosed && !showCloseLoop && (
                    <button
                      data-tour-id="close-loop-button"
                      onClick={() => setShowCloseLoop(true)}
                      className="w-full h-[38px] rounded-[10px] text-[11px] font-bold uppercase tracking-[0.06em] text-red-600 flex items-center justify-center gap-1.5 mb-2 transition-all duration-150"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Close Loop (Not TB)
                    </button>
                  )}

                  {showCloseLoop && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-2 mb-2">
                      <p className="text-[10px] font-extrabold uppercase text-red-700 tracking-wider">Confirm Loop Closure</p>
                      <select onChange={(e) => handleCloseLoop(e.target.value)} className="w-full text-[13px] font-medium p-2.5 rounded-[10px] border-[1.5px] border-red-200 bg-white outline-none focus:border-red-400 focus:ring-[3px] focus:ring-red-500/10">
                        <option value="">Select reason...</option>
                        <option value="Negative sputum">Negative sputum</option>
                        <option value="CXR Normal">CXR Normal</option>
                        <option value="Not TB - Alternative diagnosis">Not TB - Alternative diagnosis</option>
                        <option value="Patient declined treatment">Patient declined treatment</option>
                        <option value="Transferred out">Transferred out</option>
                        <option value="Lost to follow-up">Lost to follow-up</option>
                        <option value="Died">Died</option>
                        <option value="Other">Other</option>
                      </select>
                      <button onClick={() => setShowCloseLoop(false)} className="text-[9px] font-bold text-red-400 uppercase hover:text-red-600 transition-colors">Cancel</button>
                    </div>
                  )}

                   {/* Always show save button on clinical tab */}
                  <button
                    data-tour-id="submit-clinical-update"
                    onClick={handleSaveClinical}
                    disabled={isSubmitting || !fetchedPatient || !isDirty}
                    className="w-full h-[52px] rounded-[14px] text-[13px] font-extrabold uppercase tracking-[0.08em] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', boxShadow: '0 4px 14px rgba(15,23,42,0.25), 0 1px 3px rgba(15,23,42,0.15)' }}
                  >
                    {isSubmitting ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 opacity-70" />
                    )}
                    {!fetchedPatient ? 'Loading Patient Data...' : isSubmitting ? 'Submitting...' : 'Submit Clinical Update'}
                  </button>
                </div>
              )}
            </Tabs>
          </>
        )}

      </SheetContent>
    </Sheet>
  );
}
