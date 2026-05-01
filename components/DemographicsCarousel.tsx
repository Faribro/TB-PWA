'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, FileText, Settings2, Shield, ClipboardList, Lock, Unlock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}

const FormSectionTitle = ({ icon: Icon, title, colorCode }: { icon: any; title: string; colorCode: string }) => (
  <div className="flex items-center gap-3 mb-4 mt-2">
    <div 
      className="flex items-center justify-center w-7 h-7 rounded-[10px] shadow-sm relative overflow-hidden"
      style={{ backgroundColor: `${colorCode}15`, border: `1px solid ${colorCode}30` }}
    >
      <div className="absolute inset-0 opacity-50" style={{ background: `linear-gradient(135deg, transparent, ${colorCode}20)` }} />
      <Icon className="w-3.5 h-3.5 relative z-10" style={{ color: colorCode }} />
    </div>
    <div className="flex-1 flex items-center gap-3">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{title}</h3>
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
    <div className="group relative flex flex-col gap-1.5 p-3 rounded-2xl transition-all duration-300 hover:bg-white/60 border border-transparent hover:border-white/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Label Row */}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 transition-colors duration-300" style={{ color: showInput ? colorCode : '#94a3b8' }} />}
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500/90">{label}</span>
      </div>

      {/* Value / Input Row */}
      <div className="relative">
        {showInput ? (
          fieldType === 'select' && options ? (
            <div className="relative">
              <select
                value={value || ''}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                className="w-full appearance-none text-[13px] font-bold text-slate-900 bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2.5 outline-none transition-all duration-300 focus:bg-white focus:shadow-[0_4px_20px_rgb(0,0,0,0.06)] cursor-pointer"
                style={{
                  boxShadow: `inset 0 2px 4px rgba(0,0,0,0.02)`
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colorCode;
                  e.target.style.boxShadow = `0 0 0 3px ${colorCode}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.02)`;
                }}
              >
                <option value="" disabled className="text-slate-400">Select...</option>
                {options.map(opt => (
                  <option key={opt} value={opt} className="text-slate-900 font-medium">{opt}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : (
            <input
              type={fieldType}
              value={value || ''}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              className="w-full text-[13px] font-bold text-slate-900 bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2.5 outline-none transition-all duration-300 focus:bg-white"
              style={{
                boxShadow: `inset 0 2px 4px rgba(0,0,0,0.02)`
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colorCode;
                e.target.style.boxShadow = `0 0 0 3px ${colorCode}15`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.02)`;
              }}
              placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : `Enter ${label.toLowerCase()}`}
            />
          )
        ) : (
          <div className="w-full min-h-[42px] flex items-center px-3 py-2 rounded-xl bg-slate-100/50 border border-slate-200/40">
            {displayValue ? (
              <span className="text-[13px] font-bold text-slate-800 tracking-tight leading-snug">
                {displayValue}
              </span>
            ) : (
              <span className="text-[13px] font-medium text-slate-400 italic">
                Not specified
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
    return localValues[key] ?? editedDemographics[key] ?? fallback;
  }, [localValues, editedDemographics]);

  // Section configs for the 2-column layout
  const col1 = [
    {
      id: 'identity',
      title: 'Identity Profile',
      icon: User,
      color: '#8b5cf6', // Violet
      fields: [
        { label: 'Inmate Name', key: 'inmatename', fallback: patient?.inmate_name, icon: User, readonly: false },
        { label: 'Inmate Type', key: 'inmatetype', fallback: patient?.inmate_type, icon: User, readonly: false },
        { label: 'Father/Husband', key: 'fatherhusbandname', fallback: patient?.father_husband_name, icon: User, readonly: false },
        { label: 'Date of Birth', key: 'dateofbirth', fallback: patient?.date_of_birth, type: 'date' as const, icon: Calendar, readonly: false },
        { label: 'Age', key: 'age', fallback: patient?.age, icon: Hash, readonly: false },
        { label: 'Sex', key: 'sex', fallback: patient?.sex, type: 'select' as const, options: ['Male', 'Female', 'Transgender'], icon: User, readonly: false },
        { label: 'Contact', key: 'contactnumber', fallback: patient?.contact_number, icon: Phone, readonly: false }
      ]
    },
    {
      id: 'tb-screening',
      title: 'TB Screening',
      icon: Activity,
      color: '#f59e0b', // Amber
      fields: [
        { label: 'X-Ray Result', key: 'xrayresult', fallback: patient?.xray_result, type: 'select' as const, options: ['Normal', 'Suspected TB Case', 'Other Abnormality'], icon: Activity, readonly: false },
        { label: 'Symptoms (10S)', key: 'symptoms10s', fallback: patient?.symptoms_10s, type: 'select' as const, options: ['Yes', 'No'], icon: Activity, readonly: false },
        { label: 'TB Past History', key: 'tbpasthistory', fallback: patient?.tb_past_history, type: 'select' as const, options: ['Yes', 'No'], icon: Activity, readonly: false }
      ]
    },
    {
      id: 'location',
      title: 'Location',
      icon: MapPin,
      color: '#10b981', // Emerald
      fields: [
        { label: 'Address', key: 'address', fallback: patient?.address, icon: MapPin, readonly: false }
      ]
    }
  ];

  const col2 = [
    {
      id: 'screening',
      title: 'Screening Logistics',
      icon: Calendar,
      color: '#3b82f6', // Blue
      fields: [
        { label: 'Staff Name', key: 'staffname', fallback: patient?.staff_name, icon: User, readonly: false },
        { label: 'Submitted On', key: 'submittedon', fallback: patient?.submitted_on, type: 'date' as const, icon: Calendar, readonly: false },
        { label: 'Screening State', key: 'screeningstate', fallback: patient?.screening_state, icon: MapPin, readonly: false },
        { label: 'Screening District', key: 'screeningdistrict', fallback: patient?.screening_district, icon: MapPin, readonly: false },
        { label: 'Facility Name', key: 'facilitycode', fallback: patient?.facility_name, icon: Building2, readonly: false },
        { label: 'Facility Type', key: 'facilitytype', fallback: patient?.facility_type, icon: Building2, readonly: false },
        { label: 'Screening Date', key: 'screeningdate', fallback: patient?.screening_date, type: 'date' as const, icon: Calendar, readonly: false },
        { label: 'Unique ID', key: 'uniqueid', fallback: patient?.unique_id, icon: Hash, readonly: false }
      ]
    },
    {
      id: 'admin',
      title: 'System Metadata',
      icon: Settings2,
      color: '#64748b', // Slate
      fields: [
        { label: 'Kobo UUID', key: 'kobo_uuid', fallback: patient?.kobo_uuid, icon: Hash, readonly: true },
        { label: 'Serial Number', key: 'serial_number', fallback: patient?.serial_number, icon: Hash, readonly: true }
      ]
    }
  ];

  if (!patient) return null;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-50/50">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto z-10 px-6 py-6 hide-scrollbar relative">
        
        {/* Title Header area if needed */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Clinical Demographics</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">Unified patient record view</p>
          </div>
          {/* Animated Status Pill */}
          <motion.div 
            animate={{ backgroundColor: isEditingDemographics ? '#ecfdf5' : '#f8fafc', borderColor: isEditingDemographics ? '#a7f3d0' : '#e2e8f0' }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isEditingDemographics ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isEditingDemographics ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isEditingDemographics ? 'Editing' : 'Read-Only'}
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col gap-8">
            {col1.map((section) => (
              <div key={section.id} className="relative">
                <FormSectionTitle icon={section.icon} title={section.title} colorCode={section.color} />
                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-2 border border-white/80 shadow-[0_4px_24px_rgb(0,0,0,0.02)] relative">
                  <div className="grid grid-cols-1 gap-1">
                    {section.fields.map((f: any) => (
                      <FormFieldRow 
                        key={f.key}
                        label={f.label} 
                        value={getValue(f.key, f.fallback)}
                        icon={f.icon}
                        editable={!f.readonly}
                        fieldKey={f.key}
                        fieldType={f.type || 'text'}
                        options={f.options}
                        isEditing={isEditingDemographics}
                        onChange={handleFieldChange}
                        colorCode={section.color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col gap-8">
            {col2.map((section) => (
              <div key={section.id} className="relative">
                <FormSectionTitle icon={section.icon} title={section.title} colorCode={section.color} />
                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-2 border border-white/80 shadow-[0_4px_24px_rgb(0,0,0,0.02)] relative">
                  <div className="grid grid-cols-1 gap-1">
                    {section.fields.map((f: any) => (
                      <FormFieldRow 
                        key={f.key}
                        label={f.label} 
                        value={getValue(f.key, f.fallback)}
                        icon={f.icon}
                        editable={!f.readonly}
                        fieldKey={f.key}
                        fieldType={f.type || 'text'}
                        options={f.options}
                        isEditing={isEditingDemographics}
                        onChange={handleFieldChange}
                        colorCode={section.color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
        {/* Bottom padding spacer to ensure scrolling clears the sticky action bar perfectly */}
        <div className="h-6 w-full" />
      </div>

      {/* Action Bar */}
      <div 
        className="flex items-center gap-3 px-6 py-4 border-t border-slate-200/60 bg-white/95 backdrop-blur-xl shrink-0 z-30 shadow-[0_-4px_24px_rgb(0,0,0,0.02)]"
      >
        <button 
          className="flex-1 flex items-center justify-center gap-2 h-[46px] rounded-[14px] transition-all duration-300 font-bold text-[11px] uppercase tracking-[0.1em]"
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
          className="flex-1 flex items-center justify-center gap-2 h-[46px] rounded-[14px] border-1.5 border-red-200 text-red-500 font-bold text-[11px] uppercase tracking-[0.1em] hover:bg-red-50 hover:border-red-300 transition-all duration-300 shadow-sm"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('openCloseLoopModal'));
          }}
        >
          <XCircle className="w-4 h-4" />
          <span>Close Loop</span>
        </button>

        <button 
          className="flex-[2] relative flex items-center justify-center gap-2 h-[46px] rounded-[14px] font-bold text-[11px] uppercase tracking-[0.1em] text-white overflow-hidden group transition-all duration-300 shadow-[0_8px_20px_rgb(15,23,42,0.15)] hover:shadow-[0_12px_28px_rgb(15,23,42,0.25)] hover:-translate-y-0.5 active:translate-y-0"
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
          
          <CheckCircle2 className="w-4 h-4 text-white/80" />
          <span>{isEditingDemographics ? 'Save Changes' : 'Submit Update'}</span>
        </button>
      </div>

    </div>
  );
}
