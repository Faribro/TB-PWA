'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Activity, Pill, Shield, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save } from 'lucide-react';
import { patientFormSchema, type PatientFormData } from '@/lib/schemas';
import { updatePatientAction } from '@/lib/patient-actions';
import { calculatePatientPhase, calculateProgressPercentage } from '@/lib/phase-engine';
import { PatientTimeline } from './PatientTimeline';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay, SheetPortal } from '@/components/ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useSWRConfig } from 'swr';
import { Z_INDEX } from '@/lib/zIndex';
import { toast } from 'sonner';

interface PatientDetailDrawerProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PatientDetailDrawer({ patient, isOpen, onClose, onUpdate }: PatientDetailDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseLoop, setShowCloseLoop] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('');
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);
  const { mutate } = useSWRConfig();
  
  // Demographic edit state
  const [editedDemographics, setEditedDemographics] = useState({
    inmate_name: patient.inmate_name || '',
    age: patient.age || '',
    sex: patient.sex || '',
    contact_number: patient.contact_number || '',
    address: patient.address || '',
    facility_name: patient.facility_name || '',
    dob: patient.dob || '',
    screening_date: patient.screening_date || ''
  });

  const { phase, nextRequiredField } = calculatePatientPhase(patient);
  const progressPercentage = calculateProgressPercentage(patient);
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
    setEditedDemographics({
      inmate_name: patient.inmate_name || '',
      age: patient.age || '',
      sex: patient.sex || '',
      contact_number: patient.contact_number || '',
      address: patient.address || '',
      facility_name: patient.facility_name || '',
      dob: patient.dob || '',
      screening_date: patient.screening_date || ''
    });
    setIsEditingDemographics(false);
  }, [patient]);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': patient.referral_date || '',
      'Name of facility where referred to (Give code/name of all facilities)': patient.referral_facility || '',
      'TB diagnosed (Y/N)': patient.tb_diagnosed || '',
      'Date of TB Diagnosed (dd/mm/yy)': patient.diagnosis_date || '',
      'Type of TB Diagnosed (P/EP)': patient.tb_type || '',
      'Date of starting ATT (dd/mm/yyyy)': patient.att_start_date || '',
      'Date of Treatment Completion (dd/mm/yyyy)': patient.att_completion_date || '',
      'HIV Status (Positive/Negative/Unknown)': patient.hiv_status || '',
      'Status at the time of referral (Pre ART/On ART)': patient.art_status || '',
      'ART Number': patient.art_number || '',
      'NIKSHAY/ABHA ID': patient.nikshay_id || '',
      'Date of registration (dd/mm/yyyy)': patient.registration_date || '',
      'Remarks': patient.remarks || ''
    }
  });

  const hivStatus = watch('HIV Status (Positive/Negative/Unknown)');
  const artStatus = watch('Status at the time of referral (Pre ART/On ART)');

  const onSubmit = async (data: PatientFormData) => {
    console.log('[PatientDrawer] onSubmit called with data:', data);
    setIsSubmitting(true);
    try {
      toast.loading('Syncing clinical updates across all systems...', { id: 'clinical-save' });
      
      // Optimistic update
      mutate(
        (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
        async (currentData: any) => {
          if (!currentData) return currentData;
          if (currentData.data && Array.isArray(currentData.data)) {
            return {
              ...currentData,
              data: currentData.data.map((p: any) => 
                p.id === patient.id ? { ...p, ...data } : p
              )
            };
          }
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === patient.id ? { ...p, ...data } : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          koboUuid: patient.kobo_uuid,
          updates: data
        })
      });

      if (!response.ok) throw new Error('Failed to sync clinical updates');

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      onUpdate();
      onClose();
      toast.success('Clinical updates synced to Supabase, KoboToolbox & Google Sheets!', { id: 'clinical-save' });
    } catch (error: any) {
      console.error('[PatientDrawer] Save error:', error);
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error(`Error: ${error.message}`, { id: 'clinical-save' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.error('[PatientDrawer] Form validation errors:', errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please check the form for errors', { id: 'validation-error' });
    }
  };

  const handleCloseLoop = async (reason: string) => {
    setIsSubmitting(true);
    try {
      toast.loading('Closing patient loop...', { id: 'close-loop' });
      
      const updates = {
        'TB diagnosed (Y/N)': 'N',
        'closure_reason': reason,
        'Remarks': `Loop closed: ${reason}`
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
                p.id === patient.id ? { ...p, ...updates } : p
              )
            };
          }
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === patient.id ? { ...p, ...updates } : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          koboUuid: patient.kobo_uuid,
          updates
        })
      });

      if (!response.ok) throw new Error('Failed to close loop');

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      onUpdate();
      onClose();
      toast.success('Patient loop closed successfully!', { id: 'close-loop' });
    } catch (error: any) {
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error(`Error: ${error.message}`, { id: 'close-loop' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDemographics = async () => {
    setIsSavingDemographics(true);
    try {
      toast.loading('Syncing demographics across all systems...', { id: 'demo-save' });
      
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
                p.id === patient.id ? { ...p, ...editedDemographics } : p
              )
            };
          }
          
          // Handle array data structure (allPatients)
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) => 
              p.id === patient.id ? { ...p, ...editedDemographics } : p
            );
          }
          
          return currentData;
        },
        { revalidate: false } // Don't revalidate immediately, we'll do it after API call
      );

      // Call the triple-sync API
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          koboUuid: patient.kobo_uuid,
          updates: editedDemographics
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync demographics');
      }

      const result = await response.json();
      
      // Revalidate all patient caches after successful sync
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      setIsEditingDemographics(false);
      onUpdate();
      
      toast.success('Demographics synced to Supabase, KoboToolbox & Google Sheets!', { id: 'demo-save' });
    } catch (error) {
      console.error('Failed to save demographics:', error);
      // Revert optimistic update on error
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error('Failed to save demographics. Please try again.', { id: 'demo-save' });
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
        className="h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
      />
    </div>
  );

  const EditableSelect = ({ label, value, onChange, options }: { label: string; value: any; onChange: (val: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetPortal>
        <SheetOverlay 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
          style={{ zIndex: Z_INDEX.overlay }} 
        />
        <SheetContent 
          className="!w-[95vw] sm:!max-w-[500px] glass-light border-l border-white shadow-2xl p-0 flex flex-col h-full" 
          style={{ zIndex: Z_INDEX.drawer }}
        >
        {/* Header with Patient Info */}
        <SheetHeader className="px-6 py-6 border-b border-white/20 bg-white/10 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                {patient.inmate_name}
              </SheetTitle>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 opacity-80">{patient.unique_id}</p>
              
              {/* Task 4: Patient Vitals - Contextual Metadata */}
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{patient.facility_name || 'Unknown Facility'}</span>
                <span>•</span>
                <span>{patient.sex || 'N/A'}/{patient.age || 'N/A'}</span>
                <span>•</span>
                <span>{patient.screening_date ? new Date(patient.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
              </div>
              
              {/* Task 3: Clinical Stepper - Stepped Progress Indicator */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">{phase}</span>
                  <span className="text-xs text-slate-500">{isClosed ? 'Journey Complete' : 'In Progress'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Step 1: Screened */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      phase === 'Screening' || phase === 'Sputum Test' || phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'
                        ? 'bg-emerald-500' 
                        : 'bg-slate-200'
                    }`} />
                    <span className="text-[10px] text-slate-500 mt-1">Screened</span>
                  </div>
                  <div className={`flex-1 h-[2px] -mt-4 ${
                    phase === 'Sputum Test' || phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 2: Sputum */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      phase === 'Sputum Test' ? 'bg-blue-600' :
                      phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed' ? 'bg-emerald-500' :
                      'bg-slate-200'
                    }`} />
                    <span className="text-[10px] text-slate-500 mt-1">Sputum</span>
                  </div>
                  <div className={`flex-1 h-[2px] -mt-4 ${
                    phase === 'Diagnosis' || phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 3: Diagnosis */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      phase === 'Diagnosis' ? 'bg-blue-600' :
                      phase === 'ATT Initiation' || phase === 'Closed' ? 'bg-emerald-500' :
                      'bg-slate-200'
                    }`} />
                    <span className="text-[10px] text-slate-500 mt-1">Diagnosis</span>
                  </div>
                  <div className={`flex-1 h-[2px] -mt-4 ${
                    phase === 'ATT Initiation' || phase === 'Closed'
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200'
                  }`} />
                  
                  {/* Step 4: Treatment */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      phase === 'ATT Initiation' ? 'bg-blue-600' :
                      phase === 'Closed' ? 'bg-emerald-500' :
                      'bg-slate-200'
                    }`} />
                    <span className="text-[10px] text-slate-500 mt-1">Treatment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Task 1: Scrollable Content Area */}
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">

        {/* Read-Only: KoboCollect Data */}
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
                  value={editedDemographics.dob}
                  onChange={(val) => setEditedDemographics({ ...editedDemographics, dob: val })}
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
                  <ReadOnlyField label="Inmate Name" value={patient.inmate_name} />
                </div>
                <ReadOnlyField label="Age" value={patient.age} />
                <ReadOnlyField label="Sex" value={patient.sex} />
                <ReadOnlyField label="Date of Birth" value={patient.dob} />
                <ReadOnlyField label="Screening Date" value={patient.screening_date} />
                <div className="col-span-2">
                  <ReadOnlyField label="Contact Number" value={patient.contact_number} />
                </div>
                <div className="col-span-2">
                  <ReadOnlyField label="Address" value={patient.address} />
                </div>
                <div className="col-span-2">
                  <ReadOnlyField label="Facility Name" value={patient.facility_name} />
                </div>
              </>
            )}

            {/* Non-editable fields */}
            <ReadOnlyField label="Staff Name" value={patient.staff_name} />
            <ReadOnlyField label="Submitted On" value={patient.submitted_on} />
            <ReadOnlyField label="State" value={patient.screening_state} />
            <ReadOnlyField label="District" value={patient.screening_district} />
            <ReadOnlyField label="Facility Type" value={patient.facility_type} />
            <ReadOnlyField label="Inmate Type" value={patient.inmate_type} />
            <ReadOnlyField label="Father/Husband Name" value={patient.father_name} />
            <div className="col-span-2">
              <ReadOnlyField label="Chest X-ray Result" value={patient.xray_result} />
            </div>
            <div className="col-span-2">
              <ReadOnlyField label="10s Symptoms Present" value={patient.symptoms_10s} />
            </div>
            <ReadOnlyField label="Past TB History" value={patient.tb_past_history} />
          </div>

        </Section>

        {/* Journey Overview Tab - Separate Section */}
        {!isClosed && (
          <Section id="journey" title="Journey Overview" icon={Calendar}>
            <PatientTimeline patient={patient} />
          </Section>
        )}

        {/* Phase-Aware Quick Actions - All Sections Visible */}
        {!isClosed ? (
          <form id="patient-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
            {/* Group A: Sputum & Referral - Always visible */}
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

            {/* Group B: Diagnosis - Always visible */}
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

            {/* Group C: Treatment & Comorbidities - Always visible */}
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
                      {...register('Status at the time of referral (Pre ART/On ART)')}
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
                        {...register('ART Number')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}
            </Section>

            {/* Group D: Administration - Always visible */}
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
          </form>
        ) : (
          <div className="space-y-6">
            <PatientTimeline patient={patient} />
          </div>
        )}
          </div>
        </ScrollArea>

        {/* Unified Action Footer */}
        {!isClosed && (
          <div className="sticky bottom-0 w-full p-4 border-t border-slate-200 bg-white/80 backdrop-blur-md flex flex-col gap-3 mt-auto">
            {/* Primary Save Button - handles both demographics and clinical updates */}
            {isEditingDemographics ? (
              <button
                type="button"
                onClick={handleSaveDemographics}
                disabled={isSavingDemographics}
                aria-label="Save demographic changes"
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
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
                onClick={handleSubmit(onSubmit, onError)}
                disabled={isSubmitting}
                aria-label="Save clinical updates"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Clinical Updates'}
              </button>
            )}

            {!showCloseLoop ? (
              <button
                type="button"
                onClick={() => setShowCloseLoop(true)}
                aria-label="Close patient loop as not TB"
                className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium transition-all duration-200 hover:-translate-y-0.5 py-3 rounded-lg flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <AlertCircle className="w-4 h-4" />
                Close Loop (Not TB)
              </button>
            ) : (
              <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">Confirm Loop Closure</p>
                <select
                  onChange={(e) => e.target.value && handleCloseLoop(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm"
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
        )}
      </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
