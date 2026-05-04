'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, Settings2, Lock, Unlock, FileText, Shield, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}

const FormSectionTitle = ({ icon: Icon, title, colorCode }: { icon: any; title: string; colorCode: string }) => (
  <div className="flex items-center gap-2 mb-2 mt-1">
    <div 
      className="flex items-center justify-center w-5 h-5 rounded-md shadow-sm relative overflow-hidden"
      style={{ backgroundColor: `${colorCode}15`, border: `1px solid ${colorCode}30` }}
    >
      <div className="absolute inset-0 opacity-50" style={{ background: `linear-gradient(135deg, transparent, ${colorCode}20)` }} />
      <Icon className="w-2.5 h-2.5 relative z-10" style={{ color: colorCode }} />
    </div>
    <div className="flex-1 flex items-center gap-2">
      <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500/90">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
    </div>
  </div>
);

const FormFieldRow = ({ 
  label, 
  value, 
  icon: Icon,
  editable = false,
  fieldKey,
  fieldType,
  options,
  isEditing,
  onChange,
  colorCode = '#64748b'
}: { 
  label: string; 
  value: any; 
  icon?: any;
  editable?: boolean;
  fieldKey?: string;
  fieldType?: 'text' | 'date' | 'select' | 'checkbox' | 'number';
  options?: string[];
  isEditing?: boolean;
  onChange?: (key: string, value: any) => void;
  colorCode?: string;
}) => {
  // Auto-detect field type from config if not explicitly provided
  const config = fieldKey ? FIELD_CONFIG[fieldKey] : null;
  const detectedType = config?.type ?? fieldType ?? 'text';
  const detectedOptions = options ?? config?.options;
  
  // Helper to check if value is boolean-like
  const isBoolean = (v: any) =>
    v === true || v === false ||
    v === 'true' || v === 'false' ||
    v === 'yes' || v === 'no' ||
    v === 'Yes' || v === 'No' ||
    v === 1 || v === 0;

  const toBool = (v: any): boolean => {
    if (v === true || v === 1 || 
        v === 'true' || v === 'yes' || v === 'Yes') return true;
    return false;
  };

  const displayValue = value ?? '';
  const isReadOnly = config?.readOnly ?? false;
  const showInput = editable && !isReadOnly && isEditing && fieldKey && onChange;

  // Render checkbox toggle switch
  const renderCheckbox = () => {
    const isChecked = toBool(value);
    
    if (!showInput) {
      // View mode: show badge
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
          isChecked
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isChecked ? 'bg-emerald-500' : 'bg-slate-400'
          }`} />
          {isChecked ? 'Yes' : 'No'}
        </span>
      );
    }

    // Edit mode: show toggle switch
    return (
      <button
        type="button"
        onClick={() => onChange(fieldKey, !isChecked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 
                    cursor-pointer rounded-full border-2 
                    transition-colors duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          isChecked
            ? 'bg-emerald-500 border-emerald-500 focus:ring-emerald-400'
            : 'bg-slate-200 border-slate-300 focus:ring-slate-400'
        }`}
        role="switch"
        aria-checked={isChecked}
        aria-label={label}
        style={{
          boxShadow: isChecked ? `0 0 0 2px ${colorCode}15` : undefined
        }}
      >
        <span className={`inline-block h-4 w-4 transform 
                         rounded-full bg-white shadow-sm
                         transition duration-200 ease-in-out ${
          isChecked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    );
  };

  return (
    <div className="group relative flex flex-col gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300 hover:bg-white/60 border border-transparent hover:border-slate-200/50 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
      {/* Label Row */}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 transition-colors duration-300" style={{ color: showInput ? colorCode : '#94a3b8' }} />}
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500/80">{label}</span>
      </div>

      {/* Value / Input Row */}
      <div className="relative mt-0.5">
        {detectedType === 'checkbox' ? (
          <div className="w-full min-h-[26px] flex items-center px-2 py-1">
            {renderCheckbox()}
          </div>
        ) : showInput ? (
          detectedType === 'select' && detectedOptions ? (
            <div className="relative">
              <select
                value={displayValue}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                className="w-full appearance-none text-[11px] font-semibold text-slate-800 bg-white/90 border border-slate-200/80 rounded-md px-2 py-1 outline-none transition-all duration-300 focus:bg-white focus:shadow-[0_2px_10px_rgb(0,0,0,0.04)] cursor-pointer"
                style={{
                  boxShadow: `inset 0 1px 2px rgba(0,0,0,0.02)`
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colorCode;
                  e.target.style.boxShadow = `0 0 0 2px ${colorCode}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = `inset 0 1px 2px rgba(0,0,0,0.02)`;
                }}
              >
                <option value="" disabled className="text-slate-400">Select...</option>
                {detectedOptions.map(opt => (
                  <option key={opt} value={opt} className="text-slate-900 font-medium">{opt}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : (
            <input
              type={detectedType === 'number' ? 'number' : detectedType === 'date' ? 'date' : 'text'}
              value={displayValue}
              onChange={(e) => onChange(fieldKey, detectedType === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={config?.placeholder ?? (detectedType === 'date' ? 'YYYY-MM-DD' : `Enter ${label.toLowerCase()}`)}
              className="w-full text-[11px] font-semibold text-slate-800 bg-white/90 border border-slate-200/80 rounded-md px-2 py-1 outline-none transition-all duration-300 focus:bg-white"
              style={{
                boxShadow: `inset 0 1px 2px rgba(0,0,0,0.02)`
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colorCode;
                e.target.style.boxShadow = `0 0 0 2px ${colorCode}15`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = `inset 0 1px 2px rgba(0,0,0,0.02)`;
              }}
            />
          )
        ) : (
          <div className="w-full min-h-[26px] flex items-center px-2 py-1 rounded-md bg-white/80 shadow-[0_1px_0_rgba(148,163,184,0.12),inset_0_-1px_0_rgba(148,163,184,0.08)] border border-slate-100/50">
            {displayValue !== '' && displayValue !== null ? (
              <span className="text-[11px] font-medium text-slate-800 tracking-tight leading-snug truncate">
                {displayValue}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400/70 italic">
                Not recorded
              </span>
            )}
          </div>
        )}
      </div>
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
    // For boolean fields, update immediately without debounce
    const config = FIELD_CONFIG[key];
    if (config?.type === 'checkbox') {
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
      return;
    }
    
    // For other fields, use debounced update
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

  // Format symptoms_10s for display (converts comma-separated Kobo multi-select to readable format)
  const formatSymptoms = (raw: string | null | undefined): string => {
    if (!raw || raw === 'N/A') return 'No symptoms recorded';
    if (raw === 'No Symptoms') return 'No Symptoms';
    return raw
      .split(',')
      .map(s => s.trim().replace(/_/g, ' '))
      .filter(Boolean)
      .join(' • ');
  };

  if (!patient) return null;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-50/50">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto z-10 px-4 py-3 hide-scrollbar relative">
        
        {/* Removed Title Header to maximize space and reduce redundancy with main tabs */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-1">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col gap-3">
            
            {/* Identity Profile */}
            <div className="relative">
              <FormSectionTitle icon={User} title="Identity Profile" colorCode="#8b5cf6" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <FormFieldRow label="Inmate Name" value={getValue('inmate_name', patient?.inmate_name)} icon={User} editable fieldKey="inmate_name" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Inmate Type" value={getValue('inmate_type', patient?.inmate_type)} icon={User} editable fieldKey="inmate_type" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                    <FormFieldRow label="Sex" value={getValue('sex', patient?.sex)} icon={User} editable fieldKey="sex" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  </div>
                  
                  {/* Conditional "Other" field for Inmate Type */}
                  {getValue('inmate_type', patient?.inmate_type) === 'Other' && isEditingDemographics && (
                    <FormFieldRow label="Specify Other Inmate Type" value={getValue('inmate_type_other', patient?.inmate_type_other)} icon={User} editable fieldKey="inmate_type_other" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  )}

                  <FormFieldRow label="Father/Husband" value={getValue('father_husband_name', patient?.father_husband_name)} icon={User} editable fieldKey="father_husband_name" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Date of Birth" value={getValue('date_of_birth', patient?.date_of_birth)} icon={Calendar} editable fieldKey="date_of_birth" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                    <FormFieldRow label="Age" value={getValue('age', patient?.age)} icon={Hash} editable fieldKey="age" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  </div>
                  
                  <FormFieldRow label="Contact" value={getValue('contact_number', patient?.contact_number)} icon={Phone} editable fieldKey="contact_number" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  
                  <FormFieldRow label="Address" value={getValue('address', patient?.address)} icon={MapPin} editable fieldKey="address" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                </div>
              </div>
            </div>

            {/* Referral & Diagnosis */}
            <div className="relative">
              <FormSectionTitle icon={FileText} title="Referral & Diagnosis" colorCode="#ef4444" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Referral Date" value={getValue('referral_date', patient?.referral_date)} icon={Calendar} editable fieldKey="referral_date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ef4444" />
                    <FormFieldRow label="Referred To" value={getValue('referred_to_facility', patient?.referred_to_facility)} icon={Building2} editable fieldKey="referred_to_facility" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ef4444" />
                  </div>
                  
                  {/* Conditional "Other" field for Referred Facility */}
                  {getValue('referred_to_facility', patient?.referred_to_facility) === 'Other' && isEditingDemographics && (
                    <FormFieldRow label="Specify Other Facility" value={getValue('referred_to_facility_other', patient?.referred_to_facility_other)} icon={Building2} editable fieldKey="referred_to_facility_other" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ef4444" />
                  )}
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="TB Diagnosed" value={getValue('tb_diagnosed', patient?.tb_diagnosed)} icon={Activity} editable fieldKey="tb_diagnosed_select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ef4444" />
                    <FormFieldRow label="Diagnosis Date" value={getValue('diagnosis_date', patient?.diagnosis_date)} icon={Calendar} editable fieldKey="diagnosis_date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ef4444" />
                  </div>
                </div>
              </div>
            </div>

            {/* HIV / ART */}
            <div className="relative">
              <FormSectionTitle icon={Shield} title="HIV / ART" colorCode="#ec4899" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="HIV Status" value={getValue('hiv_status', patient?.hiv_status)} icon={Shield} editable fieldKey="hiv_status" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ec4899" />
                    <FormFieldRow label="ART Started" value={getValue('art_started', patient?.art_started)} icon={Calendar} editable fieldKey="art_started" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ec4899" />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="ART Center" value={getValue('art_center', patient?.art_center)} icon={Building2} editable fieldKey="art_center" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ec4899" />
                    <FormFieldRow label="CPT Given" value={getValue('cpt_given', patient?.cpt_given)} icon={Activity} editable fieldKey="cpt_given" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#ec4899" />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col gap-3">
            
            {/* TB Screening (merged with logistics) */}
            <div className="relative">
              <FormSectionTitle icon={Activity} title="TB Screening" colorCode="#f59e0b" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  {/* Screening Logistics Fields */}
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Staff Name" value={getValue('staff_name', patient?.staff_name)} icon={User} editable fieldKey="staff_name" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="Submitted On" value={getValue('submitted_on', patient?.submitted_on)} icon={Calendar} editable fieldKey="submitted_on" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Screening State" value={getValue('screening_state', patient?.screening_state)} icon={MapPin} editable fieldKey="screening_state" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="Screening District" value={getValue('screening_district', patient?.screening_district)} icon={MapPin} editable fieldKey="screening_district" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                  
                  {/* Conditional "Other" fields */}
                  {getValue('screening_state', patient?.screening_state) === 'Other' && isEditingDemographics && (
                    <FormFieldRow label="Specify Other State" value={getValue('screening_state_other', patient?.screening_state_other)} icon={MapPin} editable fieldKey="screening_state_other" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  )}
                  {getValue('screening_district', patient?.screening_district) === 'Other' && isEditingDemographics && (
                    <FormFieldRow label="Specify Other District" value={getValue('screening_district_other', patient?.screening_district_other)} icon={MapPin} editable fieldKey="screening_district_other" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  )}

                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Facility Name" value={getValue('facility_name', patient?.facility_name)} icon={Building2} editable fieldKey="facility_name" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="Facility Type" value={getValue('facility_type', patient?.facility_type)} icon={Building2} editable fieldKey="facility_type" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Screening Date" value={getValue('screening_date', patient?.screening_date)} icon={Calendar} editable fieldKey="screening_date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="Unique ID" value={getValue('unique_id', patient?.unique_id)} icon={Hash} editable={false} fieldKey="unique_id" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                  
                  {/* Visual Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent my-1" />
                  
                  {/* TB Screening Fields */}
                  <FormFieldRow label="X-Ray Result" value={getValue('xray_result', patient?.xray_result)} icon={Activity} editable fieldKey="xray_result" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Symptoms (10S)" value={formatSymptoms(patient?.symptoms_10s)} icon={Activity} editable={false} fieldKey="symptoms_10s" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="TB History" value={getValue('tb_past_history', patient?.tb_past_history)} icon={Activity} editable fieldKey="tb_past_history" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="AI Confidence" value={getValue('ai_confidence_score', patient?.ai_confidence_score)} icon={Activity} editable={false} fieldKey="ai_confidence_score" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="Sputum Collected" value={getValue('sputum_collected', patient?.sputum_collected)} icon={Activity} editable fieldKey="sputum_collected_select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                </div>
              </div>
            </div>

            {/* Nikshay / Registration */}
            <div className="relative">
              <FormSectionTitle icon={ClipboardList} title="Nikshay / Registration" colorCode="#06b6d4" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Nikshay ID" value={getValue('nikshay_id', patient?.nikshay_id)} icon={Hash} editable fieldKey="nikshay_id" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#06b6d4" />
                    <FormFieldRow label="ABHA ID" value={getValue('abha_id', patient?.abha_id)} icon={Hash} editable fieldKey="abha_id" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#06b6d4" />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="ATT Start Date" value={getValue('att_start_date', patient?.att_start_date)} icon={Calendar} editable fieldKey="att_start_date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#06b6d4" />
                    <FormFieldRow label="Treatment Regimen" value={getValue('treatment_regimen', patient?.treatment_regimen)} icon={Activity} editable fieldKey="treatment_regimen" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#06b6d4" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Metadata */}
            <div className="relative">
              <FormSectionTitle icon={Settings2} title="System Metadata" colorCode="#64748b" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Kobo UUID" value={patient?.kobo_uuid ?? 'Not recorded'} icon={Hash} editable={false} fieldKey="kobo_uuid" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#64748b" />
                    <FormFieldRow label="Serial Number" value={patient?.unique_id ?? patient?.serial_number ?? 'Not recorded'} icon={Hash} editable={false} fieldKey="unique_id" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#64748b" />
                  </div>
                </div>
              </div>
            </div>

          </div>
          
        </div>
        {/* Bottom padding spacer to ensure scrolling clears the sticky action bar perfectly */}
        <div className="h-4 w-full" />
      </div>

      {/* Action Bar */}
      <div 
        className="flex items-center gap-3 px-4 py-3 border-t border-slate-200/60 bg-white/95 backdrop-blur-xl shrink-0 z-30 shadow-[0_-4px_24px_rgb(0,0,0,0.02)]"
      >
        <button 
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl transition-all duration-300 font-bold text-[10px] uppercase tracking-[0.1em]"
          style={{
            border: `1.5px solid ${isEditingDemographics ? '#10b98140' : '#e2e8f0'}`,
            backgroundColor: isEditingDemographics ? '#10b98110' : '#f8fafc',
            color: isEditingDemographics ? '#10b981' : '#64748b'
          }}
          onClick={() => setIsEditingDemographics(!isEditingDemographics)}
        >
          {isEditingDemographics ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Editing</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock to Edit</span>
            </>
          )}
        </button>

        <button 
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-red-200 text-red-500 font-bold text-[10px] uppercase tracking-[0.1em] hover:bg-red-50 hover:border-red-300 transition-all duration-300 shadow-sm"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('openCloseLoopModal'));
          }}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Close Loop</span>
        </button>

        <button 
          className="flex-[2] relative flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-[10px] uppercase tracking-[0.1em] text-white overflow-hidden group transition-all duration-300 shadow-[0_4px_14px_rgb(15,23,42,0.15)] hover:shadow-[0_8px_20px_rgb(15,23,42,0.25)] hover:-translate-y-px active:translate-y-0"
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
          {/* Subtle button shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
          
          <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />
          <span>{isEditingDemographics ? 'Save Changes' : 'Submit Update'}</span>
        </button>
      </div>

    </div>
  );
}
