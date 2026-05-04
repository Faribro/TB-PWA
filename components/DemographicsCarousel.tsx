'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, Settings2, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';

// Field configuration for smart rendering
const FIELD_CONFIG: Record<string, {
  type: 'text' | 'checkbox' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
}> = {
  // Checkbox (Yes/No) fields
  sputum_collected: { type: 'checkbox' },
  tb_diagnosed: { type: 'checkbox' },
  art_started: { type: 'checkbox' },
  cpt_given: { type: 'checkbox' },

  // Select fields
  sex: {
    type: 'select',
    options: ['Male', 'Female', 'Transgender']
  },
  hiv_status: {
    type: 'select',
    options: ['Positive', 'Negative', 'Unknown', 'Not tested']
  },
  xrayresult: {
    type: 'select',
    options: ['Normal', 'Suspected TB Case', 'Other Abnormality']
  },
  tbpasthistory: {
    type: 'select',
    options: ['Yes', 'No']
  },
  treatment_regimen: {
    type: 'select',
    options: ['Category I', 'Category II', 'DRTB', 'Preventive Therapy']
  },

  // Date fields
  screeningdate: { type: 'date' },
  submittedon: { type: 'date' },
  dateofbirth: { type: 'date' },
  referral_date: { type: 'date' },
  diagnosis_date: { type: 'date' },
  att_start_date: { type: 'date' },

  // Number fields
  age: { type: 'number', placeholder: 'Age in years' },
  ai_confidence_score: { type: 'number', placeholder: '0-100' },
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
  const showInput = editable && isEditing && fieldKey && onChange;

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
                  <FormFieldRow label="Inmate Name" value={getValue('inmatename', patient?.inmate_name)} icon={User} editable fieldKey="inmatename" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Inmate Type" value={getValue('inmatetype', patient?.inmate_type)} icon={User} editable fieldKey="inmatetype" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                    <FormFieldRow label="Sex" value={getValue('sex', patient?.sex)} options={['Male', 'Female', 'Transgender']} icon={User} editable fieldKey="sex" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  </div>

                  <FormFieldRow label="Father/Husband" value={getValue('fatherhusbandname', patient?.father_husband_name)} icon={User} editable fieldKey="fatherhusbandname" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Date of Birth" value={getValue('dateofbirth', patient?.date_of_birth)} icon={Calendar} editable fieldKey="dateofbirth" fieldType="date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                    <FormFieldRow label="Age" value={getValue('age', patient?.age)} icon={Hash} editable fieldKey="age" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                  </div>
                  
                  <FormFieldRow label="Contact" value={getValue('contactnumber', patient?.contact_number)} icon={Phone} editable fieldKey="contactnumber" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#8b5cf6" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="relative">
              <FormSectionTitle icon={MapPin} title="Location" colorCode="#10b981" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <FormFieldRow label="Address" value={getValue('address', patient?.address)} icon={MapPin} editable fieldKey="address" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#10b981" />
                </div>
              </div>
            </div>

          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col gap-3">
            
            {/* Screening Logistics */}
            <div className="relative">
              <FormSectionTitle icon={Calendar} title="Screening Logistics" colorCode="#3b82f6" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Staff Name" value={getValue('staffname', patient?.staff_name)} icon={User} editable fieldKey="staffname" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                    <FormFieldRow label="Submitted On" value={getValue('submittedon', patient?.submitted_on)} icon={Calendar} editable fieldKey="submittedon" fieldType="date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Screening State" value={getValue('screeningstate', patient?.screening_state)} icon={MapPin} editable fieldKey="screeningstate" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                    <FormFieldRow label="Screening District" value={getValue('screeningdistrict', patient?.screening_district)} icon={MapPin} editable fieldKey="screeningdistrict" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Facility Name" value={getValue('facilitycode', patient?.facility_name)} icon={Building2} editable fieldKey="facilitycode" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                    <FormFieldRow label="Facility Type" value={getValue('facilitytype', patient?.facility_type)} icon={Building2} editable fieldKey="facilitytype" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Screening Date" value={getValue('screeningdate', patient?.screening_date)} icon={Calendar} editable fieldKey="screeningdate" fieldType="date" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                    <FormFieldRow label="Unique ID" value={getValue('uniqueid', patient?.unique_id)} icon={Hash} editable fieldKey="uniqueid" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#3b82f6" />
                  </div>
                </div>
              </div>
            </div>

            {/* TB Screening */}
            <div className="relative">
              <FormSectionTitle icon={Activity} title="TB Screening" colorCode="#f59e0b" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <FormFieldRow label="X-Ray Result" value={getValue('xrayresult', patient?.xray_result)} options={['Normal', 'Suspected TB Case', 'Other Abnormality']} icon={Activity} editable fieldKey="xrayresult" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Symptoms (10S)" value={formatSymptoms(patient?.symptoms_10s)} icon={Activity} editable={false} fieldKey="symptoms10s" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="TB History" value={getValue('tbpasthistory', patient?.tb_past_history)} options={['Yes', 'No']} icon={Activity} editable fieldKey="tbpasthistory" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Metadata */}
            <div className="relative">
              <FormSectionTitle icon={Settings2} title="System Metadata" colorCode="#64748b" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[18px] p-2 border border-white/90 shadow-[0_8px_32px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] relative">
                <div className="flex flex-col gap-0.5">
                  <FormFieldRow label="Kobo UUID" value={getValue('kobo_uuid', patient?.kobo_uuid)} icon={Hash} editable={false} colorCode="#64748b" />
                  <FormFieldRow label="Serial Number" value={getValue('unique_id', patient?.unique_id)} icon={Hash} editable={false} colorCode="#64748b" />
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
