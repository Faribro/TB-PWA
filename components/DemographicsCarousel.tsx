'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, Settings2, Lock, Unlock, FileText, Shield, ClipboardList, Check, Minus } from 'lucide-react';
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

// Canonical Master List for 10S Symptoms (fixed order, defensive parsing)
const SYMPTOMS_MASTER = [
  { id: 'cough', label: 'Cough' },
  { id: 'fever', label: 'Fever' },
  { id: 'weight_loss', label: 'Weight loss' },
  { id: 'night_sweats', label: 'Night sweats' },
  { id: 'blood_in_sputum', label: 'Blood in sputum' },
  { id: 'shortness_of_breath', label: 'Shortness of breath' },
  { id: 'chest_pain', label: 'Chest pain' },
  { id: 'loss_of_appetite', label: 'Loss of appetite' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'swelling_neck', label: 'Swelling in neck' },
];

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}

// â”€â”€ Section header: bold uppercase + full-width rule (LaTeX \section style)
const DocSection = ({ title, accent = 'bg-slate-700', children }: { title: string; accent?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2.5">
      <div className={`w-[3px] h-[18px] rounded-full shrink-0 ${accent}`} />
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">{title}</span>
      <div className="flex-1 h-px bg-slate-800/20" />
    </div>
    {children}
  </div>
);

// â”€â”€ Symptom chip: colored pill (LaTeX certstyle equivalent)
const SymptomChip = ({ label, selected }: { label: string; selected: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-wide border rounded-[3px] transition-all duration-150 select-none ${
    selected ? 'bg-red-50 border-red-400 text-red-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'
  }`}>
    {selected ? <Check className="w-2.5 h-2.5 shrink-0" strokeWidth={3}/> : <Minus className="w-2.5 h-2.5 shrink-0" strokeWidth={2}/>}
    {label}
  </span>
);

// â”€â”€ Data field: label over value, view or edit
const Field = ({ label, value, fieldKey, editable = false, isEditing, onChange, span = 1 }: {
  label: string; value: any; fieldKey: string;
  editable?: boolean; isEditing?: boolean;
  onChange?: (k: string, v: any) => void; span?: number;
}) => {
  const cfg = FIELD_CONFIG[fieldKey];
  const ftype = cfg?.type ?? 'text';
  const fopts = cfg?.options;
  const showInput = editable && !cfg?.readOnly && isEditing && onChange;
  const toBool = (v: any) => v === true || v === 1 || v === 'true' || v === 'yes' || v === 'Yes';
  const missing = value === null || value === undefined || value === '';
  const inputCls = 'w-full text-[12px] font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 transition-all shadow-sm';
  return (
    <div className="flex flex-col gap-1 min-w-0" style={span > 1 ? { gridColumn: `span ${span}` } : {}}>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {showInput ? (
        ftype === 'checkbox' ? (
          <button type="button" onClick={() => onChange!(fieldKey, !toBool(value))}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none ${
              toBool(value) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-300'
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${toBool(value) ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        ) : fopts ? (
          <div className="relative">
            <select value={value ?? ''} onChange={e => onChange!(fieldKey, e.target.value)} className={inputCls + ' appearance-none pr-7 cursor-pointer'}>
              <option value="" disabled>Selectâ€¦</option>
              {fopts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        ) : (
          <input type={ftype === 'number' ? 'number' : ftype === 'date' ? 'date' : 'text'}
            value={value ?? ''}
            onChange={e => onChange!(fieldKey, ftype === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={cfg?.placeholder ?? `Enter ${label.toLowerCase()}`}
            className={inputCls} />
        )
      ) : (
        <div className="text-[14px] font-semibold text-slate-900 leading-snug break-words">
          {missing ? (
            <span className="text-slate-400 font-medium italic text-[11px]">Not recorded</span>
          ) : ftype === 'checkbox' ? (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
              toBool(value) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${toBool(value) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {toBool(value) ? 'Yes' : 'No'}
            </span>
          ) : value}
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

  // Map 10S string to canonical symptom list with defensive parsing
  const parsedSymptoms = useMemo(() => {
    const result: Record<string, boolean> = {};
    SYMPTOMS_MASTER.forEach(sym => result[sym.id] = false);

    const raw = patient?.symptoms_10s;
    if (!raw || typeof raw !== 'string' || raw.toLowerCase() === 'n/a' || raw.includes('No_Symptomps') || raw.toLowerCase().includes('no symptoms')) {
      return result;
    }
    
    // Normalize: lowercase, trim, replace underscores/spaces, handle comma-separated
    const normalized = raw.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    const symptomsArray = normalized.split(/[,;\|]/).map(s => s.trim()).filter(Boolean);
    
    SYMPTOMS_MASTER.forEach(sym => {
      const labelLower = sym.label.toLowerCase();
      const labelSpaced = labelLower.replace(/\s+/g, ' ');
      
      // Check if symptom is present in any format
      const isPresent = symptomsArray.some(s => {
        const sNormalized = s.replace(/\s+/g, ' ');
        return sNormalized === labelSpaced || sNormalized.includes(labelSpaced) || labelSpaced.includes(sNormalized);
      });
      
      if (isPresent) {
        result[sym.id] = true;
      }
    });

    return result;
  }, [patient?.symptoms_10s]);

  const toBool = (v: any) => v === true || v === 'yes' || v === 'Yes';

  if (!patient) return null;

  const gv = getValue;
  const E = isEditingDemographics;
  const H = handleFieldChange;
  const name    = gv('inmate_name', patient?.inmate_name) || 'Unknown Patient';
  const uid     = gv('unique_id', patient?.unique_id || patient?.serial_number);
  const age     = gv('age', patient?.age);
  const sex     = gv('sex', patient?.sex);
  const facility= gv('facility_name', patient?.facility_name);
  const ftype   = gv('facility_type', patient?.facility_type);
  const state   = gv('screening_state', patient?.screening_state);
  const xray    = gv('xray_result', patient?.xray_result);
  const hiv     = gv('hiv_status', patient?.hiv_status);
  const tbDx    = gv('tb_diagnosed_select', gv('tb_diagnosed', patient?.tb_diagnosed));
  const sDate   = gv('screening_date', patient?.screening_date);
  const isTBDx  = toBool(tbDx) || tbDx === 'Yes';
  const isHIV   = hiv === 'Positive';
  const isSusp  = xray === 'Suspected TB Case';
  const symCount= Object.values(parsedSymptoms).filter(Boolean).length;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden" style={{ background: '#edecea' }}>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="flex-1 overflow-y-auto px-3 py-4 pb-28 hide-scrollbar"
      >
        {/* â”€â”€ DOCUMENT â”€â”€ */}
        <div className="bg-white border border-slate-300/80 shadow-[0_3px_20px_rgba(0,0,0,0.09)] overflow-hidden" style={{ borderRadius: 2 }}>

          {/* â•â• HEADER: name panel left + status box right (responsive) â•â• */}
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left dark panel */}
            <div className="flex-1 px-6 py-6 flex flex-col justify-between" style={{ background: '#111827' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Patient Clinical Record</p>
                <h1 className="text-[28px] font-black text-white leading-tight tracking-tight mb-3">{name}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
                  {[ftype, facility, state].filter(Boolean).map((v, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />{v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-[11px] font-semibold text-slate-400">
                {age  && <span className="text-white/70">Age: <strong className="text-white">{age}</strong></span>}
                {sex  && <span className="text-white/70">Sex: <strong className="text-white">{sex}</strong></span>}
                {uid  && <span className="text-white/70">ID: <strong className="text-white font-mono">{uid}</strong></span>}
                {sDate&& <span className="text-white/70">Screened: <strong className="text-white">{sDate}</strong></span>}
              </div>
            </div>

            {/* Right: clinical status box (LaTeX tcolorbox equivalent) */}
            <div className="w-full md:w-52 shrink-0 border-l-0 md:border-l-4 border-t-4 md:border-t-0 border-slate-700 bg-slate-50 px-4 py-4 flex flex-col gap-2.5">
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Clinical Status</p>
              {[
                { label: 'X-Ray',       val: xray,  flag: isSusp, flagColor: 'text-amber-700 bg-amber-50 border-amber-300' },
                { label: 'HIV',         val: hiv,   flag: isHIV,  flagColor: 'text-pink-700 bg-pink-50 border-pink-300'   },
                { label: 'TB Dx',       val: tbDx,  flag: isTBDx, flagColor: 'text-red-700 bg-red-50 border-red-300'      },
                { label: 'Symptoms',    val: `${symCount} / 10`, flag: symCount >= 3, flagColor: 'text-orange-700 bg-orange-50 border-orange-300' },
              ].map(({ label, val, flag, flagColor }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
                  {val ? (
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${flag ? flagColor : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                      {flag && 'âš‘ '}{String(val)}
                    </span>
                  ) : <span className="text-[10px] italic text-slate-400">â€”</span>}
                </div>
              ))}
            </div>
          </div>

          {/* â•â• BODY â•â• */}
          <div className="px-6 py-7 flex flex-col gap-8">

            {/* Â§ Identity & Contact */}
            <DocSection title="Identity & Contact" accent="bg-violet-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                <Field label="Father / Husband"  value={gv('father_husband_name', patient?.father_husband_name)} fieldKey="father_husband_name" editable isEditing={E} onChange={H} />
                <Field label="Date of Birth"      value={gv('date_of_birth', patient?.date_of_birth)}            fieldKey="date_of_birth"      editable isEditing={E} onChange={H} />
                <Field label="Age"                value={gv('age', patient?.age)}                                fieldKey="age"                 editable isEditing={E} onChange={H} />
                <Field label="Sex"                value={gv('sex', patient?.sex)}                                fieldKey="sex"                 editable isEditing={E} onChange={H} />
                <Field label="Inmate Type"        value={gv('inmate_type', patient?.inmate_type)}                fieldKey="inmate_type"         editable isEditing={E} onChange={H} />
                <Field label="Contact"            value={gv('contact_number', patient?.contact_number)}          fieldKey="contact_number"      editable isEditing={E} onChange={H} />
                <Field label="Full Address"       value={getFullAddress()} fieldKey="address" span={2} editable isEditing={E} onChange={H} />
                {gv('inmate_type', patient?.inmate_type) === 'Other' && (
                  <Field label="Specify Type"     value={gv('inmate_type_other', patient?.inmate_type_other)}    fieldKey="inmate_type_other"   editable isEditing={E} onChange={H} />
                )}
              </div>
            </DocSection>

            {/* Â§ Screening Encounter */}
            <DocSection title="Screening Encounter" accent="bg-amber-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                <Field label="Screening Date"     value={gv('screening_date', patient?.screening_date)}          fieldKey="screening_date"      editable isEditing={E} onChange={H} />
                <Field label="Facility Name"      value={gv('facility_name', patient?.facility_name)}            fieldKey="facility_name"       editable isEditing={E} onChange={H} />
                <Field label="Facility Type"      value={gv('facility_type', patient?.facility_type)}            fieldKey="facility_type"       editable isEditing={E} onChange={H} />
                <Field label="Screening State"    value={gv('screening_state', patient?.screening_state)}        fieldKey="screening_state"     editable isEditing={E} onChange={H} />
                <Field label="Screening District" value={gv('screening_district', patient?.screening_district)}  fieldKey="screening_district"  editable isEditing={E} onChange={H} />
                <Field label="Staff Name"         value={gv('staff_name', patient?.staff_name)}                  fieldKey="staff_name"          editable isEditing={E} onChange={H} />
                <Field label="Submitted On"       value={gv('submitted_on', patient?.submitted_on)}              fieldKey="submitted_on"        editable isEditing={E} onChange={H} />
                {gv('screening_state', patient?.screening_state) === 'Other' && (
                  <Field label="Specify State"    value={gv('screening_state_other', patient?.screening_state_other)} fieldKey="screening_state_other" editable isEditing={E} onChange={H} />
                )}
                {gv('screening_district', patient?.screening_district) === 'Other' && (
                  <Field label="Specify District" value={gv('screening_district_other', patient?.screening_district_other)} fieldKey="screening_district_other" editable isEditing={E} onChange={H} />
                )}
              </div>
            </DocSection>

            {/* Â§ 10S Symptom Checklist */}
            <DocSection title="10S Symptom Checklist" accent="bg-red-500">
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS_MASTER.map(s => <SymptomChip key={s.id} label={s.label} selected={parsedSymptoms[s.id]} />)}
              </div>
              {symCount >= 3 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-[3px]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-700">âš‘ High Risk â€” {symCount} symptoms present. Prioritise immediate referral.</span>
                </div>
              )}
            </DocSection>

            {/* Â§ Diagnostics & Treatment */}
            <DocSection title="Diagnostics & Treatment" accent="bg-sky-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                <Field label="X-Ray Result"       value={gv('xray_result', patient?.xray_result)}                fieldKey="xray_result"         editable isEditing={E} onChange={H} />
                <Field label="Sputum Collected"   value={gv('sputum_collected_select', gv('sputum_collected', patient?.sputum_collected))} fieldKey="sputum_collected_select" editable isEditing={E} onChange={H} />
                <Field label="TB Past History"    value={gv('tb_past_history', patient?.tb_past_history)}        fieldKey="tb_past_history"     editable isEditing={E} onChange={H} />
                <Field label="TB Diagnosed"       value={gv('tb_diagnosed_select', gv('tb_diagnosed', patient?.tb_diagnosed))} fieldKey="tb_diagnosed_select" editable isEditing={E} onChange={H} />
                <Field label="Diagnosis Date"     value={gv('diagnosis_date', patient?.diagnosis_date)}          fieldKey="diagnosis_date"      editable isEditing={E} onChange={H} />
                <Field label="ATT Start Date"     value={gv('att_start_date', patient?.att_start_date)}          fieldKey="att_start_date"      editable isEditing={E} onChange={H} />
                <Field label="Referral Date"      value={gv('referral_date', patient?.referral_date)}            fieldKey="referral_date"       editable isEditing={E} onChange={H} />
                <Field label="Referred To"        value={gv('referred_to_facility', patient?.referred_to_facility)} fieldKey="referred_to_facility" editable isEditing={E} onChange={H} />
                <Field label="AI Confidence"      value={gv('ai_confidence_score', patient?.ai_confidence_score)} fieldKey="ai_confidence_score" isEditing={E} onChange={H} />
                {gv('referred_to_facility', patient?.referred_to_facility) === 'Other' && (
                  <Field label="Specify Facility" value={gv('referred_to_facility_other', patient?.referred_to_facility_other)} fieldKey="referred_to_facility_other" editable isEditing={E} onChange={H} />
                )}
              </div>
              <div className="mt-4">
                <Field label="Treatment Regimen" value={gv('treatment_regimen', patient?.treatment_regimen)} fieldKey="treatment_regimen" editable isEditing={E} onChange={H} />
              </div>
            </DocSection>

            {/* Â§ HIV / ART */}
            <DocSection title="HIV / ART Status" accent="bg-pink-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                <Field label="HIV Status"   value={gv('hiv_status', patient?.hiv_status)}   fieldKey="hiv_status"  editable isEditing={E} onChange={H} />
                <Field label="ART Started"  value={gv('art_started', patient?.art_started)}  fieldKey="art_started" editable isEditing={E} onChange={H} />
                <Field label="ART Center"   value={gv('art_center', patient?.art_center)}    fieldKey="art_center"  editable isEditing={E} onChange={H} />
                <Field label="CPT Given"    value={gv('cpt_given', patient?.cpt_given)}      fieldKey="cpt_given"   editable isEditing={E} onChange={H} />
              </div>
            </DocSection>

            {/* Â§ Registration & System */}
            <DocSection title="Registration & System" accent="bg-teal-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                <Field label="Nikshay ID"   value={gv('nikshay_id', patient?.nikshay_id)}   fieldKey="nikshay_id"  editable isEditing={E} onChange={H} />
                <Field label="ABHA ID"      value={gv('abha_id', patient?.abha_id)}          fieldKey="abha_id"     editable isEditing={E} onChange={H} />
                <Field label="Kobo UUID"    value={gv('kobo_uuid', patient?.kobo_uuid)}      fieldKey="kobo_uuid"   isEditing={E} onChange={H} />
              </div>
            </DocSection>

          </div>{/* /body */}
        </div>{/* /document */}
      </motion.div>

      {/* â•â• ACTION BAR â•â• */}
      <div className="absolute bottom-0 left-0 w-full flex items-center gap-2.5 px-5 py-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <button
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded font-bold text-[10px] uppercase tracking-[0.12em] transition-all duration-200 border"
          style={{ borderColor: E ? '#10b98150' : '#e2e8f0', backgroundColor: E ? '#f0fdf4' : '#f8fafc', color: E ? '#059669' : '#64748b' }}
          onClick={() => setIsEditingDemographics(!E)}
        >
          {E ? <><Lock className="w-3.5 h-3.5"/><span>Lock Editing</span></> : <><Unlock className="w-3.5 h-3.5"/><span>Unlock to Edit</span></>}
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded font-bold text-[10px] uppercase tracking-[0.12em] border border-red-200 text-red-500 hover:bg-red-50 transition-all duration-200"
          onClick={() => document.dispatchEvent(new CustomEvent('openCloseLoopModal'))}
        >
          <XCircle className="w-3.5 h-3.5"/><span>Close Loop</span>
        </button>
        <button
          className="flex-[2] relative flex items-center justify-center gap-2 h-10 rounded font-bold text-[10px] uppercase tracking-[0.12em] text-white overflow-hidden group transition-all duration-200 shadow-[0_2px_10px_rgba(15,23,42,0.2)] hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}
          onClick={() => { if (E) { document.dispatchEvent(new CustomEvent('saveDemographicsEvent')); setIsEditingDemographics(false); } else { document.dispatchEvent(new CustomEvent('submitClinicalUpdateEvent')); } }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <CheckCircle2 className="w-3.5 h-3.5 text-white/80"/>
          <span>{E ? 'Save Changes' : 'Submit Update'}</span>
        </button>
      </div>
    </div>
  );
}
