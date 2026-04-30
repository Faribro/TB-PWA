'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { User, FileText, Activity, Pill, Shield, ChevronDown, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save, ClipboardList, X, MapPin, XCircle, Search, ArrowRightCircle, Settings2, AlertTriangle, Zap, TrendingUp, Award, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { HorizontalHoverAccordion } from './ui/HorizontalHoverAccordion';
import { type PatientFormData } from '@/lib/schemas';
import { calculatePatientPhase } from '@/lib/phase-engine';
import PatientHistory from './PatientHistory';
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

const supabaseClient = getSupabaseBrowserClient();

interface PatientDetailDrawerProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col gap-0.5 group">
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400 mb-1">{label}</label>
    <div className="text-[13px] font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5 transition-all group-hover:bg-white group-hover:border-slate-300">
      {value || <span className="text-slate-300 font-normal italic">Not recorded</span>}
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

  useEffect(() => {
    if (patient && Object.keys(patient).length > 0) {
      setLocalPatient(patient);
    }
  }, [patient]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseLoop, setShowCloseLoop] = useState(false);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);
  const [internalOpen, setInternalOpen] = useState(isOpen);

  const { watch, getValues, reset, setValue, formState: { isDirty } } = useForm<PatientFormData>({
    defaultValues: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': patient?.referral_date || '',
      'Name of facility where referred to (Give code/name of all facilities)': patient?.referred_facility || '',
      'TB diagnosed (Y/N)': patient?.tb_diagnosed || '',
      'Date of TB Diagnosed (dd/mm/yy)': patient?.tb_diagnosis_date || '',
      'Date of starting ATT (dd/mm/yyyy)': patient?.att_start_date || '',
      'Date of Treatment Completion (dd/mm/yyyy)': patient?.att_completion_date || '',
      'NIKSHAY/ABHA ID': patient?.nikshay_abha_id || '',
      'Remarks': patient?.remarks || ''
    }
  });

  // Sync internal open state with prop
  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (localPatient) {
      reset({
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': localPatient.referral_date || '',
        'Name of facility where referred to (Give code/name of all facilities)': localPatient.referred_facility || '',
        'TB diagnosed (Y/N)': localPatient.tb_diagnosed || '',
        'Date of TB Diagnosed (dd/mm/yy)': localPatient.tb_diagnosis_date || '',
        'Type of TB Diagnosed (P/EP)': localPatient.tb_type || '',
        'Date of starting ATT (dd/mm/yyyy)': localPatient.att_start_date || '',
        'Date of Treatment Completion (dd/mm/yyyy)': localPatient.att_completion_date || '',
        'HIV Status (Positive/Negative/Unknown)': localPatient.hiv_status || '',
        'Status at the time of referral (Pre ART/On ART)': localPatient.art_status || '',
        'ART Number (if on ART at the time of referral)': localPatient.art_number || '',
        'NIKSHAY/ABHA ID': localPatient.nikshay_abha_id || '',
        'Remarks': localPatient.remarks || ''
      });
    }
  }, [localPatient, reset]);

  // ── Demographics State — Kobo-canonical keys with legacy fallbacks ──
  // Key names match the Kobo XLSX field names exactly. Supabase column mapping
  // happens in mapDemographics (read) and handleSaveDemographics (write).
  const mapDemographics = (p: any) => ({
    // §1 Screening Details
    staffname:         p?.staff_name         || p?.['Staff Name']            || p?.data_collector        || '',
    submittedon:       p?.submitted_on        || '',
    screeningstate:    p?.screening_state     || '',
    screeningdistrict: p?.screening_district  || p?.['District']              || '',
    facilitycode:      p?.facility_name       || p?.['Name of Facility']      || p?.facilitycode          || '',
    facilitytype:      p?.facility_type       || p?.['Facility Type']         || '',
    screeningdate:     p?.screening_date      || p?.['Date of Screening']     || '',
    uniqueid:          p?.unique_id           || '',
    // §2 Identity
    inmatename:        p?.inmate_name         || p?.['Inmate Name']           || p?.patient_name           || p?.name || '',
    inmatetype:        p?.inmate_type         || p?.['Inmate Type']           || '',
    fatherhusbandname: p?.father_husband_name || p?.['Father/Husband Name']   || p?.father_name            || '',
    dateofbirth:       p?.date_of_birth       || p?.['Date of Birth']         || p?.dob                    || '',
    age:               p?.age                 || p?.['Age']                   || '',
    sex:               p?.sex                 || p?.['Sex (Male/Female/TG)']  || p?.gender                 || '',
    contactnumber:     p?.contact_number      || p?.['Contact Number']        || p?.phone                  || p?.mobile || '',
    // §3 Location
    address:           p?.address             || p?.['Address']               || p?.residential_address    || '',
    // §4 TB Screening (editable in demographics, not in clinical accordion)
    xrayresult:        p?.xray_result         || p?.chest_x_ray_result        || '',
    symptoms10s:       p?.symptoms_10s        || p?.['Symptoms 10s']          || p?.symptoms_present       || '',
    tbpasthistory:     p?.tb_past_history     || p?.['Past TB History']       || p?.past_tb_history        || p?.tb_history || '',
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
    const formData = getValues();
    setSaving();
    setIsSubmitting(true);

    try {
      const payload = {
        id: localPatient.id,
        referral_date: formData['Date of referral for TB Examination (sputum) (dd/mm/yy)'],
        referred_facility: formData['Name of facility where referred to (Give code/name of all facilities)'],
        tb_diagnosed: formData['TB diagnosed (Y/N)'],
        tb_diagnosis_date: formData['Date of TB Diagnosed (dd/mm/yy)'],
        tb_type: formData['Type of TB Diagnosed (P/EP)'],
        att_start_date: formData['Date of starting ATT (dd/mm/yyyy)'],
        att_completion_date: formData['Date of Treatment Completion (dd/mm/yyyy)'],
        hiv_status: formData['HIV Status (Positive/Negative/Unknown)'],
        art_status: formData['Status at the time of referral (Pre ART/On ART)'],
        art_number: formData['ART Number (if on ART at the time of referral)'],
        nikshay_abha_id: formData['NIKSHAY/ABHA ID'],
        registration_date: formData['Date of registration (dd/mm/yyyy)'],
        remarks: formData['Remarks'],
        updated_at: new Date().toISOString()
      };

      console.log('[PatientDetailDrawer] 📤 Sending clinical update:', {
        patientId: localPatient.id,
        payload
      });

      // Optimistic update - update local state immediately
      const optimisticPatient = { ...localPatient, ...payload };
      setLocalPatient(optimisticPatient);
      
      // Update SWR cache optimistically
      mutate(
        (key: unknown) => {
          if (Array.isArray(key) &&
              ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
          return false;
        },
        (currentData: any) => {
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === localPatient.id ? optimisticPatient : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          updates: payload
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Revert optimistic update on error
        setLocalPatient(localPatient);
        mutate(
          (key: unknown) => {
            if (Array.isArray(key) &&
                ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
            return false;
          },
          undefined,
          { revalidate: true }
        );
        setError(errorData.error || 'Sync failed');
        throw new Error(errorData.error || 'Sync failed');
      }

      const responseData = await res.json();
      setSyncing();
      
      console.log('[PatientDetailDrawer] ✅ Save successful, response:', responseData);
      
      // Revalidate to ensure consistency
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
      
      // Clear isDirty after successful save
      reset(getValues(), { keepValues: true });
      setHasUnsavedChanges(false);
      
      // Show success toast
      toast.success('✅ Clinical data saved successfully', { id: 'clinical-save' });
      
      // FIX 3: Re-fetch from DB to confirm exact persisted state
      const { data: freshPatient, error: fetchError } = await supabaseClient
        .from('patients')
        .select('*')
        .eq('id', localPatient.id)
        .single();
      if (freshPatient && !fetchError) {
        setLocalPatient(freshPatient);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to sync');
      toast.error('❌ Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Realtime listener for sync confirmation
  useEffect(() => {
    if (!patient?.id) return;

    const channel = supabaseClient
      .channel(`patient-updates-${patient.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patient.id}`
        },
        (payload) => {
          console.log('[PatientDetailDrawer] Realtime update received:', payload.new);
          
          // Update local state with new data
          setLocalPatient(payload.new);
          setEditedDemographics(mapDemographics(payload.new));
          
          // Update SWR cache
          mutate(
            (key: unknown) => {
              if (Array.isArray(key) &&
                  ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
              return false;
            },
            undefined,
            { revalidate: false }
          );
          
          // Check if sheets sync completed
          if (payload.new.synced_to_sheets === true && status.state === 'syncing') {
            setSynced(payload.new.sheets_synced_at || new Date().toISOString());
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [patient?.id, status.state, setSynced, mutate]);

  const handleSaveDemographics = async () => {
    setIsSavingDemographics(true);

    try {
      // Map Kobo-canonical state keys → Supabase column names
      const payload = {
        id: localPatient.id,
        // §1 Screening Details
        staff_name:          editedDemographics.staffname,
        submitted_on:        editedDemographics.submittedon,
        screening_state:     editedDemographics.screeningstate,
        screening_district:  editedDemographics.screeningdistrict,
        facility_name:       editedDemographics.facilitycode,   // facilitycode Kobo key → facility_name Supabase col
        facility_type:       editedDemographics.facilitytype,
        screening_date:      editedDemographics.screeningdate,
        unique_id:           editedDemographics.uniqueid,
        // §2 Identity
        inmate_name:         editedDemographics.inmatename,
        inmate_type:         editedDemographics.inmatetype,
        father_husband_name: editedDemographics.fatherhusbandname,
        date_of_birth:       editedDemographics.dateofbirth,
        age:                 editedDemographics.age,
        sex:                 editedDemographics.sex,
        contact_number:      editedDemographics.contactnumber,
        // §3 Location
        address:             editedDemographics.address,
        // §4 TB Screening
        xray_result:         editedDemographics.xrayresult,
        symptoms_10s:        editedDemographics.symptoms10s,
        tb_past_history:     editedDemographics.tbpasthistory,
        updated_at:          new Date().toISOString()
      };

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          updates: payload
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const responseData = await res.json();

      // Optimistic update - update local state immediately
      const updatedPatient = { ...localPatient, ...editedDemographics };
      setLocalPatient(updatedPatient);
      
      // Update SWR cache with new data
      await mutate(
        (key: unknown) => {
          if (Array.isArray(key) &&
              ['patients', 'allPatients', 'patient'].includes(key[0] as string)) return true;
          return false;
        },
        (currentData: any) => {
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === localPatient.id ? updatedPatient : p
            );
          }
          return currentData;
        },
        { revalidate: false }  // Don't revalidate immediately since we just saved
      );
      
      setIsEditingDemographics(false);
      setHasUnsavedChanges(false);
      onUpdate();

      // Update form default values to mark changes as clean
      const currentValues = getValues();
      reset(currentValues, { keepValues: true });

      // Show success toast (API doesn't return sheetsSync field)
      toast.success('✅ Demographics saved successfully', { id: 'demo-save' });
      
      // FIX 3: Re-fetch from DB to confirm exact persisted state
      const { data: freshPatient, error: fetchError } = await supabaseClient
        .from('patients')
        .select('*')
        .eq('id', localPatient.id)
        .single();
      if (freshPatient && !fetchError) {
        setLocalPatient(freshPatient);
        setEditedDemographics(mapDemographics(freshPatient));
      }
    } catch (error) {
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
      console.error('[handleSaveDemographics] Save failed:', error);
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
        <SheetContent hideCloseButton className="w-[95vw] sm:max-w-[650px] md:max-w-[750px] lg:max-w-[850px] !z-[500] p-0 flex flex-col overflow-hidden">
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
        className="w-[95vw] sm:max-w-[650px] md:max-w-[750px] lg:max-w-[850px] !z-[500] p-0 flex flex-col overflow-hidden"
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
              <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] bg-white">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/20">
                  <span className="text-sm font-black text-white leading-none">
                    {localPatient?.inmate_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-[14px] font-black uppercase tracking-tight text-slate-900 leading-tight truncate">
                      {localPatient?.inmate_name || 'Loading...'}
                    </SheetTitle>
                    {risk.riskLevel === 'high' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title={risk.reason} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-bold text-blue-600 font-mono tracking-wide">{localPatient?.unique_id || ''}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">{localPatient?.facility_name}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300 flex-shrink-0" />
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

            <Tabs defaultValue="clinical" className="flex-1 flex flex-col min-h-0">
              <div style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 24px' }}>
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
                <div className="p-6">
                  <TabsContent value="clinical" className="mt-0">
                    {(() => {
                      const watchedReferralDate = watch('Date of referral for TB Examination (sputum) (dd/mm/yy)');
                      const watchedFacility = watch('Name of facility where referred to (Give code/name of all facilities)');
                      const watchedTbDiagnosed = watch('TB diagnosed (Y/N)');
                      const watchedDiagnosisDate = watch('Date of TB Diagnosed (dd/mm/yy)');
                      const watchedAttStart = watch('Date of starting ATT (dd/mm/yyyy)');
                      const watchedHivStatus = watch('HIV Status (Positive/Negative/Unknown)');
                      const watchedNikshay = watch('NIKSHAY/ABHA ID');

                      const isStale = phase !== 'Closed' && (() => {
                        const sd = localPatient?.screening_date;
                        if (!sd) return false;
                        const d = new Date(sd);
                        if (isNaN(d.getTime())) return false;
                        return (Date.now() - d.getTime()) / 86400000 > 5;
                      })();

                      const clinicalSections = [
                        {
                          id: 'sputum',
                          title: 'Sputum & Referral',
                          icon: <FileText className="w-4 h-4" />,
                          isComplete: Boolean(watchedReferralDate && watchedFacility),
                          isCurrent: !Boolean(watchedReferralDate && watchedFacility) && phase === 'Sputum Test',
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale && phase === 'Sputum Test',
                        },
                        {
                          id: 'diagnosis',
                          title: 'Diagnosis',
                          icon: <Activity className="w-4 h-4" />,
                          isComplete: Boolean(watchedTbDiagnosed && watchedDiagnosisDate),
                          isCurrent: !Boolean(watchedTbDiagnosed && watchedDiagnosisDate) && Boolean(watchedReferralDate && watchedFacility) && phase === 'Diagnosis',
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale && phase === 'Diagnosis',
                        },
                        {
                          id: 'treatment',
                          title: 'Treatment',
                          icon: <Pill className="w-4 h-4" />,
                          isComplete: Boolean(watchedAttStart),
                          isCurrent: !Boolean(watchedAttStart) && Boolean(watchedTbDiagnosed && watchedDiagnosisDate) && phase === 'ATT Initiation',
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                          isAttentionRequired: isStale && phase === 'ATT Initiation',
                        },
                        {
                          id: 'hiv',
                          title: 'HIV & ART Status',
                          icon: <Shield className="w-4 h-4" />,
                          isComplete: Boolean(watchedHivStatus),
                          isCurrent: false,
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                        },
                        {
                          id: 'nikshay',
                          title: 'Nikshay & Registration',
                          icon: <ClipboardList className="w-4 h-4" />,
                          isComplete: Boolean(watchedNikshay),
                          isCurrent: false,
                          completionLabel: 'Submitted',
                          pendingLabel: 'Pending',
                          currentLabel: 'In Progress',
                        },
                      ];

                      return (
                        <>
                          {/* ── Horizontal Hover Accordion sections ── */}
                          <div className="flex gap-3 h-80 mt-6">
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
                                        { value: 'DMC-Designated microscopy Centre', label: 'DMC' },
                                        { value: 'CBNAAT', label: 'CBNAAT' },
                                        { value: 'Radiology', label: 'Radiology' }
                                      ]}
                                    />
                                  </div>
                                )}
                                {section.id === 'diagnosis' && (
                                  <div data-tour-id="diagnosis-section" className="space-y-3">
                                    <EditableSelect
                                      label="TB Diagnosed"
                                      value={watchedTbDiagnosed}
                                      onChange={(val) => setValue('TB diagnosed (Y/N)', val, { shouldDirty: true })}
                                      options={[{ value: '', label: 'Select' }, { value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
                                    />
                                    <EditableField label="Date of Diagnosis" value={watchedDiagnosisDate} onChange={(val) => setValue('Date of TB Diagnosed (dd/mm/yy)', val, { shouldDirty: true })} type="date" />
                                    <EditableSelect
                                      label="Type of TB"
                                      value={watch('Type of TB Diagnosed (P/EP)')}
                                      onChange={(val) => setValue('Type of TB Diagnosed (P/EP)', val, { shouldDirty: true })}
                                      options={[
                                        { value: '', label: 'Select' },
                                        { value: 'P', label: 'Pulmonary (P)' },
                                        { value: 'EP', label: 'Extra-Pulmonary (EP)' }
                                      ]}
                                    />
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
                                    <EditableField label="ART Start Date" value={watch('Status at the time of referral (Pre ART/On ART)')} onChange={(val) => setValue('Status at the time of referral (Pre ART/On ART)', val, { shouldDirty: true })} type="date" />
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
                        </>
                      );
                    })()}
                  </TabsContent>

                  <TabsContent value="demographics" className="mt-0">
                    <div className="p-4 space-y-0">
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

              <div className="px-5 py-3 border-t border-black/[0.06] bg-white flex flex-col gap-2 shrink-0">
                {isEditingDemographics && (
                  <button onClick={handleSaveDemographics} disabled={isSavingDemographics} className="w-full h-[52px] rounded-[14px] text-[13px] font-extrabold uppercase tracking-[0.08em] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', boxShadow: '0 4px 14px rgba(15,23,42,0.25), 0 1px 3px rgba(15,23,42,0.15)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.30)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.25), 0 1px 3px rgba(15,23,42,0.15)'; }}>
                    {isSavingDemographics ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 opacity-70" />}
                    Save Demographics
                  </button>
                )}

                {!isEditingDemographics && phase !== 'Closed' && (
                  <button
                    data-tour-id="submit-clinical-update"
                    onClick={handleSaveClinical}
                    disabled={isSubmitting}
                    className="w-full h-[52px] rounded-[14px] text-[13px] font-extrabold uppercase tracking-[0.08em] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', boxShadow: '0 4px 14px rgba(15,23,42,0.25), 0 1px 3px rgba(15,23,42,0.15)' }}
                  >
                    {isSubmitting ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 opacity-70" />}
                    Submit Clinical Update
                  </button>
                )}

                {!isClosed && !showCloseLoop && (
                  <button
                    data-tour-id="close-loop-button"
                    onClick={() => setShowCloseLoop(true)}
                    className="w-full h-[38px] rounded-[10px] text-[11px] font-bold uppercase tracking-[0.06em] text-red-600 flex items-center justify-center gap-1.5 mt-1 transition-all duration-150"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Close Loop (Not TB)
                  </button>
                )}

                {showCloseLoop && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-2">
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
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
