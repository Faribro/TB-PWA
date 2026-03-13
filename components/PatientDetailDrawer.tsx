'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Activity, Pill, Shield, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save } from 'lucide-react';
import { patientFormSchema, type PatientFormData } from '@/lib/schemas';
import { updatePatientAction } from '@/lib/patient-actions';
import { calculatePatientPhase, calculateProgressPercentage } from '@/lib/phase-engine';
import { Progress } from './ui/progress';
import { PatientTimeline } from './PatientTimeline';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay } from '@/components/ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useSWRConfig } from 'swr';

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
  }, [patient.id]);
  
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
    setIsSubmitting(true);
    try {
      await updatePatientAction(patient.unique_id, data);
      onUpdate();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseLoop = async (reason: string) => {
    setIsSubmitting(true);
    try {
      await updatePatientAction(patient.unique_id, {
        'TB diagnosed (Y/N)': 'N',
        'closure_reason': reason,
        'Remarks': `Loop closed: ${reason}`
      });
      onUpdate();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDemographics = async () => {
    setIsSavingDemographics(true);
    try {
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
      
      // Show success feedback
      console.log('Demographics synced:', result);
    } catch (error) {
      console.error('Failed to save demographics:', error);
      // Revert optimistic update on error
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      alert('Failed to save demographics. Please try again.');
    } finally {
      setIsSavingDemographics(false);
    }
  };

  const Section = ({ id, title, icon: Icon, children, isCurrent = false }: any) => {
    const isExpanded = expandedSection === id;
    return (
      <div className={`border rounded-lg overflow-hidden ${
        isCurrent ? 'border-blue-500 shadow-md' : 'border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? '' : id)}
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
            isCurrent ? 'bg-blue-50 hover:bg-blue-100' : 'bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${isCurrent ? 'text-blue-600' : 'text-slate-600'}`} />
            <span className={`font-semibold text-sm ${isCurrent ? 'text-blue-900' : 'text-slate-700'}`}>
              {title}
            </span>
            {isCurrent && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Current Phase
              </span>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value || 'N/A'}</p>
    </div>
  );

  const EditableField = ({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (val: string) => void; type?: string }) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );

  const EditableSelect = ({ label, value, onChange, options }: { label: string; value: any; onChange: (val: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* CRITICAL - OVERLAY: Z-Index 100000 */}
      <SheetOverlay 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" 
        style={{ zIndex: 100000 }} 
      />
      
      {/* CRITICAL - CONTENT: Z-Index 100001 + Optimized Width */}
      <SheetContent 
        className="!w-[95vw] sm:!max-w-[500px] bg-white border-l border-slate-200 shadow-2xl p-0 flex flex-col h-full" 
        style={{ zIndex: 100001 }}
      >
        {/* Header with Patient Info */}
        <SheetHeader className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold text-slate-900">{patient.inmate_name}</SheetTitle>
              <p className="text-sm text-slate-500 font-mono mt-1">{patient.unique_id}</p>
              
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                isEditingDemographics
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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

          {/* Save Demographics Button */}
          {isEditingDemographics && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-slate-200"
            >
              <button
                type="button"
                onClick={handleSaveDemographics}
                disabled={isSavingDemographics}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
              >
                {isSavingDemographics ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Save className="w-4 h-4" />
                    </motion.div>
                    Syncing to Database & Sheets...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Demographics (Triple Sync)
                  </>
                )}
              </button>
              <p className="text-xs text-center text-slate-500 mt-2">
                Updates Supabase + Patient Linelist + Master Database
              </p>
            </motion.div>
          )}
        </Section>

        {/* Journey Overview Tab - Separate Section */}
        {!isClosed && (
          <Section id="journey" title="Journey Overview" icon={Calendar}>
            <PatientTimeline patient={patient} />
          </Section>
        )}

        {/* Phase-Aware Quick Actions - All Sections Visible */}
        {!isClosed ? (
          <form id="patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {/* Task 1: Sticky Action Footer */}
        {!isClosed && (
          <div className="sticky bottom-0 w-full p-4 border-t border-slate-200 bg-white/80 backdrop-blur-md flex flex-col gap-3 mt-auto">
            <button
              type="submit"
              form="patient-form"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all py-3 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Updates'}
            </button>

            {!showCloseLoop ? (
              <button
                type="button"
                onClick={() => setShowCloseLoop(true)}
                className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium transition-all py-3 rounded-lg flex items-center justify-center gap-2"
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
                  className="text-sm text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
