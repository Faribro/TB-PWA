'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, FileText, Settings2, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';

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
  fieldType = 'text',
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
  fieldType?: 'text' | 'date' | 'select';
  options?: string[];
  isEditing?: boolean;
  onChange?: (key: string, value: string) => void;
  colorCode?: string;
}) => {
  const displayValue = value || '';
  const showInput = editable && isEditing && fieldKey && onChange;

  return (
    <div className="group relative flex flex-col gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300 hover:bg-white/60 border border-transparent hover:border-slate-200/50 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
      {/* Label Row */}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 transition-colors duration-300" style={{ color: showInput ? colorCode : '#94a3b8' }} />}
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500/80">{label}</span>
      </div>

      {/* Value / Input Row */}
      <div className="relative mt-0.5">
        {showInput ? (
          fieldType === 'select' && options ? (
            <div className="relative">
              <select
                value={value || ''}
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
                {options.map(opt => (
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
              type={fieldType}
              value={value || ''}
              onChange={(e) => onChange(fieldKey, e.target.value)}
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
              placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : `Enter ${label.toLowerCase()}`}
            />
          )
        ) : (
          <div className="w-full min-h-[26px] flex items-center px-2 py-1 rounded-md bg-white/80 shadow-[0_1px_0_rgba(148,163,184,0.12),inset_0_-1px_0_rgba(148,163,184,0.08)] border border-slate-100/50">
            {displayValue ? (
              <span className="text-[11px] font-medium text-slate-800 tracking-tight leading-snug truncate">
                {displayValue}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400/70 italic">
                —
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

  const handleFieldChange = useCallback((key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    debounceTimers.current[key] = setTimeout(() => {
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
    }, 300);
  }, [setEditedDemographics]);

  const getValue = useCallback((key: string, fallback: any) => {
    const result = localValues[key] ?? editedDemographics[key] ?? fallback;
    console.log(`[Demographics] getValue('${key}'):`, { localValues: localValues[key], edited: editedDemographics[key], fallback, result });
    return result;
  }, [localValues, editedDemographics]);

  // Debug patient data on mount
  useEffect(() => {
    if (patient) {
      console.log('[Demographics] Patient data:', {
        address: patient.address,
        symptoms_10s: patient.symptoms_10s,
        kobo_uuid: patient.kobo_uuid,
        serial_number: patient.serial_number
      });
    }
  }, [patient]);

  if (!patient) return null;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-50/50">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto z-10 px-4 py-3 hide-scrollbar relative">
        
        {/* Title Header area */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h2 className="text-[13px] font-black text-slate-800 tracking-tight">Clinical Demographics</h2>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Unified patient record view</p>
          </div>
          {/* Animated Status Pill */}
          <motion.div 
            animate={{ backgroundColor: isEditingDemographics ? '#ecfdf5' : '#f8fafc', borderColor: isEditingDemographics ? '#a7f3d0' : '#e2e8f0' }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <div className={`w-1 h-1 rounded-full ${isEditingDemographics ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isEditingDemographics ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isEditingDemographics ? 'Editing' : 'Read-Only'}
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col gap-3">
            
            {/* Identity Profile */}
            <div className="relative">
              <FormSectionTitle icon={User} title="Identity Profile" colorCode="#8b5cf6" />
              <div className="bg-white/70 backdrop-blur-md rounded-[16px] p-1.5 border border-white shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative">
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
              <div className="bg-white/70 backdrop-blur-md rounded-[16px] p-1.5 border border-white shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative">
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
              <div className="bg-white/70 backdrop-blur-md rounded-[16px] p-1.5 border border-white shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative">
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
              <div className="bg-white/70 backdrop-blur-md rounded-[16px] p-1.5 border border-white shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative">
                <div className="flex flex-col gap-0.5">
                  <FormFieldRow label="X-Ray Result" value={getValue('xrayresult', patient?.xray_result)} options={['Normal', 'Suspected TB Case', 'Other Abnormality']} icon={Activity} editable fieldKey="xrayresult" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  <div className="grid grid-cols-2 gap-1">
                    <FormFieldRow label="Symptoms (10S)" value={getValue('symptoms10s', patient?.symptoms_10s)} options={['Yes', 'No']} icon={Activity} editable fieldKey="symptoms10s" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                    <FormFieldRow label="TB History" value={getValue('tbpasthistory', patient?.tb_past_history)} options={['Yes', 'No']} icon={Activity} editable fieldKey="tbpasthistory" fieldType="select" isEditing={isEditingDemographics} onChange={handleFieldChange} colorCode="#f59e0b" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Metadata */}
            <div className="relative">
              <FormSectionTitle icon={Settings2} title="System Metadata" colorCode="#64748b" />
              <div className="bg-white/70 backdrop-blur-md rounded-[16px] p-1.5 border border-white shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative">
                <div className="grid grid-cols-2 gap-1">
                  <FormFieldRow label="Kobo UUID" value={getValue('kobo_uuid', patient?.kobo_uuid)} icon={Hash} editable={false} colorCode="#64748b" />
                  <FormFieldRow label="Serial Number" value={getValue('serial_number', patient?.serial_number)} icon={Hash} editable={false} colorCode="#64748b" />
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
