'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Activity, Pill, Shield, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save } from 'lucide-react';
import { SyncIndicator } from './PatientDetailDrawer/components/SyncIndicator';
import { type PatientFormData } from '@/lib/schemas';
import { calculatePatientPhase, calculateProgressPercentage } from '@/lib/phase-engine';
import { PatientTimeline } from './PatientTimeline';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay, SheetPortal } from '@/components/ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useSWRConfig } from 'swr';
import { Z_INDEX } from '@/lib/zIndex';
import { toast } from 'sonner';
import { useSessionScope, isSuperuser } from '@/hooks/useSessionScope';

interface PatientDetailDrawerProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PatientDetailDrawer({ patient, isOpen, onClose, onUpdate }: PatientDetailDrawerProps) {
  const scope = useSessionScope();

  // Local state to hold patient data and allow updates after save
  const [localPatient, setLocalPatient] = useState(patient);

  // Sync localPatient, BUT preserve the last known data during the exit animation
  useEffect(() => {
    if (patient && Object.keys(patient).length > 0) {
      setLocalPatient(patient);
    }
  }, [patient]);

  // 💎 Awwwards Standard: Cinematic Stagger Physics
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08, // 80ms delay between each element popping in
        delayChildren: 0.35,   // Wait 350ms for the main drawer to slide out first
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
        mass: 1
      }
    }
  };

  // Task 3: Ownership guard — prevent viewing patients outside user's scope
  const isAuthorized =
    !scope ||                        // scope not loaded yet — allow render
    !localPatient ||                 // patient not loaded yet — allow render
    isSuperuser(scope) ||            // admin / PM / Program Manager see all
    !scope.state ||                  // national user (state is null)
    localPatient.screening_state === scope.state;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseLoop, setShowCloseLoop] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('');
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { mutate } = useSWRConfig();

  // Granular sync state for multi-system indicator (DB + Sheets only - Kobo is ingestion-only)
  const [syncState, setSyncState] = useState<{ db: 'idle' | 'syncing' | 'success' | 'error'; sheets: 'idle' | 'syncing' | 'success' | 'error' }>({
    db: 'idle',
    sheets: 'idle'
  });

  // Store last successful data for rollback on error
  const [lastKnownData, setLastKnownData] = useState<any>(null);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting && !isSavingDemographics) {
          if (isEditingDemographics) {
            handleSaveDemographics();
          } else {
            handleSaveClinical();
          }
        }
      }
      // Escape to close drawer
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isEditingDemographics, isSubmitting, isSavingDemographics]);

  // Reset save success indicator when drawer closes or patient changes
  useEffect(() => {
    if (!isOpen) {
      setSaveSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setSaveSuccess(false);
  }, [patient]);
  
  // Demographic edit state
  const [editedDemographics, setEditedDemographics] = useState({
    inmate_name: localPatient?.inmate_name || '',
    age: localPatient?.age || '',
    sex: localPatient?.sex || '',
    contact_number: localPatient?.contact_number || '',
    address: localPatient?.address || '',
    facility_name: localPatient?.facility_name || '',
    date_of_birth: localPatient?.date_of_birth || '',
    screening_date: localPatient?.screening_date || ''
  });

  const { phase, nextRequiredField } = calculatePatientPhase(localPatient);
  const progressPercentage = calculateProgressPercentage(localPatient);
  const isClosed = phase === 'Closed';
  
  // Auto-expand current phase section
  useEffect(() => {
    const phaseToSection: Record<string, string> = {
      'Sputum Test': 'referral',
      'Diagnosis': 'diagnosis',
      'ATT Initiation': 'treatment'
    };
    setExpandedSection(phaseToSection[phase] || 'demographics');
  }, [phase]);
  
  // Reset demographic edits when patient changes
  useEffect(() => {
    if (localPatient) {
      setEditedDemographics({
        inmate_name: localPatient.inmate_name || '',
        age: localPatient.age || '',
        sex: localPatient.sex || '',
        contact_number: localPatient.contact_number || '',
        address: localPatient.address || '',
        facility_name: localPatient.facility_name || '',
        date_of_birth: localPatient.date_of_birth || '',
        screening_date: localPatient.screening_date || ''
      });
      setIsEditingDemographics(false);
    }
  }, [localPatient]);
  
  const { register, watch, getValues, reset } = useForm<PatientFormData>({
    defaultValues: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': patient?.referral_date || '',
      'Name of facility where referred to (Give code/name of all facilities)': patient?.referred_facility || '',
      'TB diagnosed (Y/N)': patient?.tb_diagnosed || '',
      'Date of TB Diagnosed (dd/mm/yy)': patient?.tb_diagnosis_date || '',
      'Type of TB Diagnosed (P/EP)': patient?.tb_type || '',
      'Date of starting ATT (dd/mm/yyyy)': patient?.att_start_date || '',
      'Date of Treatment Completion (dd/mm/yyyy)': patient?.att_completion_date || '',
      'HIV Status (Positive/Negative/Unknown)': patient?.hiv_status || '',
      'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]': patient?.art_status || '',
      'ART Number (if on ART at the time of referral)': patient?.art_number || '',
      'NIKSHAY/ABHA ID': patient?.nikshay_abha_id || '',
      'Date of registration (dd/mm/yyyy)': patient?.registration_date || '',
      'Remarks': patient?.remarks || ''
    }
  });

  // Re-initialize form when patient prop changes (new patient opened)
  useEffect(() => {
    if (patient) {
      reset({
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': patient.referral_date || '',
        'Name of facility where referred to (Give code/name of all facilities)': patient.referred_facility || '',
        'TB diagnosed (Y/N)': patient.tb_diagnosed || '',
        'Date of TB Diagnosed (dd/mm/yy)': patient.tb_diagnosis_date || '',
        'Type of TB Diagnosed (P/EP)': patient.tb_type || '',
        'Date of starting ATT (dd/mm/yyyy)': patient.att_start_date || '',
        'Date of Treatment Completion (dd/mm/yyyy)': patient.att_completion_date || '',
        'HIV Status (Positive/Negative/Unknown)': patient.hiv_status || '',
        'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]': patient.art_status || '',
        'ART Number (if on ART at the time of referral)': patient.art_number || '',
        'NIKSHAY/ABHA ID': patient.nikshay_abha_id || '',
        'Date of registration (dd/mm/yyyy)': patient.registration_date || '',
        'Remarks': patient.remarks || ''
      });
    }
  }, [patient, reset]);

  const hivStatus = watch('HIV Status (Positive/Negative/Unknown)');
  const artStatus = watch('Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]');

  const handleSaveClinical = async () => {
    const data = getValues();
    console.log('[PatientDrawer] onSubmit called with data:', data);
    console.log('[PatientDrawer] Patient ID:', localPatient.id);
    console.log('[PatientDrawer] Kobo UUID:', localPatient.kobo_uuid);
    
    setIsSubmitting(true);
    setSaveSuccess(false);
    // Store current data for potential rollback
    setLastKnownData({ ...localPatient });
    setSyncState({ db: 'syncing', sheets: 'syncing' });
    
    try {
      toast.loading('Syncing clinical updates across all systems...', { id: 'clinical-save' });
      
      // CRITICAL: Add identifier keys for Google Sheets row matching
      const updatesWithIdentifiers = {
        ...data,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };
      
      // Optimistic update
      mutate(
        (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
        async (currentData: any) => {
          if (!currentData) return currentData;
          if (currentData.data && Array.isArray(currentData.data)) {
            return {
              ...currentData,
              data: currentData.data.map((p: any) => 
                p.id === localPatient.id ? { ...p, ...data } : p
              )
            };
          }
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === localPatient.id ? { ...p, ...data } : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      console.log('[PatientDrawer] Calling /api/patient-sync...');
      
      // CRITICAL DEBUG: Log exact payload being sent to Google Sheets
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 SENDING TO SHEETS (Clinical):');
      console.log('Patient ID:', localPatient.id);
      console.log('Kobo UUID:', localPatient.kobo_uuid);
      console.log('Update Keys:', Object.keys(updatesWithIdentifiers));
      console.log('\n📋 PAYLOAD TABLE (Verify against Sheet headers):');
      console.table(updatesWithIdentifiers);
      console.log('Full Payload:', JSON.stringify(updatesWithIdentifiers, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      
      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates: updatesWithIdentifiers
        })
      });

      console.log('[PatientDrawer] API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PatientDrawer] API error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Failed to parse error response', details: errorText };
        }
        console.error('[PatientDrawer] API error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to sync clinical updates');
      }

      const result = await response.json();
      console.log('[PatientDrawer] API success:', result);

      // Update sync states based on result
      setSyncState(prev => ({ ...prev, db: 'success' }));
      
      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Show warning if Google Sheets sync failed, otherwise success
      if (result.warnings && result.warnings.length > 0) {
        setSyncState(prev => ({ ...prev, sheets: 'error' }));
        toast.warning(`⚠️ Saved to database. Google Sheets sync failed — check connection.`, 
          { id: 'clinical-save', duration: 6000 });
      } else {
        setSyncState(prev => ({ ...prev, sheets: 'success' }));
        const sheetsMessage = result.googleSheets?.message || 'Synced to all systems';
        toast.success(`✅ ${sheetsMessage}`, { id: 'clinical-save', duration: 4000 });
      }
      
      // Update local patient state with saved data
      setLocalPatient(prev => ({ ...prev, ...data }));
      
      setSaveSuccess(true);
      if (localPatient.kobo_uuid) {
        window.dispatchEvent(new CustomEvent('sync-confirmed', { detail: { koboUuid: localPatient.kobo_uuid } }));
      }
      
      // Trigger parent cache refresh (non-blocking)
      onUpdate();
      
      // Reset sync state after delay
      setTimeout(() => setSyncState({ db: 'idle', sheets: 'idle' }), 3000);
    } catch (error: any) {
      console.error('[PatientDrawer] Save error:', error);
      setSyncState({ db: 'error', sheets: 'error' });
      
      // Rollback to last known data on error
      if (lastKnownData) {
        setLocalPatient(lastKnownData);
        mutate(
          (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
          async (currentData: any) => {
            if (!currentData) return currentData;
            if (currentData.data && Array.isArray(currentData.data)) {
              return { ...currentData, data: currentData.data.map((p: any) => p.id === localPatient.id ? lastKnownData : p) };
            }
            if (Array.isArray(currentData)) {
              return currentData.map((p: any) => p.id === localPatient.id ? lastKnownData : p);
            }
            return currentData;
          },
          { revalidate: true }
        );
        toast.error(`Sync failed. Changes rolled back.`, { id: 'clinical-save', duration: 5000 });
      } else {
        toast.error(`Error: ${error.message}`, { id: 'clinical-save' });
      }
      setTimeout(() => setSyncState({ db: 'idle', sheets: 'idle' }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleCloseLoop = async (reason: string) => {
    setIsSubmitting(true);
    try {
      toast.loading('Closing patient loop...', { id: 'close-loop' });
      
      // CRITICAL: Add identifier keys for Google Sheets row matching
      const updates = {
        'TB diagnosed (Y/N)': 'N',
        'closure_reason': reason,
        'Remarks': `Loop closed: ${reason}`,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };

      // Optimistic update
      mutate(
        (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
        async (currentData: any) => {
          if (!currentData) return currentData;
          if (currentData.data && Array.isArray(currentData.data)) {
            return {
              ...currentData,
              data: currentData.data.map((p: any) => 
                p.id === localPatient.id ? { ...p, ...updates } : p
              )
            };
          }
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === localPatient.id ? { ...p, ...updates } : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      // CRITICAL DEBUG: Log exact payload being sent to Google Sheets
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 SENDING TO SHEETS (Close Loop):');
      console.log('Patient ID:', localPatient.id);
      console.log('Kobo UUID:', localPatient.kobo_uuid);
      console.log('Update Keys:', Object.keys(updates));
      console.log('\n📋 PAYLOAD TABLE (Verify against Sheet headers):');
      console.table(updates);
      console.log('Full Payload:', JSON.stringify(updates, null, 2));
      console.log('═══════════════════════════════════════════════════════════');

      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates
        })
      });

      if (!response.ok) throw new Error('Failed to close loop');

      const result = await response.json();

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Update local patient state with closure data
      setLocalPatient(prev => ({ ...prev, ...updates }));
      
      onUpdate();
      onClose();
      
      // Show detailed success message from Google Sheets
      const sheetsMessage = result.googleSheets?.message || 'Loop closed successfully';
      toast.success(`✅ ${sheetsMessage}`, { id: 'close-loop', duration: 4000 });
    } catch (error: any) {
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error(`Error: ${error.message}`, { id: 'close-loop' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDemographics = async () => {
    setIsSavingDemographics(true);
    setSyncState({ db: 'syncing', sheets: 'syncing' });
    
    try {
      toast.loading('Syncing demographics across all systems...', { id: 'demo-save' });
      
      // CRITICAL: Add identifier keys for Google Sheets row matching
      const updatesWithIdentifiers = {
        ...editedDemographics,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };
      
      // Optimistic update - update all SWR caches immediately
      mutate(
        (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
        async (currentData: any) => {
          if (!currentData) return currentData;
          
          // Handle paginated data structure
          if (currentData.data && Array.isArray(currentData.data)) {
            return {
              ...currentData,
              data: currentData.data.map((p: any) => 
                p.id === localPatient.id ? { ...p, ...editedDemographics } : p
              )
            };
          }
          
          // Handle array data structure (allPatients)
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === localPatient.id ? { ...p, ...editedDemographics } : p
            );
          }
          
          return currentData;
        },
        { revalidate: false } // Don't revalidate immediately, we'll do it after API call
      );

      // CRITICAL DEBUG: Log exact payload being sent to Google Sheets
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 SENDING TO SHEETS (Demographics):');
      console.log('Patient ID:', localPatient.id);
      console.log('Kobo UUID:', localPatient.kobo_uuid);
      console.log('Update Keys:', Object.keys(updatesWithIdentifiers));
      console.log('\n📋 PAYLOAD TABLE (Verify against Sheet headers):');
      console.table(updatesWithIdentifiers);
      console.log('Full Payload:', JSON.stringify(updatesWithIdentifiers, null, 2));
      console.log('═══════════════════════════════════════════════════════════');

      // Call the triple-sync API
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates: updatesWithIdentifiers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync demographics');
      }

      const result = await response.json();
      
      // Update sync states based on result
      setSyncState(prev => ({ ...prev, db: 'success', kobo: 'success' }));
      
      // Revalidate all patient caches after successful sync
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Update local patient state with saved demographics
      setLocalPatient(prev => ({ ...prev, ...editedDemographics }));
      
      setIsEditingDemographics(false);
      onUpdate();
      
      // Show warning if Google Sheets sync failed, otherwise success
      if (result.warnings && result.warnings.length > 0) {
        setSyncState(prev => ({ ...prev, sheets: 'error' }));
        toast.warning(`⚠️ Saved to database. Google Sheets sync failed — check connection.`, 
          { id: 'demo-save', duration: 6000 });
      } else {
        setSyncState(prev => ({ ...prev, sheets: 'success' }));
        const sheetsMessage = result.googleSheets?.message || 'Demographics synced successfully';
        toast.success(`✅ ${sheetsMessage}`, { id: 'demo-save', duration: 4000 });
      }
      
      // Reset sync state after delay
      setTimeout(() => setSyncState({ db: 'idle', sheets: 'idle' }), 3000);
    } catch (error) {
      console.error('Failed to save demographics:', error);
      setSyncState({ db: 'error', sheets: 'error' });
      // Revert optimistic update on error
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error('Failed to save demographics. Please try again.', { id: 'demo-save' });
      setTimeout(() => setSyncState({ db: 'idle', sheets: 'idle' }), 3000);
    } finally {
      setIsSavingDemographics(false);
    }
  };

  const Section = ({ id, title, icon: Icon, children, isCurrent = false }: any) => {
    const isExpanded = expandedSection === id;
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-100 shadow-sm transition-all duration-200 hover:border-blue-300 ${
        isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : 'bg-white'
      }`}>
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? '' : id)}
          className={`w-full px-4 py-4 flex items-center justify-between transition-all duration-200 ${
            isCurrent ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className={`font-semibold text-slate-900 text-sm`}>
              {title}
            </span>
            {isCurrent && (
              <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Active Phase
              </span>
            )}
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const ReadOnlyField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div className="font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-h-[38px] flex items-center">
        {value || 'N/A'}
      </div>
    </div>
  );

  const EditableField = ({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (val: string) => void; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 text-sm font-medium bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] rounded-xl transition-all duration-300 relative overflow-hidden group"
      >
        {/* Shimmer effect on focus */}
        <div className="absolute inset-0 -translate-x-full group-focus-within:animate-[shimmer_1.5s_ease-in-out] pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
        </div>
      </Input>
    </div>
  );

  const EditableSelect = ({ label, value, onChange, options }: { label: string; value: any; onChange: (val: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-sm font-medium ring-offset-white outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 relative overflow-hidden group"
      >
        {/* Shimmer effect on focus */}
        <div className="absolute inset-0 -translate-x-full group-focus-within:animate-[shimmer_1.5s_ease-in-out] pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
        </div>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const StepperNode = ({ isCurrent, isCompleted, label }: { isCurrent: boolean, isCompleted: boolean, label: string }) => (
    <div className="flex flex-col items-center flex-1">
      <div className="relative flex items-center justify-center w-5 h-5">
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className={`relative z-10 w-3 h-3 rounded-full transition-colors duration-300 ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600' : 'bg-slate-200'}`} />
      </div>
      <span className={`text-[10px] mt-1 transition-colors duration-300 ${isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-emerald-700 font-semibold' : 'text-slate-400 font-medium'}`}>{label}</span>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={true}>
      <SheetPortal>
        {/* LEVEL 2: Detail Drawer Overlay - Dims Master Drawer beneath */}
        <SheetOverlay 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-[4px] !z-[99999] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        {/* LEVEL 2: Detail Drawer - Restrained Premium Width */}
        <SheetContent 
          className="!w-[95vw] sm:!max-w-[650px] md:!max-w-[750px] lg:!max-w-[850px] !z-[100000] bg-white/95 backdrop-blur-3xl border-l border-white shadow-[-40px_0_80px_rgba(15,23,42,0.12)] p-0 flex flex-col h-full data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" 
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
            <button onClick={onClose} className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">
              Close
            </button>
          </div>
        ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="flex flex-col h-full"
        >
        {/* Header with Patient Info */}
        <SheetHeader className="px-6 py-6 border-b border-white/30 bg-white/40 backdrop-blur-xl">
          <motion.div variants={itemVariants} className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                {localPatient?.inmate_name || 'Loading...'}
              </SheetTitle>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 opacity-80">{localPatient?.unique_id || ''}</p>
              
              {/* Task 4: Patient Vitals - Contextual Metadata */}
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{localPatient?.facility_name || 'Unknown Facility'}</span>
                <span>•</span>
                <span>{localPatient?.sex || 'N/A'}/{localPatient?.age || 'N/A'}</span>
                <span>•</span>
                <span>{localPatient?.screening_date ? new Date(localPatient.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>
          </motion.div>
              
          {/* Task 3: Clinical Stepper - Stepped Progress Indicator */}
          <motion.div variants={itemVariants} className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">{phase}</span>
                  <span className="text-xs text-slate-500">{isClosed ? 'Journey Complete' : 'In Progress'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Step 1: Screened */}
                  <StepperNode 
                    isCurrent={phase === 'Screening'} 
                    isCompleted={phase === 'Sputum Test' || phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'} 
                    label="Screened" 
                  />
                  <div className={`flex-1 h-[2px] transition-colors duration-300 ${
                    phase === 'Sputum Test' || phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 2: Sputum */}
                  <StepperNode 
                    isCurrent={phase === 'Sputum Test'} 
                    isCompleted={phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'} 
                    label="Sputum" 
                  />
                  <div className={`flex-1 h-[2px] transition-colors duration-300 ${
                    phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 3: Diagnosis */}
                  <StepperNode 
                    isCurrent={phase === 'Diagnosis'} 
                    isCompleted={phase === 'ATT Initiation' || phase === 'Closed'} 
                    label="Diagnosis" 
                  />
                  <div className={`flex-1 h-[2px] transition-colors duration-300 ${
                    phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 4: Treatment */}
                  <StepperNode 
                    isCurrent={phase === 'ATT Initiation'} 
                    isCompleted={phase === 'Closed'} 
                    label="Treatment" 
                  />
                </div>
          </motion.div>
        </SheetHeader>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">

        {/* Read-Only: KoboCollect Data */}
        <motion.div variants={itemVariants}>
        <Section id="demographics" title="Demographics" icon={User}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isEditingDemographics ? (
                <Unlock className="w-4 h-4 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-semibold text-slate-600">
                {isEditingDemographics ? 'Editing Mode' : 'Read-Only Mode'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingDemographics(!isEditingDemographics)}
              aria-label={isEditingDemographics ? 'Lock demographics editing' : 'Unlock demographics for editing'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2 ${
                isEditingDemographics
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {isEditingDemographics ? (
                <>
                  <Lock className="w-3 h-3" />
                  Lock
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  Unlock to Edit
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Editable Fields */}
            {isEditingDemographics ? (
              <>
                <div className="col-span-2">
                  <EditableField
                    label="Inmate Name"
                    value={editedDemographics.inmate_name}
                    onChange={(val) => setEditedDemographics({ ...editedDemographics, inmate_name: val })}
                  />
                </div>
                <EditableField
                  label="Age"
                  value={editedDemographics.age}
                  onChange={(val) => setEditedDemographics({ ...editedDemographics, age: val })}
                  type="number"
                />
                <EditableSelect
                  label="Sex"
                  value={editedDemographics.sex}
                  onChange={(val) => setEditedDemographics({ ...editedDemographics, sex: val })}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
                <EditableField
                  label="Date of Birth"
                  value={editedDemographics.date_of_birth}
                  onChange={(val) => setEditedDemographics({ ...editedDemographics, date_of_birth: val })}
                  type="date"
                />
                <EditableField
                  label="Screening Date"
                  value={editedDemographics.screening_date}
                  onChange={(val) => setEditedDemographics({ ...editedDemographics, screening_date: val })}
                  type="date"
                />
                <div className="col-span-2">
                  <EditableField
                    label="Contact Number"
                    value={editedDemographics.contact_number}
                    onChange={(val) => setEditedDemographics({ ...editedDemographics, contact_number: val })}
                    type="tel"
                  />
                </div>
                <div className="col-span-2">
                  <EditableField
                    label="Address"
                    value={editedDemographics.address}
                    onChange={(val) => setEditedDemographics({ ...editedDemographics, address: val })}
                  />
                </div>
                <div className="col-span-2">
                  <EditableField
                    label="Facility Name"
                    value={editedDemographics.facility_name}
                    onChange={(val) => setEditedDemographics({ ...editedDemographics, facility_name: val })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <ReadOnlyField label="Inmate Name" value={localPatient?.inmate_name} />
                </div>
                <ReadOnlyField label="Age" value={localPatient?.age} />
                <ReadOnlyField label="Sex" value={localPatient?.sex} />
                <ReadOnlyField label="Date of Birth" value={localPatient?.date_of_birth} />
                <ReadOnlyField label="Screening Date" value={localPatient?.screening_date} />
                <div className="col-span-2">
                  <ReadOnlyField label="Contact Number" value={localPatient?.contact_number} />
                </div>
                <div className="col-span-2">
                  <ReadOnlyField label="Address" value={localPatient?.address} />
                </div>
                <div className="col-span-2">
                  <ReadOnlyField label="Facility Name" value={localPatient?.facility_name} />
                </div>
              </>
            )}

            {/* Non-editable fields */}
            <ReadOnlyField label="Staff Name" value={localPatient?.staff_name} />
            <ReadOnlyField label="Submitted On" value={localPatient?.submitted_on} />
            <ReadOnlyField label="State" value={localPatient?.screening_state} />
            <ReadOnlyField label="District" value={localPatient?.screening_district} />
            <ReadOnlyField label="Facility Type" value={localPatient?.facility_type} />
            <ReadOnlyField label="Inmate Type" value={localPatient?.inmate_type} />
            <ReadOnlyField label="Father/Husband Name" value={localPatient?.father_name} />
            <div className="col-span-2">
              <ReadOnlyField label="Chest X-ray Result" value={localPatient?.xray_result} />
            </div>
            <div className="col-span-2">
              <ReadOnlyField label="10s Symptoms Present" value={localPatient?.symptoms_10s} />
            </div>
            <ReadOnlyField label="Past TB History" value={localPatient?.tb_past_history} />
          </div>

        </Section>
        </motion.div>

        {/* Journey Overview Tab - Separate Section */}
        {!isClosed && (
          <motion.div variants={itemVariants}>
          <Section id="journey" title="Journey Overview" icon={Calendar}>
            <PatientTimeline patient={localPatient} />
          </Section>
          </motion.div>
        )}

        {/* Phase-Aware Quick Actions - All Sections Visible */}
        {!isClosed ? (
          <div className="space-y-4">
            {/* Group A: Sputum & Referral - Always visible */}
            <motion.div variants={itemVariants}>
            <Section id="referral" title="Sputum & Referral" icon={FileText} isCurrent={phase === 'Sputum Test'}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of referral for TB Examination
                </label>
                <input
                  type="date"
                  {...register('Date of referral for TB Examination (sputum) (dd/mm/yy)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Facility where referred to
                </label>
                <select
                  {...register('Name of facility where referred to (Give code/name of all facilities)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select facility</option>
                  <option value="DMC-Designated microscopy Centre">DMC-Designated microscopy Centre</option>
                  <option value="TDC-TB Diagnostic Centre">TDC-TB Diagnostic Centre</option>
                  <option value="CBNAAT">CBNAAT</option>
                  <option value="DST-Drug susceptibility testing">DST-Drug susceptibility testing</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Histopathology">Histopathology</option>
                  <option value="ART Centre">ART Centre</option>
                  <option value="Pvt. & Others">Pvt. & Others</option>
                </select>
              </div>
            </Section>
            </motion.div>

            {/* Group B: Diagnosis - Always visible */}
            <motion.div variants={itemVariants}>
            <Section id="diagnosis" title="Diagnosis" icon={Activity} isCurrent={phase === 'Diagnosis'}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  TB diagnosed (Y/N)
                </label>
                <select
                  {...register('TB diagnosed (Y/N)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of TB Diagnosed
                </label>
                <input
                  type="date"
                  {...register('Date of TB Diagnosed (dd/mm/yy)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type of TB Diagnosed
                </label>
                <select
                  {...register('Type of TB Diagnosed (P/EP)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="P">Pulmonary (P)</option>
                  <option value="EP">Extra-Pulmonary (EP)</option>
                </select>
              </div>
            </Section>
            </motion.div>

            {/* Group C: Treatment & Comorbidities - Always visible */}
            <motion.div variants={itemVariants}>
            <Section id="treatment" title="Treatment & Comorbidities" icon={Pill} isCurrent={phase === 'ATT Initiation'}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of starting ATT
                </label>
                <input
                  type="date"
                  {...register('Date of starting ATT (dd/mm/yyyy)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Treatment Completion
                </label>
                <input
                  type="date"
                  {...register('Date of Treatment Completion (dd/mm/yyyy)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  HIV Status
                </label>
                <select
                  {...register('HIV Status (Positive/Negative/Unknown)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              
              {hivStatus === 'Positive' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status at the time of referral
                    </label>
                    <select
                      {...register('Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Pre ART">Pre ART</option>
                      <option value="On ART">On ART</option>
                    </select>
                  </div>
                  
                  {artStatus === 'On ART' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ART Number
                      </label>
                      <input
                        type="text"
                        {...register('ART Number (if on ART at the time of referral)')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}
            </Section>
            </motion.div>

            {/* Group D: Administration - Always visible */}
            <motion.div variants={itemVariants}>
            <Section id="admin" title="Administration" icon={Shield}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  NIKSHAY/ABHA ID
                </label>
                <input
                  type="text"
                  {...register('NIKSHAY/ABHA ID')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of registration
                </label>
                <input
                  type="date"
                  {...register('Date of registration (dd/mm/yyyy)')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  {...register('Remarks')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Section>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-6">
            <PatientTimeline patient={localPatient} />
          </div>
        )}
          </div>
        </ScrollArea>

        {/* Unified Action Footer - FLOATING PILL with Glassmorphism */}
        {!isClosed && (
          <motion.div 
            variants={itemVariants} 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.5 }}
            className="sticky bottom-6 z-20 mx-6 mb-6 p-2 bg-white/60 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,30,80,0.15)] flex flex-col gap-2 mt-auto relative overflow-hidden"
          >
            {/* Glassmorphism depth layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
            {/* Sync Indicator - Shows granular sync status */}
            <AnimatePresence>
              <SyncIndicator statusDB={syncState.db} statusSheets={syncState.sheets} statusKobo="idle" />
            </AnimatePresence>
            
            {/* Primary Save Button - handles both demographics and clinical updates */}
            {isEditingDemographics ? (
              <button
                type="button"
                onClick={handleSaveDemographics}
                disabled={isSavingDemographics}
                aria-label="Save demographic changes"
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 relative overflow-hidden group"
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1s_ease-in-out] pointer-events-none">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
                {isSavingDemographics ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Save className="w-4 h-4" />
                    </motion.div>
                    Syncing Demographics...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Demographics
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveClinical}
                disabled={isSubmitting || saveSuccess}
                aria-label="Save clinical updates"
                className={`w-full text-white font-medium shadow-sm transition-all duration-200 py-3 rounded-xl disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 relative overflow-hidden group ${
                  saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-50'
                }`}
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1s_ease-in-out] pointer-events-none">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
                {saveSuccess ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </motion.div>
                    Saved Successfully
                  </>
                ) : isSubmitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  'Save Clinical Updates'
                )}
              </button>
            )}

            {!showCloseLoop ? (
              <button
                type="button"
                onClick={() => setShowCloseLoop(true)}
                aria-label="Close patient loop as not TB"
                className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium transition-all duration-200 hover:-translate-y-0.5 py-3 rounded-xl flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 relative overflow-hidden group"
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1s_ease-in-out] pointer-events-none">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />
                </div>
                <AlertCircle className="w-4 h-4" />
                Close Loop (Not TB)
              </button>
            ) : (
              <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-medium text-red-900">Confirm Loop Closure</p>
                <select
                  onChange={(e) => e.target.value && handleCloseLoop(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-xl text-sm"
                  disabled={isSubmitting}
                >
                  <option value="">Select reason...</option>
                  <option value="Negative sputum result">Negative sputum result</option>
                  <option value="CXR Normal">CXR Normal</option>
                  <option value="Patient refused treatment">Patient refused treatment</option>
                  <option value="Transferred to another facility">Transferred</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowCloseLoop(false)}
                  aria-label="Cancel loop closure"
                  className="text-sm text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
            </div>
          </motion.div>
        )}
        </motion.div>
        )}
      </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
