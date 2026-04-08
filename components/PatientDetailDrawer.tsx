'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, FileText, Activity, Pill, Shield, ChevronDown, AlertCircle, CheckCircle2, Calendar, Sparkles, Lock, Unlock, Save } from 'lucide-react';
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

interface PatientDetailDrawerProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col gap-0.5 group">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors group-hover:text-blue-500">{label}</label>
    <div className="text-sm font-bold text-slate-800 bg-slate-50/50 p-2 rounded-lg border border-transparent transition-all group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-sm">
      {value || <span className="text-slate-300 font-normal italic">Not recorded</span>}
    </div>
  </div>
);

const EditableField = ({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (val: string) => void; type?: string }) => (
  <div className="group">
    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-blue-700">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 text-sm font-medium bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] rounded-xl transition-all duration-300"
    />
  </div>
);

const EditableSelect = ({ label, value, onChange, options }: { label: string; value: any; onChange: (val: string) => void; options: { value: string; label: string }[] }) => (
  <div className="group">
    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-sm font-medium ring-offset-white appearance-none outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 pr-10"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
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

  useEffect(() => {
    if (patient && Object.keys(patient).length > 0) {
      setLocalPatient(patient);
    }
  }, [patient]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseLoop, setShowCloseLoop] = useState(false);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);

  useHotkeys({
    'meta+s': (e) => {
      e.preventDefault();
      if (isOpen && !isSubmitting && !isSavingDemographics) {
        if (isEditingDemographics) handleSaveDemographics();
        else handleSaveClinical();
      }
    },
    'escape': () => {
      if (isOpen && !isSubmitting) onClose();
    }
  });

  const { watch, getValues, reset } = useForm<PatientFormData>({
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

  useEffect(() => {
    if (patient) {
      reset({
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': patient.referral_date || '',
        'Name of facility where referred to (Give code/name of all facilities)': patient.referred_facility || '',
        'TB diagnosed (Y/N)': patient.tb_diagnosed || '',
        'Date of TB Diagnosed (dd/mm/yy)': patient.tb_diagnosis_date || '',
        'Date of starting ATT (dd/mm/yyyy)': patient.att_start_date || '',
        'Date of Treatment Completion (dd/mm/yyyy)': patient.att_completion_date || '',
        'NIKSHAY/ABHA ID': patient.nikshay_abha_id || '',
        'Remarks': patient.remarks || ''
      });
    }
  }, [patient, reset]);

  // ── Demographics State with Aggressive API Fallbacks ──
  const mapDemographics = (p: any) => ({
    inmate_name: p?.inmate_name || p?.['Inmate Name'] || p?.patient_name || p?.name || '',
    age: p?.age || p?.['Age'] || '',
    sex: p?.sex || p?.['Sex (Male/Female/TG)'] || p?.gender || p?.['Gender'] || '',
    contact_number: p?.contact_number || p?.['Contact Number'] || p?.phone || p?.mobile || '',
    address: p?.address || p?.['Address'] || p?.residential_address || '',
    facility_name: p?.facility_name || p?.['Name of Facility'] || p?.['Facility'] || '',
    date_of_birth: p?.date_of_birth || p?.['Date of Birth'] || p?.dob || '',
    screening_date: p?.screening_date || p?.['Date of Screening'] || p?.submitted_on || ''
  });

  const [editedDemographics, setEditedDemographics] = useState(mapDemographics(localPatient));

  // Re-sync demographics when a new patient is opened
  useEffect(() => {
    if (localPatient) {
      setEditedDemographics(mapDemographics(localPatient));
      setIsEditingDemographics(false);
    }
  }, [localPatient]);

  const { phase } = calculatePatientPhase(localPatient);
  const isClosed = phase === 'Closed';
  const isAuthorized = !scope || !localPatient || isSuperuser(scope) || !scope.state || localPatient.screening_state === scope.state;

  const handleSaveClinical = async () => {
    const formData = getValues();
    setIsSubmitting(true);

    try {
      const updates = {
        ...formData,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates
        })
      });

      if (!res.ok) throw new Error('Sync failed');

      const result = await res.json();
      
      mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      onUpdate();
      
      if (result.warnings?.length > 0) {
        toast.warning(`⚠️ ${result.warnings[0]}`, { id: 'clinical-save' });
      } else if (result.googleSheets?.success) {
        const rows = result.googleSheets?.data?.rowsUpdated || 0;
        toast.success(`✅ Google Sheets synced: ${rows} row(s) updated.`, { id: 'clinical-save' });
      } else {
        toast.success('✅ Clinical data synced to Supabase', { id: 'clinical-save' });
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('❌ Failed to sync. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDemographics = async () => {
    setIsSavingDemographics(true);

    try {
      const updates = {
        ...editedDemographics,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates
        })
      });

      if (!res.ok) throw new Error('Sync failed');

      const result = await res.json();
      
      mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      setLocalPatient(prev => ({ ...prev, ...editedDemographics }));
      setIsEditingDemographics(false);
      onUpdate();

      if (result.warnings?.length > 0) {
        toast.warning(`⚠️ ${result.warnings[0]}`, { id: 'demo-save' });
      } else if (result.googleSheets?.success) {
        const rows = result.googleSheets?.data?.rowsUpdated || 0;
        toast.success(`✅ Demographics synced — Sheets updated: ${rows} row(s).`, { id: 'demo-save' });
      } else {
        toast.success('✅ Demographics synced to Supabase', { id: 'demo-save' });
      }
    } catch (error) {
      toast.error('❌ Failed to save demographics.');
    } finally {
      setIsSavingDemographics(false);
    }
  };

  const handleCloseLoop = async (reason: string) => {
    if (!reason) return;
    setIsSubmitting(true);

    try {
      const updates = {
        'TB diagnosed (Y/N)': 'N',
        'Reason for not diagnosing/starting ATT (If TB diagnosed is N)': reason,
        'Remarks': `Loop closed: ${reason}`,
        'Serial Number': localPatient.serial_number || localPatient.id,
        'KoboUUID': localPatient.kobo_uuid
      };

      const res = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates
        })
      });

      if (!res.ok) throw new Error('Sync failed');

      const result = await res.json();
      
      mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      onUpdate();
      onClose();

      if (result.googleSheets?.success) {
        const rows = result.googleSheets?.data?.rowsUpdated || 0;
        toast.success(`✅ Loop closed & synced — Sheets: ${rows} row(s).`, { id: 'close-loop' });
      } else {
        toast.success('✅ Loop closed & synced to Supabase', { id: 'close-loop' });
      }
    } catch (error) {
      toast.error('❌ Failed to close loop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const risk = calculatePatientRisk(localPatient);

  if (!localPatient || !patient) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[95vw] sm:max-w-[650px] md:max-w-[750px] lg:max-w-[850px] !z-[500] p-0 flex flex-col overflow-hidden">
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
            <SheetHeader className="px-6 py-6 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                    {localPatient?.inmate_name || 'Loading...'}
                    {risk.riskLevel === 'high' && (
                      <div className="relative flex h-3 w-3 shrink-0" title={risk.reason}>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </div>
                    )}
                  </SheetTitle>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 opacity-80">{localPatient?.unique_id || ''}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Clinical Phase: {phase}</span>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="clinical" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 border-b border-slate-100">
                <TabsList className="bg-transparent gap-6 h-12">
                  <TabsTrigger
                    value="clinical"
                    data-tour-id="clinical-tab"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black uppercase text-[11px] tracking-widest"
                  >
                    Clinical
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin"
                    data-tour-id="admin-journey-tab"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black uppercase text-[11px] tracking-widest"
                  >
                    Admin & Journey
                  </TabsTrigger>
                  <TabsTrigger
                    value="demographics"
                    data-tour-id="demographics-tab"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black uppercase text-[11px] tracking-widest"
                  >
                    Demographics
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="clinical" className="mt-0 space-y-6">
                    <div data-tour-id="sputum-referral-section">
                      <Section title="Sputum & Referral" icon={FileText} isCurrent={phase === 'Sputum Test'}>
                        <EditableField label="Referral Date" value={watch('Date of referral for TB Examination (sputum) (dd/mm/yy)')} onChange={(val) => reset({ ...getValues(), 'Date of referral for TB Examination (sputum) (dd/mm/yy)': val })} type="date" />
                        <EditableSelect 
                          label="Referred Facility" 
                          value={watch('Name of facility where referred to (Give code/name of all facilities)')} 
                          onChange={(val) => reset({ ...getValues(), 'Name of facility where referred to (Give code/name of all facilities)': val })}
                          options={[
                            { value: '', label: 'Select facility' },
                            { value: 'DMC-Designated microscopy Centre', label: 'DMC' },
                            { value: 'CBNAAT', label: 'CBNAAT' },
                            { value: 'Radiology', label: 'Radiology' }
                          ]}
                        />
                      </Section>
                    </div>

                    <div data-tour-id="diagnosis-section">
                      <Section title="Diagnosis" icon={Activity} isCurrent={phase === 'Diagnosis'}>
                        <EditableSelect 
                          label="TB Diagnosed" 
                          value={watch('TB diagnosed (Y/N)')} 
                          onChange={(val) => reset({ ...getValues(), 'TB diagnosed (Y/N)': val })}
                          options={[{ value: '', label: 'Select' }, { value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
                        />
                        <EditableField label="Date of Diagnosis" value={watch('Date of TB Diagnosed (dd/mm/yy)')} onChange={(val) => reset({ ...getValues(), 'Date of TB Diagnosed (dd/mm/yy)': val })} type="date" />
                      </Section>
                    </div>

                    <div data-tour-id="att-initiation-section">
                      <Section title="ATT Initiation" icon={Pill} isCurrent={phase === 'ATT Initiation'}>
                        <EditableField label="Start Date" value={watch('Date of starting ATT (dd/mm/yyyy)')} onChange={(val) => reset({ ...getValues(), 'Date of starting ATT (dd/mm/yyyy)': val })} type="date" />
                        <EditableField label="Completion Date" value={watch('Date of Treatment Completion (dd/mm/yyyy)')} onChange={(val) => reset({ ...getValues(), 'Date of Treatment Completion (dd/mm/yyyy)': val })} type="date" />
                      </Section>
                    </div>
                  </TabsContent>

                  <TabsContent value="admin" className="mt-0 space-y-6">
                    <Section title="Patient Timeline" icon={Calendar}>
                      <PatientHistory patient={localPatient} />
                    </Section>
                    <Section title="Administration" icon={Shield}>
                      <EditableField label="NIKSHAY/ABHA ID" value={watch('NIKSHAY/ABHA ID')} onChange={(val) => reset({ ...getValues(), 'NIKSHAY/ABHA ID': val })} />
                      <div>
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Remarks</label>
                        <VoiceInput 
                          value={watch('Remarks')} 
                          onChange={(val) => reset({ ...getValues(), Remarks: val })}
                          className="w-full border-slate-200 rounded-xl"
                        />
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="demographics" className="mt-0 space-y-6">
                    {/* Lock/Unlock Toggle */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-2">
                        {isEditingDemographics ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
                        <span className="text-xs font-black uppercase text-slate-700">{isEditingDemographics ? 'Edit Mode Active' : 'Read-Only Mode'}</span>
                      </div>
                      <button 
                        onClick={() => setIsEditingDemographics(!isEditingDemographics)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${isEditingDemographics ? 'bg-white text-slate-700 shadow-sm' : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_0_#047857,0_8px_16px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_0_#047857,0_10px_20px_rgba(16,185,129,0.5)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_#047857] active:translate-y-1'}`}
                      >
                        {isEditingDemographics ? 'Lock & Cancel' : 'Unlock to Edit'}
                      </button>
                    </div>

                    {/* Editable / Read-Only Demographics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {isEditingDemographics ? (
                        <>
                          <div className="col-span-2"><EditableField label="Name" value={editedDemographics.inmate_name} onChange={(v) => setEditedDemographics({...editedDemographics, inmate_name: v})} /></div>
                          <EditableField label="Age" value={editedDemographics.age} onChange={(v) => setEditedDemographics({...editedDemographics, age: v})} />
                          <EditableSelect label="Sex" value={editedDemographics.sex} onChange={(v) => setEditedDemographics({...editedDemographics, sex: v})} options={[{value:'Male', label:'Male'}, {value:'Female', label:'Female'}, {value:'TG', label:'Transgender'}]} />
                          <EditableField label="Date of Birth" value={editedDemographics.date_of_birth} onChange={(v) => setEditedDemographics({...editedDemographics, date_of_birth: v})} type="date" />
                          <EditableField label="Screening Date" value={editedDemographics.screening_date} onChange={(v) => setEditedDemographics({...editedDemographics, screening_date: v})} type="date" />
                          <EditableField label="Contact Number" value={editedDemographics.contact_number} onChange={(v) => setEditedDemographics({...editedDemographics, contact_number: v})} />
                          <div className="col-span-2"><EditableField label="Address" value={editedDemographics.address} onChange={(v) => setEditedDemographics({...editedDemographics, address: v})} /></div>
                          <div className="col-span-2"><EditableField label="Facility Name" value={editedDemographics.facility_name} onChange={(v) => setEditedDemographics({...editedDemographics, facility_name: v})} /></div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-2"><ReadOnlyField label="Name" value={localPatient?.inmate_name || localPatient?.['Inmate Name'] || localPatient?.patient_name} /></div>
                          <ReadOnlyField label="Age" value={localPatient?.age || localPatient?.['Age']} />
                          <ReadOnlyField label="Sex" value={localPatient?.sex || localPatient?.['Sex (Male/Female/TG)'] || localPatient?.gender} />
                          <ReadOnlyField label="Date of Birth" value={localPatient?.date_of_birth || localPatient?.['Date of Birth'] || localPatient?.dob} />
                          <ReadOnlyField label="Screening Date" value={localPatient?.screening_date || localPatient?.['Date of Screening'] || localPatient?.submitted_on} />
                          <ReadOnlyField label="Contact Number" value={localPatient?.contact_number || localPatient?.['Contact Number'] || localPatient?.phone || localPatient?.mobile} />
                          <div className="col-span-2"><ReadOnlyField label="Address" value={localPatient?.address || localPatient?.['Address'] || localPatient?.residential_address} /></div>
                          <div className="col-span-2"><ReadOnlyField label="Facility" value={localPatient?.facility_name || localPatient?.['Name of Facility'] || localPatient?.['Facility']} /></div>
                        </>
                      )}
                    </div>

                    {/* KoboCollect System Metadata — Always Read-Only */}
                    <Section title="System Metadata" icon={AlertCircle}>
                      <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Staff Name" value={localPatient?.staff_name || localPatient?.['Staff Name'] || localPatient?.data_collector} />
                        <ReadOnlyField label="Submitted On" value={localPatient?.submitted_on || localPatient?.['Submitted On'] || localPatient?.submission_date} />
                        <ReadOnlyField label="State" value={localPatient?.screening_state || localPatient?.['State'] || localPatient?.state} />
                        <ReadOnlyField label="District" value={localPatient?.screening_district || localPatient?.['District'] || localPatient?.district} />
                        <ReadOnlyField label="Facility Type" value={localPatient?.facility_type || localPatient?.['Facility Type']} />
                        <ReadOnlyField label="Inmate Type" value={localPatient?.inmate_type || localPatient?.['Inmate Type']} />
                        <div className="col-span-2"><ReadOnlyField label="Father/Husband Name" value={localPatient?.father_husband_name || localPatient?.['Father/Husband Name'] || localPatient?.father_name} /></div>
                        <ReadOnlyField label="Chest X-ray Result" value={localPatient?.xray_result || localPatient?.chest_x_ray_result || localPatient?.['Chest X-ray Result']} />
                        <ReadOnlyField label="10s Symptoms" value={localPatient?.symptoms_present || localPatient?.symptoms_10s || localPatient?.['10s Symptoms']} />
                        <div className="col-span-2"><ReadOnlyField label="Past TB History" value={localPatient?.past_tb_history || localPatient?.['Past TB History'] || localPatient?.tb_history} /></div>
                      </div>
                    </Section>
                  </TabsContent>
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t border-slate-100 bg-white/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
                {isEditingDemographics && (
                  <button onClick={handleSaveDemographics} disabled={isSavingDemographics} className="w-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white font-black uppercase text-[11px] tracking-widest py-3 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_0_#047857,0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_0_#047857,0_12px_24px_rgba(16,185,129,0.5)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#047857] active:translate-y-1.5 transition-all flex items-center justify-center gap-2">
                    {isSavingDemographics ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Demographics
                  </button>
                )}
                
                {!isEditingDemographics && phase !== 'Closed' && (
                  <button
                    data-tour-id="submit-clinical-update"
                    onClick={handleSaveClinical}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest py-3 rounded-2xl shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Submit Clinical Update
                  </button>
                )}

                {!isClosed && !showCloseLoop && (
                  <button
                    data-tour-id="close-loop-button"
                    onClick={() => setShowCloseLoop(true)}
                    className="w-full text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 py-2 rounded-xl transition-colors"
                  >
                    Close Loop (Not TB)
                  </button>
                )}

                {showCloseLoop && (
                  <div className="p-3 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                    <p className="text-[10px] font-black uppercase text-red-700 tracking-wider">Confirm Loop Closure</p>
                    <select onChange={(e) => handleCloseLoop(e.target.value)} className="w-full text-xs p-2 rounded-xl border border-red-200">
                      <option value="">Select reason...</option>
                      <option value="Negative sputum">Negative sputum</option>
                      <option value="CXR Normal">CXR Normal</option>
                    </select>
                    <button onClick={() => setShowCloseLoop(false)} className="text-[9px] font-bold text-red-400 uppercase">Cancel</button>
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
