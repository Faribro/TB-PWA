'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, Settings2, Lock, Unlock, FileText, Shield, ClipboardList, Check, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedToggle } from './ui/AnimatedToggle';

// Field configuration for smart rendering (using exact Supabase snake_case column names)
const FIELD_CONFIG: Record<string, {
  type: 'text' | 'checkbox' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
  readOnly?: boolean;
}> = {
  // Checkbox (Yes/No) fields
  sputum_collected: { type: 'checkbox' },
  tb_diagnosed: { type: 'checkbox' },
  cpt_given: { type: 'checkbox' },

  // Select fields
  sex: {
    type: 'select',
    options: ['Male', 'Female', 'TG']
  },
  screening_state: {
    type: 'select',
    options: ['Gujarat', 'Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Bihar', 'Uttarakhand', 'Jammu and Kashmir', 'Ladakh', 'Goa', 'Chandigarh', 'DD & DNH', 'Mumbai', 'Mizoram', 'Manipur', 'Other']
  },
  screening_district: {
    type: 'select',
    options: [
      // Gujarat
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana',
      // Maharashtra
      'Mumbai City', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Solapur', 'Kolhapur',
      // Madhya Pradesh
      'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Dewas', 'Sagar',
      // Other
      'Other'
    ]
  },
  facility_type: {
    type: 'select',
    options: ['Central Jail', 'District Jail', 'Sub Jail', 'Special Jail', 'Open Jail', 'Borstal Jail', 'Women Jail', 'Other Jail', 'Shakti Sadan', 'Swadhar Greh', 'Ujjawala Home', 'Nari Niketan', 'One Stop Center', 'Other State Run Home', 'Juvenile Homes & CCI', 'DDRC/DDAC/Pvt. DAC', 'Others']
  },
  inmate_type: {
    type: 'select',
    options: ['Under Trial', 'Convicted', 'Other']
  },
  hiv_status: {
    type: 'select',
    options: ['Positive', 'Negative', 'Unknown']
  },
  xray_result: {
    type: 'select',
    options: ['Normal', 'Suspected TB Case']
  },
  tb_past_history: {
    type: 'select',
    options: ['Yes', 'No']
  },
  treatment_regimen: {
    type: 'text'
  },
  tb_diagnosed_select: {
    type: 'select',
    options: ['Yes', 'No', 'Pending']
  },
  sputum_collected_select: {
    type: 'select',
    options: ['Yes', 'No']
  },
  referred_to_facility: {
    type: 'select',
    options: ['DMC-Designated microscopy centre', 'TDC-TB Diagnostic Centre', 'CBNAAT', 'DST-Drug susceptibility testing', 'Radiology', 'Histopathology', 'ART Centre', 'Pvt. & Others', 'Other']
  },
  // Text fields for "Other" specifications
  screening_state_other: { type: 'text', placeholder: 'Specify other state' },
  screening_district_other: { type: 'text', placeholder: 'Specify other district' },
  inmate_type_other: { type: 'text', placeholder: 'Specify other inmate type' },
  referred_to_facility_other: { type: 'text', placeholder: 'Specify other facility' },

  // Date fields
  screening_date: { type: 'date' },
  submitted_on: { type: 'date' },
  date_of_birth: { type: 'date' },
  referral_date: { type: 'date' },
  diagnosis_date: { type: 'date' },
  att_start_date: { type: 'date' },
  art_started: { type: 'date' },

  // Number fields
  age: { type: 'number', placeholder: 'Age in years' },
  ai_confidence_score: { type: 'number', placeholder: '0-100', readOnly: true },

  // Text fields (explicit for clarity)
  inmate_name: { type: 'text' },
  father_husband_name: { type: 'text' },
  contact_number: { type: 'text' },
  address: { type: 'text' },
  staff_name: { type: 'text' },
  facility_name: { type: 'text' },
  unique_id: { type: 'text' },
  art_center: { type: 'text' },
  nikshay_id: { type: 'text' },
  abha_id: { type: 'text' },
  kobo_uuid: { type: 'text' },
};

// Explicit Master List for 10S Symptoms (per Kobo dictionary mapping)
const SYMPTOMS_MASTER = [
  { id: 'cough', koboKey: 'cough_of_any_duration', label: 'Cough' },
  { id: 'haemoptysis', koboKey: 'fever', label: 'Haemoptysis' },
  { id: 'chest_pain', koboKey: 'weight_loss', label: 'Chest Pain' },
  { id: 'fever_symptom', koboKey: 'night_sweats', label: 'Fever' },
  { id: 'night_sweats_symptom', koboKey: 'lymph_nodes', label: 'Night Sweats' },
  { id: 'loss_of_appetite', koboKey: 'loss_of_appetite', label: 'Loss of Appetite' },
  { id: 'weight_loss_actual', koboKey: 'Weight_Loss_2', label: 'Weight Loss' },
  { id: 'dyspnea', koboKey: 'Dyspnea', label: 'Dyspnea' },
  { id: 'fatigue', koboKey: 'Fatigue', label: 'Fatigue' },
  { id: 'reduced_activity', koboKey: 'Reduced_Physical_Activity', label: 'Reduced Physical Activity' },
];

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}

const Chapter = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2.5 mb-5 pb-3 border-b-2 border-slate-100">
      <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-[14px] font-black text-slate-800 tracking-wider uppercase">{title}</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

const ChecklistItem = ({ label, isSelected }: { label: string, isSelected: boolean }) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
    isSelected 
      ? 'bg-red-50 border-red-200 text-red-900 shadow-sm' 
      : 'bg-slate-50/50 border-slate-200/60 text-slate-500'
  }`}>
    <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
      isSelected ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-200 text-slate-400'
    }`}>
      {isSelected ? <Check className="w-3 h-3" strokeWidth={3} /> : <Minus className="w-3 h-3" strokeWidth={2} />}
    </div>
    <span className={`text-[13px] leading-tight ${isSelected ? 'font-bold' : 'font-medium opacity-80'}`}>{label}</span>
  </div>
);

const DataField = ({
  label, value, fieldKey, type, options, editable = false, isEditing, onChange, icon: Icon
}: any) => {
  const config = fieldKey ? FIELD_CONFIG[fieldKey] : null;
  const detectedType = config?.type ?? type ?? 'text';
  const detectedOptions = options ?? config?.options;
  const isReadOnly = config?.readOnly ?? false;
  const showInput = editable && !isReadOnly && isEditing && fieldKey && onChange;

  const toBool = (v: any) => v === true || v === 1 || v === 'true' || v === 'yes' || v === 'Yes';
  const isMissing = value === null || value === undefined || value === '';

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {label}
      </div>
      
      {showInput ? (
        <div className="relative">
           {detectedType === 'checkbox' ? (
              <AnimatedToggle
                checked={toBool(value)}
                onChange={(checked) => onChange(fieldKey, checked)}
                size="sm"
                variant="neon"
              />
           ) : detectedType === 'select' && detectedOptions ? (
              <div className="relative">
                <select
                  value={value ?? ''}
                  onChange={(e) => onChange(fieldKey, e.target.value)}
                  className="w-full appearance-none text-[13px] font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="" disabled className="text-slate-400">Select...</option>
                  {detectedOptions.map(opt => (
                    <option key={opt} value={opt} className="text-slate-900 font-medium">{opt}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
           ) : (
              <input
                type={detectedType === 'number' ? 'number' : detectedType === 'date' ? 'date' : 'text'}
                value={value ?? ''}
                onChange={(e) => onChange(fieldKey, detectedType === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={config?.placeholder ?? `Enter ${label.toLowerCase()}`}
                className="w-full text-[13px] font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
           )}
        </div>
      ) : (
        <div className="text-[14px] font-semibold text-slate-900 leading-tight truncate whitespace-normal break-words mt-0.5">
          {isMissing ? (
            <span className="text-slate-400/80 font-medium italic text-[13px]">Not recorded</span>
          ) : detectedType === 'checkbox' ? (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${
              toBool(value)
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${toBool(value) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {toBool(value) ? 'Yes' : 'No'}
            </span>
          ) : (
            value
          )}
        </div>
      )}
    </div>
  );
};

export function DemographicsCarousel({ 
  patient,
  editedDemographics,
  setEditedDemographics,
  isEditingDemographics,
  setIsEditingDemographics 
}: DemographicsCarouselProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleFieldChange = useCallback((key: string, value: any) => {
    const config = FIELD_CONFIG[key];
    if (config?.type === 'checkbox') {
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
      return;
    }
    
    setLocalValues(prev => ({ ...prev, [key]: value }));
    
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    debounceTimers.current[key] = setTimeout(() => {
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
    }, 300);
  }, [setEditedDemographics]);

  const getValue = useCallback((key: string, fallback: any) => {
    return localValues[key] ?? editedDemographics[key] ?? fallback;
  }, [localValues, editedDemographics]);

  // Robust parsing of address parts from Kobo structure
  const getFullAddress = useCallback(() => {
    if (localValues['address'] !== undefined) return localValues['address'];
    if (editedDemographics['address'] !== undefined) return editedDemographics['address'];
    if (patient?.address) return patient.address;

    const formatAddressPart = (part: any) => {
      if (!part || typeof part !== 'string' || part.toLowerCase() === 'other') return null;
      const clean = part.trim().replace(/_/g, ' ');
      return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const parts = [
      patient?.address_block_house,
      patient?.address_street,
      patient?.address_city,
      formatAddressPart(patient?.address_district_other || patient?.address_district),
      formatAddressPart(patient?.address_state_foreign || patient?.address_state),
      patient?.address_pin_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }, [patient, localValues, editedDemographics]);

  // Map 10S string exactly to Kobo keys and English labels safely
  const parsedSymptoms = useMemo(() => {
    const result: Record<string, boolean> = {};
    SYMPTOMS_MASTER.forEach(sym => result[sym.id] = false);

    const raw = patient?.symptoms_10s;
    if (!raw || typeof raw !== 'string' || raw.toLowerCase() === 'n/a' || raw.includes('No_Symptomps') || raw.toLowerCase().includes('no symptoms')) {
      return result;
    }
    
    const rawLower = raw.toLowerCase();
    
    SYMPTOMS_MASTER.forEach(sym => {
      const keyLower = sym.koboKey.toLowerCase();
      const keySpaced = keyLower.replace(/_/g, ' ');
      const labelLower = sym.label.toLowerCase();
      
      if (rawLower.includes(keyLower) || rawLower.includes(keySpaced) || rawLower.includes(labelLower)) {
        result[sym.id] = true;
      }
    });

    return result;
  }, [patient?.symptoms_10s]);

  const toBool = (v: any) => v === true || v === 'yes' || v === 'Yes';

  if (!patient) return null;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-8 pb-32 hide-scrollbar"
      >
        <div className="max-w-5xl mx-auto">
          
          {/* Single Page Document Surface with Liquid Metal Border */}
          <div className="relative p-[2px] rounded-xl mb-8 group">
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-200 via-indigo-200 to-slate-200 opacity-60 group-hover:opacity-100 transition-opacity duration-500" 
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 3s linear infinite'
                 }} />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
            
            <div className="relative bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
             
             {/* Document Header Zone */}
             <div className="bg-slate-900 px-6 sm:px-10 py-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-[5px] border-indigo-500 relative overflow-hidden">
               {/* Soft glow accent in background */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
               
               <div className="flex flex-col gap-2.5 relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {getValue('inmate_name', patient?.inmate_name) || 'Unknown Patient'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5"><Hash className="w-4 h-4 text-indigo-400"/> ID: {getValue('unique_id', patient?.unique_id || patient?.serial_number)}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-indigo-400"/> {getValue('age', patient?.age)} Yrs • {getValue('sex', patient?.sex)}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-indigo-400"/> {getValue('facility_name', patient?.facility_name)}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 relative z-10">
                  {toBool(getValue('tb_diagnosed_select', getValue('tb_diagnosed', patient?.tb_diagnosed))) && (
                    <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg font-bold text-[11px] uppercase tracking-wider border border-red-500/20 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      TB Diagnosed
                    </span>
                  )}
                  {getValue('hiv_status', patient?.hiv_status) === 'Positive' && (
                    <span className="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-lg font-bold text-[11px] uppercase tracking-wider border border-pink-500/20 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      HIV Positive
                    </span>
                  )}
               </div>
             </div>

             {/* Document Body */}
             <div className="p-6 sm:p-10 flex flex-col gap-12">
                
                <Chapter title="Identity & Contact" icon={User}>
                  <DataField label="Father / Husband" value={getValue('father_husband_name', patient?.father_husband_name)} fieldKey="father_husband_name" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Date of Birth" value={getValue('date_of_birth', patient?.date_of_birth)} fieldKey="date_of_birth" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Age" value={getValue('age', patient?.age)} fieldKey="age" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Sex" value={getValue('sex', patient?.sex)} fieldKey="sex" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Inmate Type" value={getValue('inmate_type', patient?.inmate_type)} fieldKey="inmate_type" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  {getValue('inmate_type', patient?.inmate_type) === 'Other' && (
                    <DataField label="Specify Other Type" value={getValue('inmate_type_other', patient?.inmate_type_other)} fieldKey="inmate_type_other" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  )}
                  <DataField label="Contact Number" value={getValue('contact_number', patient?.contact_number)} fieldKey="contact_number" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-2">
                    <DataField label="Full Address" value={getFullAddress()} fieldKey="address" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  </div>
                </Chapter>

                <Chapter title="Screening Encounter" icon={Activity}>
                  <DataField label="Screening Date" value={getValue('screening_date', patient?.screening_date)} fieldKey="screening_date" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Facility Type" value={getValue('facility_type', patient?.facility_type)} fieldKey="facility_type" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Screening State" value={getValue('screening_state', patient?.screening_state)} fieldKey="screening_state" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  {getValue('screening_state', patient?.screening_state) === 'Other' && (
                    <DataField label="Specify Other State" value={getValue('screening_state_other', patient?.screening_state_other)} fieldKey="screening_state_other" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  )}
                  <DataField label="Screening District" value={getValue('screening_district', patient?.screening_district)} fieldKey="screening_district" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  {getValue('screening_district', patient?.screening_district) === 'Other' && (
                    <DataField label="Specify Other District" value={getValue('screening_district_other', patient?.screening_district_other)} fieldKey="screening_district_other" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  )}
                  <DataField label="Staff Name" value={getValue('staff_name', patient?.staff_name)} fieldKey="staff_name" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Submitted On" value={getValue('submitted_on', patient?.submitted_on)} fieldKey="submitted_on" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                </Chapter>

                <Chapter title="TB 10S Symptoms Checklist" icon={ClipboardList}>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-1">
                      {SYMPTOMS_MASTER.map(sym => (
                        <ChecklistItem key={sym.id} label={sym.label} isSelected={parsedSymptoms[sym.id]} />
                      ))}
                    </div>
                  </div>
                </Chapter>

                <Chapter title="Diagnostics & Treatment" icon={FileText}>
                  <DataField label="X-Ray Result" value={getValue('xray_result', patient?.xray_result)} fieldKey="xray_result" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Sputum Collected" value={getValue('sputum_collected_select', getValue('sputum_collected', patient?.sputum_collected))} fieldKey="sputum_collected_select" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="TB Past History" value={getValue('tb_past_history', patient?.tb_past_history)} fieldKey="tb_past_history" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="TB Diagnosed" value={getValue('tb_diagnosed_select', getValue('tb_diagnosed', patient?.tb_diagnosed))} fieldKey="tb_diagnosed_select" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Diagnosis Date" value={getValue('diagnosis_date', patient?.diagnosis_date)} fieldKey="diagnosis_date" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="ATT Start Date" value={getValue('att_start_date', patient?.att_start_date)} fieldKey="att_start_date" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  
                  <div className="col-span-1 sm:col-span-2">
                    <DataField label="Treatment Regimen" value={getValue('treatment_regimen', patient?.treatment_regimen)} fieldKey="treatment_regimen" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  </div>

                  <DataField label="Referral Date" value={getValue('referral_date', patient?.referral_date)} fieldKey="referral_date" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <div className="col-span-1 sm:col-span-2">
                     <DataField label="Referred To" value={getValue('referred_to_facility', patient?.referred_to_facility)} fieldKey="referred_to_facility" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                     {getValue('referred_to_facility', patient?.referred_to_facility) === 'Other' && (
                       <div className="mt-4">
                         <DataField label="Specify Other Facility" value={getValue('referred_to_facility_other', patient?.referred_to_facility_other)} fieldKey="referred_to_facility_other" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                       </div>
                     )}
                  </div>
                  <DataField label="AI Confidence Score" value={getValue('ai_confidence_score', patient?.ai_confidence_score)} fieldKey="ai_confidence_score" editable={false} isEditing={isEditingDemographics} onChange={handleFieldChange} />
                </Chapter>

                <Chapter title="HIV / ART Status" icon={Shield}>
                  <DataField label="HIV Status" value={getValue('hiv_status', patient?.hiv_status)} fieldKey="hiv_status" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="ART Started" value={getValue('art_started', patient?.art_started)} fieldKey="art_started" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="ART Center" value={getValue('art_center', patient?.art_center)} fieldKey="art_center" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="CPT Given" value={getValue('cpt_given', patient?.cpt_given)} fieldKey="cpt_given" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                </Chapter>

                <Chapter title="Registration & System" icon={Settings2}>
                  <DataField label="Nikshay ID" value={getValue('nikshay_id', patient?.nikshay_id)} fieldKey="nikshay_id" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="ABHA ID" value={getValue('abha_id', patient?.abha_id)} fieldKey="abha_id" editable isEditing={isEditingDemographics} onChange={handleFieldChange} />
                  <DataField label="Kobo UUID" value={getValue('kobo_uuid', patient?.kobo_uuid)} fieldKey="kobo_uuid" editable={false} isEditing={isEditingDemographics} onChange={handleFieldChange} />
                </Chapter>

             </div>
          </div>
          </div>
        </div>
      </motion.div>
      
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Fixed Action Bar */}
      <div className="absolute bottom-0 left-0 w-full flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
        <button 
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl transition-all duration-300 font-bold text-[11px] uppercase tracking-[0.1em]"
          style={{
            border: `1.5px solid ${isEditingDemographics ? '#10b98140' : '#e2e8f0'}`,
            backgroundColor: isEditingDemographics ? '#10b98110' : '#f8fafc',
            color: isEditingDemographics ? '#10b981' : '#64748b'
          }}
          onClick={() => setIsEditingDemographics(!isEditingDemographics)}
        >
          {isEditingDemographics ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Lock Editing</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Unlock to Edit</span>
            </>
          )}
        </button>

        <button 
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-red-200 text-red-500 font-bold text-[11px] uppercase tracking-[0.1em] hover:bg-red-50 hover:border-red-300 transition-all duration-300 shadow-sm"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('openCloseLoopModal'));
          }}
        >
          <XCircle className="w-4 h-4" />
          <span>Close Loop</span>
        </button>

        <button 
          className="flex-[2] relative flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[11px] uppercase tracking-[0.1em] text-white overflow-hidden group transition-all duration-300 shadow-[0_4px_14px_rgb(15,23,42,0.15)] hover:shadow-[0_8px_20px_rgb(15,23,42,0.25)] hover:-translate-y-px active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
          }}
          onClick={() => {
            if (isEditingDemographics) {
              document.dispatchEvent(new CustomEvent('saveDemographicsEvent'));
              setIsEditingDemographics(false);
            } else {
              document.dispatchEvent(new CustomEvent('submitClinicalUpdateEvent'));
            }
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
          <CheckCircle2 className="w-4 h-4 text-white/80" />
          <span>{isEditingDemographics ? 'Save Changes' : 'Submit Update'}</span>
        </button>
      </div>
    </div>
  );
}
