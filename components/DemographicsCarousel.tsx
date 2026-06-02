'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar, User, MapPin, Activity, CheckCircle2, XCircle, Building2, Phone, Hash, Settings2, Lock, Unlock, FileText, Shield, ClipboardList, Check, Minus, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { SearchableDistrictSelect } from './SearchableDistrictSelect';

// Helper to format dates for HTML5 date inputs (yyyy-MM-dd)
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const parts = dateStr.split('-');
      if (date.getFullYear() !== parseInt(parts[0]) || 
          (date.getMonth() + 1) !== parseInt(parts[1]) || 
          date.getDate() !== parseInt(parts[2])) {
        return '';
      }
      return dateStr;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// Field configuration for smart rendering (using exact Supabase snake_case column names)
const FIELD_CONFIG: Record<string, {
  type: 'text' | 'checkbox' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
  readOnly?: boolean;
}> = {
  // Checkbox (Yes/No) fields
  tb_diagnosed: { type: 'checkbox' },
  cpt_given: { type: 'checkbox' },

  // Sputum referral fields (from clinical schema)
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': { type: 'date' },
  'Name of facility where referred to (Give code/name of all facilities)': { type: 'text' },
  'Other Facility Name': { type: 'text' },

  // Select fields
  sex: {
    type: 'select',
    options: ['Male', 'Female', 'Other', 'Prefer not to say']
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
    options: ['Positive', 'Negative', 'Unknown', 'Not tested']
  },
  xray_result: {
    type: 'select',
    options: ['Normal', 'Suspected TB Case', 'Abnormal', 'Not Done', 'Pending', 'Technically Inadequate']
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
    options: ['Yes', 'No', 'Inconclusive', 'Pending']
  },
  art_started: {
    type: 'select',
    options: ['Yes', 'No', 'Not applicable']
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
  referred_facility: { type: 'text' },
  tb_diagnosis_date: { type: 'date' },
  diagnosis_date: { type: 'date' },
  att_start_date: { type: 'date' },

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

// TypeScript return type for parseKoboSymptoms
interface ParsedSymptomsResult {
  symptoms: Record<string, boolean>;
  unrecognized: string[];
  rawValue: string | null;
}

// Alias map for known alternate symptom names (Kobo choice codes + common variants)
const SYMPTOM_ALIASES: Record<string, string> = {
  // Kobo underscore codes
  'weightloss': 'weight loss',
  'weight_loss': 'weight loss',
  'nightsweats': 'night sweats',
  'night_sweats': 'night sweats',
  'bloodinsputum': 'blood in sputum',
  'blood_in_sputum': 'blood in sputum',
  'shortnessofbreath': 'shortness of breath',
  'shortness_of_breath': 'shortness of breath',
  'chestpain': 'chest pain',
  'chest_pain': 'chest pain',
  'lossofappetite': 'loss of appetite',
  'loss_of_appetite': 'loss of appetite',
  'swellingneck': 'swelling in neck',
  'swelling_neck': 'swelling in neck',
  'swelling in neck': 'swelling in neck',
  // Kobo "of any duration" suffix variants
  'cough 2wks': 'cough',
  'cough of any duration': 'cough',
  'cough_2wks': 'cough',
  // Haemoptysis = blood in sputum
  'haemoptysis': 'blood in sputum',
  'hemoptysis': 'blood in sputum',
  'haemoptysis blood in sputum': 'blood in sputum',
  // Breathlessness = shortness of breath
  'breathlessness': 'shortness of breath',
  'dyspnoea': 'shortness of breath',
  // Anorexia = loss of appetite
  'anorexia': 'loss of appetite',
  'loss of appetite anorexia': 'loss of appetite',
  // Lymphadenopathy = swelling in neck
  'lymphadenopathy': 'swelling in neck',
  'swelling': 'swelling in neck',
};

// Export pure function for testing and reusability
export function parseKoboSymptoms(raw: string | null | undefined): ParsedSymptomsResult {
  const result: Record<string, boolean> = {};
  const unrecognized: string[] = [];
  
  // Initialize all symptoms as false
  SYMPTOMS_MASTER.forEach(sym => result[sym.id] = false);
  
  // Handle null/undefined/empty
  if (!raw || typeof raw !== 'string') {
    return { symptoms: result, unrecognized: [], rawValue: null };
  }
  
  const rawTrimmed = raw.trim();
  const rawLower = rawTrimmed.toLowerCase();

  // "Yes" / "No" / "yes" / "no" — boolean presence flag, not a symptom list
  // "no_symptoms" / "none" / "n/a" / "No_Symptomps" — explicit negation
  if (
    rawLower === 'yes' || rawLower === 'no' ||
    rawLower === 'n/a' || rawLower === 'none' ||
    rawLower === 'no_symptoms' || rawLower === 'no symptoms' ||
    rawTrimmed.includes('No_Symptomps')
  ) {
    return { symptoms: result, unrecognized: [], rawValue: rawTrimmed };
  }
  
  // Check for non-ASCII characters (Hindi, etc.) - treat as unknown
  if (/[^\x00-\x7F]/.test(rawTrimmed)) {
    return { symptoms: result, unrecognized: [rawTrimmed], rawValue: rawTrimmed };
  }
  
  // Normalize: lowercase, replace underscores with spaces, strip punctuation, collapse spaces
  const normalized = rawLower
    .replace(/_/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split on comma, semicolon, pipe — NOT plain space (symptom names can be multi-word)
  // Fall back to space-splitting only if no other delimiter found
  const hasDelimiter = /[,;|]/.test(normalized);
  const tokens = hasDelimiter
    ? normalized.split(/[,;|]+/).map(t => t.trim()).filter(Boolean)
    : normalized.split(/\s+/).map(t => t.trim()).filter(Boolean);
  
  // Process each token
  tokens.forEach(token => {
    // Apply alias mapping first (handles underscore variants)
    const aliased = SYMPTOM_ALIASES[token] || token;
    
    // Try exact match against label
    const exactMatch = SYMPTOMS_MASTER.find(sym => sym.label.toLowerCase() === aliased);
    if (exactMatch) {
      result[exactMatch.id] = true;
      return;
    }

    // Try exact match against symptom id (e.g. token = "weight_loss" → id = "weight_loss")
    const idMatch = SYMPTOMS_MASTER.find(sym => sym.id === token.replace(/ /g, '_'));
    if (idMatch) {
      result[idMatch.id] = true;
      return;
    }
    
    // Try partial match: token must contain the first word of a symptom label
    // (handles "Cough_2wks" → contains "cough" → matches Cough)
    let bestMatch: typeof SYMPTOMS_MASTER[0] | null = null;
    let bestScore = 0;
    
    SYMPTOMS_MASTER.forEach(sym => {
      const symWords = sym.label.toLowerCase().split(' ');
      const tokenWords = aliased.split(' ');
      // Score: how many symptom words appear in the token
      const matches = symWords.filter(sw => tokenWords.some(tw => tw.includes(sw) || sw.includes(tw))).length;
      const score = matches / symWords.length;
      if (score >= 0.6 && score > bestScore) {
        bestMatch = sym;
        bestScore = score;
      }
    });
    
    if (bestMatch) {
      result[bestMatch.id] = true;
      return;
    }
    
    // No match found
    unrecognized.push(token);
  });
  
  return { symptoms: result, unrecognized, rawValue: rawTrimmed };
}

// Export pure function for X-Ray value formatting
export function formatXrayValue(raw: string | null | undefined): string {
  if (!raw || raw === '') return 'Not recorded';
  
  const normalized = raw.replace(/_/g, ' ').trim();
  
  const map: Record<string, string> = {
    'Suspected TB Case': 'Suspected TB',
    'Suspected_TB_Case': 'Suspected TB',
    'No TB Suspected': 'Normal',
    'No_TB_Suspected': 'Normal',
    'Other Abnormality': 'Other Abnormality',
    'Other_Abnormality': 'Other Abnormality',
    'Not Done': 'Not Done',
    'Not_Done': 'Not Done',
    'Pending': 'Pending',
    'Normal': 'Normal',
    'Abnormal': 'Abnormal',
    'Technically Inadequate': 'Technically Inadequate',
    'Technically_Inadequate': 'Technically Inadequate',
    'PTB': 'Pulmonary TB',
    'EPTB': 'Extra-Pulmonary TB',
  };
  
  // Try exact match on normalized input
  if (map[normalized]) {
    return map[normalized];
  }
  
  // Try exact match on original raw value
  if (map[raw]) {
    return map[raw];
  }
  
  // Generic normalization: replace underscores, title case
  const titleCased = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return titleCased;
}

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}
const DocSection = ({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3.5 p-4 rounded-xl border border-slate-200/50 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.01)] transition-all duration-300">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100/80">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      <span className="text-[10px] font-black tracking-[0.12em] text-slate-600 uppercase whitespace-nowrap">{title}</span>
    </div>
    {children}
  </div>
);

// ── Symptom row: clinical checklist style for better scanning ──
const SymptomRow = ({ label, selected }: { label: string; selected: boolean }) => (
  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-150 select-none ${
    selected 
      ? 'bg-red-50/60 border-red-200/80 text-red-950 shadow-[0_1px_2px_rgba(239,68,68,0.02)] font-semibold' 
      : 'bg-slate-50/30 border-slate-100/50 text-slate-400 font-normal'
  }`}>
    <div className={`flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 ${
      selected ? 'bg-red-500 text-white shadow-sm' : 'bg-transparent border border-slate-300'
    }`}>
      {selected ? <Check className="w-2 h-2" /> : null}
    </div>
    <span className="text-[10px] leading-tight">{label}</span>
  </div>
);

// ── Data field: label over value, view or edit with visual parity and no layout shift ──
const Field = ({ label, value, fieldKey, editable = false, isEditing, onChange, className, hint, customComponent }: {
  label: string; value: any; fieldKey: string;
  editable?: boolean; isEditing?: boolean;
  onChange?: (k: string, v: any) => void; className?: string;
  hint?: string; customComponent?: React.ReactNode;
}) => {
  const cfg = FIELD_CONFIG[fieldKey];
  const ftype = cfg?.type ?? 'text';
  const fopts = cfg?.options;
  const showInput = editable && !cfg?.readOnly && isEditing && onChange;
  const toBool = (v: any) => v === true || v === 1 || v === 'true' || v === 'yes' || v === 'Yes';
  const missing = value === null || value === undefined || value === '';
  
  // Premium input class with soft colors
  const inputCls = 'w-full text-[11.5px] font-semibold text-slate-800 bg-white border border-slate-250 rounded-md px-2 py-0.5 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] h-6.5';
  
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border border-slate-200/50 bg-slate-50/30 px-2.5 py-1.5 transition-all duration-150 min-h-[50px] justify-center hover:bg-slate-50/60 hover:border-slate-350/50 ${className || 'col-span-1'}`}>
      <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400/90 leading-none mb-0.5">{label}</span>
      <div className="min-h-[24px] flex items-center w-full">
        {showInput ? (
          customComponent ? (
            <div className="w-full">{customComponent}</div>
          ) : ftype === 'checkbox' ? (
            <button 
              type="button" 
              onClick={() => onChange!(fieldKey, !toBool(value))}
              aria-label={label}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400 ${
                toBool(value) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-300'
              }`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ${toBool(value) ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </button>
          ) : fopts ? (
            <div className="relative w-full">
              <select value={value ?? ''} onChange={e => onChange!(fieldKey, e.target.value)} className={inputCls + ' appearance-none pr-7 cursor-pointer'}>
                <option value="" disabled>Select…</option>
                {fopts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          ) : (
            <input type={ftype === 'number' ? 'number' : ftype === 'date' ? 'date' : 'text'}
              value={value ?? ''}
              onChange={e => onChange!(fieldKey, ftype === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={cfg?.placeholder ?? `Enter ${label.toLowerCase()}`}
              className={inputCls} />
          )
        ) : (
          <div className="text-[12px] font-semibold text-slate-850 leading-normal break-words font-sans w-full bg-white/70 border border-slate-200/20 shadow-[0_1px_2px_rgba(15,23,42,0.01)] rounded-md px-2 py-0.5 min-h-[24px] flex items-center">
            {missing ? (
              hint ? (
                <div className="flex items-center gap-1 text-slate-450 text-[10.5px] w-full">
                  <Info className="w-3 h-3 shrink-0" />
                  <span className="italic truncate">{hint}</span>
                </div>
              ) : (
                <span className="text-slate-400/70 font-medium italic text-[10.5px] w-full">Not recorded</span>
              )
            ) : ftype === 'checkbox' ? (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                toBool(value) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                <span className={`w-1 h-1 rounded-full ${toBool(value) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {toBool(value) ? 'Yes' : 'No'}
              </span>
            ) : (
              // Format display value: capitalize and replace underscores
              typeof value === 'string' && value.length > 0 && fieldKey !== 'address' && fieldKey !== 'treatment_regimen' && fieldKey !== 'facility_name' && fieldKey !== 'referred_facility'
                ? value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                : value
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

  // Flush all pending debounced changes immediately
  const flushPendingChanges = useCallback(() => {
    console.log('[DemographicsCarousel] flushPendingChanges called');
    console.log('[DemographicsCarousel] Current localValues:', localValues);
    console.log('[DemographicsCarousel] Pending timers:', Object.keys(debounceTimers.current));
    
    // Clear all pending timers
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    Object.keys(debounceTimers.current).forEach(key => delete debounceTimers.current[key]);
    
    // Merge ALL localValues into editedDemographics
    const updates: Record<string, any> = {};
    Object.entries(localValues).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value;
        console.log(`[DemographicsCarousel] Flushing "${key}" = "${value}"`);
      }
    });
    
    if (Object.keys(updates).length > 0) {
      setEditedDemographics(prev => ({ ...prev, ...updates }));
    }
  }, [localValues, setEditedDemographics]);

  const handleFieldChange = useCallback((key: string, value: any) => {
    console.log(`[DemographicsCarousel] handleFieldChange called: key="${key}", value="${value}"`);
    const config = FIELD_CONFIG[key];
    if (config?.type === 'checkbox') {
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
      return;
    }
    
    setLocalValues(prev => {
      const newValues = { ...prev, [key]: value };
      console.log(`[DemographicsCarousel] localValues updated:`, newValues);
      return newValues;
    });
    
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    debounceTimers.current[key] = setTimeout(() => {
      console.log(`[DemographicsCarousel] Debounce fired for "${key}", setting editedDemographics`);
      setEditedDemographics(prev => ({ ...prev, [key]: value }));
      delete debounceTimers.current[key];
    }, 100);
  }, [setEditedDemographics]);

  const getValue = useCallback((key: string, fallback: any) => {
    // Priority: localValues (user typing) > editedDemographics (saved edits) > fallback (patient data)
    const value = localValues[key] !== undefined ? localValues[key] : 
                  editedDemographics[key] !== undefined ? editedDemographics[key] : 
                  fallback;
    
    // Format date fields for HTML5 date inputs
    const config = FIELD_CONFIG[key];
    if (config?.type === 'date' && value) {
      return formatDateForInput(value);
    }
    return value;
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

  // Use exported parseKoboSymptoms function for robust parsing
  // Priority: editedDemographics.symptoms10s (set from mapDemographics in parent) > patient fields
  const parsedSymptomsResult = useMemo(() => {
    const symptomsData =
      editedDemographics?.symptoms10s ||
      patient?.symptoms_10s ||
      patient?.symptoms_present ||
      patient?.tb_symptoms ||
      patient?.symptoms;
    return parseKoboSymptoms(symptomsData);
  }, [editedDemographics?.symptoms10s, patient?.symptoms_10s, patient?.symptoms_present, patient?.tb_symptoms, patient?.symptoms]);
  const parsedSymptoms = parsedSymptomsResult.symptoms;
  const unrecognizedSymptoms = parsedSymptomsResult.unrecognized;
  const symptomsRawValue = parsedSymptomsResult.rawValue;

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
  const xrayRaw = gv('xray_result', patient?.xray_result);
  const xray    = formatXrayValue(xrayRaw);
  const hiv     = gv('hiv_status', patient?.hiv_status);
  const tbDx    = gv('tb_diagnosed_select', gv('tb_diagnosed', patient?.tb_diagnosed));
  const sDate   = formatDateForInput(gv('screening_date', patient?.screening_date));
  const isTBDx  = toBool(tbDx) || tbDx === 'Yes';
  const isHIV   = hiv === 'Positive';
  const isSusp  = xray === 'Suspected TB' || xrayRaw === 'Suspected_TB_Case';
  const symCount= Object.values(parsedSymptoms).filter(Boolean).length;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-100/50">
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="flex-1 overflow-y-auto px-3.5 py-3.5 pb-28 hide-scrollbar"
      >
        {/* ── CLINICAL WORKSPACE DOCUMENT ── */}
        <div className="bg-white border border-slate-200/50 shadow-[0_1px_3px_rgba(15,23,42,0.01)] overflow-hidden rounded-xl">

          {/* ══ HEADER: Super compact Patient Summary Strip (Light weight clinical style) ══ */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-[13.5px] font-black text-slate-900 leading-tight tracking-tight flex items-center gap-1.5 truncate">
                  {name}
                  {uid && (
                    <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/40">
                      {uid}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            {/* Compact vital badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {age && sex && (
                <span className="text-[9.5px] font-bold text-slate-600 bg-slate-50 border border-slate-200/40 px-2 py-0.5 rounded-md">
                  {age} yrs • {sex}
                </span>
              )}
              {gv('inmate_type', patient?.inmate_type) && (
                <span className="text-[9.5px] font-bold text-slate-600 bg-slate-50 border border-slate-200/40 px-2 py-0.5 rounded-md">
                  {gv('inmate_type', patient?.inmate_type)}
                </span>
              )}
              {sDate && (
                <span className="text-[9.5px] font-medium text-slate-500 bg-slate-50 border border-slate-200/40 px-2 py-0.5 rounded-md">
                  Screened: {sDate}
                </span>
              )}
              {(ftype || facility || state) && (
                <span className="text-[9.5px] font-medium text-blue-600 bg-blue-50/50 border border-blue-100/50 px-2 py-0.5 rounded-md max-w-[200px] truncate">
                  {[ftype, facility, state].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
          </div>

          {/* ══ WORKSPACE GRID: Highly compressed two-column workstation ══ */}
          <div className="p-3.5 grid grid-cols-1 lg:grid-cols-10 gap-4 bg-slate-50/40">
            
            {/* Left Content Area (70% width) - Core fields */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* § Identity & Contact */}
              <DocSection title="Identity & Contact" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <Field label="Father / Husband"  value={gv('father_husband_name', patient?.father_husband_name)} fieldKey="father_husband_name" editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Date of Birth"      value={gv('date_of_birth', patient?.date_of_birth)}            fieldKey="date_of_birth"      editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Age"                value={gv('age', patient?.age)}                                fieldKey="age"                 editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Sex"                value={gv('sex', patient?.sex)}                                fieldKey="sex"                 editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Inmate Type"        value={gv('inmate_type', patient?.inmate_type)}                fieldKey="inmate_type"         editable isEditing={E} onChange={H} className="col-span-1" />
                  {gv('inmate_type', patient?.inmate_type) === 'Other' && (
                    <Field label="Specify Type"     value={gv('inmate_type_other', patient?.inmate_type_other)}    fieldKey="inmate_type_other"   editable isEditing={E} onChange={H} className="col-span-1" />
                  )}
                  <Field label="Contact"            value={gv('contact_number', patient?.contact_number)}          fieldKey="contact_number"      editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Full Address"       value={getFullAddress()} fieldKey="address" className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4" editable isEditing={E} onChange={H} />
                </div>
              </DocSection>

              {/* § Screening Encounter */}
              <DocSection title="Screening Encounter" icon={Calendar}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <Field label="Screening Date"     value={gv('screening_date', patient?.screening_date)}          fieldKey="screening_date"      editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Facility Name"      value={gv('facility_name', patient?.facility_name)}            fieldKey="facility_name"       editable isEditing={E} onChange={H} className="col-span-1 sm:col-span-2" />
                  <Field label="Facility Type"      value={gv('facility_type', patient?.facility_type)}            fieldKey="facility_type"       editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Screening State"    value={gv('screening_state', patient?.screening_state)}        fieldKey="screening_state"     editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field 
                    label="Screening District" 
                    value={gv('screening_district', patient?.screening_district)}  
                    fieldKey="screening_district"  
                    editable isEditing={E} onChange={H} 
                    className="col-span-1"
                    customComponent={
                      E && (
                        <SearchableDistrictSelect
                          value={gv('screening_district', patient?.screening_district) || ''}
                          onChange={(value) => H('screening_district', value)}
                          state={gv('screening_state', patient?.screening_state) || ''}
                        />
                      )
                    }
                  />
                  <Field label="Staff Name"         value={gv('staff_name', patient?.staff_name)}                  fieldKey="staff_name"          editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Submitted On"       value={gv('submitted_on', patient?.submitted_on)}              fieldKey="submitted_on"        editable isEditing={E} onChange={H} className="col-span-1" />
                  {gv('screening_state', patient?.screening_state) === 'Other' && (
                    <Field label="Specify State"    value={gv('screening_state_other', patient?.screening_state_other)} fieldKey="screening_state_other" editable isEditing={E} onChange={H} className="col-span-1" />
                  )}
                  {gv('screening_district', patient?.screening_district) === 'Other' && (
                    <Field label="Specify District" value={gv('screening_district_other', patient?.screening_district_other)} fieldKey="screening_district_other" editable isEditing={E} onChange={H} className="col-span-1" />
                  )}
                </div>
              </DocSection>

              {/* § Diagnostics & Treatment (Mirror) */}
              <DocSection title="Diagnostics & Treatment" icon={Activity}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <Field label="X-Ray Result"       value={formatXrayValue(gv('xray_result', patient?.xray_result))}                fieldKey="xray_result"         editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Referral Date"      value={gv('referral_date', patient?.referral_date)}            fieldKey="referral_date"       editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Referred Facility"  value={gv('referred_facility', patient?.referred_facility)}    fieldKey="referred_facility"   editable isEditing={E} onChange={H} className="col-span-1 sm:col-span-2" />
                  <Field label="TB Past History"    value={gv('tb_past_history', patient?.tb_past_history)}        fieldKey="tb_past_history"     editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="TB Diagnosed"       value={gv('tb_diagnosed_select', gv('tb_diagnosed', patient?.tb_diagnosed))} fieldKey="tb_diagnosed_select" editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="Diagnosis Date"     value={gv('tb_diagnosis_date', patient?.tb_diagnosis_date)}    fieldKey="tb_diagnosis_date"   editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="ATT Start Date"     value={gv('att_start_date', patient?.att_start_date)}          fieldKey="att_start_date"      editable isEditing={E} onChange={H} hint="Set when treatment begins" className="col-span-1" />
                  <Field label="Referred To"        value={gv('referred_to_facility', patient?.referred_to_facility)} fieldKey="referred_to_facility" editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="AI Confidence"      value={gv('ai_confidence_score', patient?.ai_confidence_score)} fieldKey="ai_confidence_score" isEditing={E} onChange={H} className="col-span-1" />
                  {gv('referred_to_facility', patient?.referred_to_facility) === 'Other' && (
                    <Field label="Specify Facility" value={gv('referred_to_facility_other', patient?.referred_to_facility_other)} fieldKey="referred_to_facility_other" editable isEditing={E} onChange={H} className="col-span-1" />
                  )}
                  <Field label="Treatment Regimen"  value={gv('treatment_regimen', patient?.treatment_regimen)}    fieldKey="treatment_regimen"   editable isEditing={E} onChange={H} className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4" />
                </div>
              </DocSection>

              {/* § HIV / ART */}
              <DocSection title="HIV / ART Status" icon={Shield}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <Field label="HIV Status"   value={gv('hiv_status', patient?.hiv_status)}   fieldKey="hiv_status"  editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="ART Started"  value={gv('art_started', patient?.art_started)}  fieldKey="art_started" editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="CPT Given"    value={gv('cpt_given', patient?.cpt_given)}      fieldKey="cpt_given"   editable isEditing={E} onChange={H} className="col-span-1" />
                  <Field label="ART Center"   value={gv('art_center', patient?.art_center)}    fieldKey="art_center"  editable isEditing={E} onChange={H} hint="Required if HIV positive" className="col-span-1 sm:col-span-2" />
                </div>
              </DocSection>

              {/* § Registration & System */}
              <DocSection title="Registration & System" icon={ClipboardList}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <Field label="Unique ID"    value={gv('unique_id', patient?.unique_id || patient?.serial_number)} fieldKey="unique_id" editable isEditing={E} onChange={H} hint="Serial number from Kobo" className="col-span-1" />
                  <Field label="Nikshay ID"   value={gv('nikshay_id', patient?.nikshay_id)}   fieldKey="nikshay_id"  editable isEditing={E} onChange={H} hint="Assign after TB confirmation" className="col-span-1" />
                  <Field label="ABHA ID"      value={gv('abha_id', patient?.abha_id)}          fieldKey="abha_id"     editable isEditing={E} onChange={H} hint="Link via ABHA portal" className="col-span-1" />
                  <Field label="Kobo UUID"    value={gv('kobo_uuid', patient?.kobo_uuid)}      fieldKey="kobo_uuid"   isEditing={E} onChange={H} hint="Generated by Kobo on submission" className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4" />
                </div>
              </DocSection>
            </div>

            {/* Right Side Rail (30% width) - Support rail & alerts */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              
              {/* § Clinical Dashboard Status (Super-compact 2x2 grid) */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200/50 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.01)]">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-black tracking-[0.12em] text-slate-600 uppercase">Status Dashboard</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { 
                      label: 'X-Ray', 
                      val: xray, 
                      flag: isSusp, 
                      icon: FileText,
                      color: isSusp ? 'text-amber-700 bg-amber-50 border-amber-200' : xray === 'Normal' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-650 bg-slate-50 border-slate-200' 
                    },
                    { 
                      label: 'HIV Status', 
                      val: hiv, 
                      flag: isHIV, 
                      icon: Shield,
                      color: isHIV ? 'text-pink-700 bg-pink-50 border-pink-200' : hiv === 'Negative' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-650 bg-slate-50 border-slate-200' 
                    },
                    { 
                      label: 'TB diagnosed', 
                      val: tbDx, 
                      flag: isTBDx, 
                      icon: Activity,
                      color: isTBDx ? 'text-red-700 bg-red-50 border-red-200' : tbDx === 'No' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-650 bg-slate-50 border-slate-200' 
                    },
                    { 
                      label: 'Symptoms', 
                      val: `${symCount} / 10`, 
                      flag: symCount >= 3, 
                      icon: Info,
                      color: symCount >= 3 ? 'text-orange-700 bg-orange-50 border-orange-200' : symCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    },
                  ].map(({ label, val, flag, icon: Icon, color }) => (
                    <div key={label} className="flex flex-col justify-between p-2 rounded-lg border border-slate-150 bg-slate-50/20 shadow-[0_1px_1px_rgba(0,0,0,0.01)] h-14">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                        <Icon className="w-3.5 h-3.5 text-slate-400/70" />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {val ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none flex items-center gap-1 ${color}`}>
                            {flag && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />}
                            <span className="truncate max-w-[70px]">{String(val)}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] italic text-slate-400 font-medium">None</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* § 10S Symptom Checklist (Dense & clean) */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200/50 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.01)]">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 justify-between">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-black tracking-[0.12em] text-slate-600 uppercase">Symptom Checklist</span>
                  </div>
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${
                    symCount >= 3 ? 'bg-red-50 border-red-200 text-red-700' : symCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {symCount} / 10
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-1">
                  {SYMPTOMS_MASTER.map(s => (
                    <SymptomRow key={s.id} label={s.label} selected={parsedSymptoms[s.id]} />
                  ))}
                </div>

                {symCount === 0 && (
                  <div className="text-slate-400 italic text-[10.5px] text-center py-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200/60">
                    No symptoms recorded
                  </div>
                )}

                {unrecognizedSymptoms.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1 border-t border-slate-100 pt-2">
                    <span className="text-[8.5px] font-bold uppercase tracking-wide text-slate-400">Unrecognized:</span>
                    <div className="flex flex-wrap gap-1">
                      {unrecognizedSymptoms.map((sym, i) => (
                        <span key={i} className="text-[9.5px] text-slate-500 font-medium italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">{sym}</span>
                      ))}
                    </div>
                  </div>
                )}

                {symCount >= 3 && (
                  <div className="mt-1 flex items-start gap-2 px-2.5 py-2 bg-red-50 border border-red-200/50 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-bold text-red-800 uppercase tracking-wide leading-none">High Risk</span>
                      <span className="text-[9px] text-red-700/90 leading-tight mt-0.5">3+ symptoms: prioritize sputum/X-ray.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ ACTION BAR ══ */}
      <div className="absolute bottom-0 left-0 w-full flex items-center gap-2.5 px-5 py-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <button
          className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-[10px] uppercase tracking-[0.12em] transition-all duration-200 border ${
            E 
              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/50 shadow-sm' 
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
          onClick={() => setIsEditingDemographics(!E)}
        >
          {E ? <><Lock className="w-3.5 h-3.5"/><span>Lock Editing</span></> : <><Unlock className="w-3.5 h-3.5"/><span>Unlock to Edit</span></>}
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-[10px] uppercase tracking-[0.12em] border border-red-200 text-red-500 hover:bg-red-50 transition-all duration-200"
          onClick={() => document.dispatchEvent(new CustomEvent('openCloseLoopModal'))}
        >
          <XCircle className="w-3.5 h-3.5"/><span>Close Loop</span>
        </button>
        <button
          className="flex-[2] relative flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-[10px] uppercase tracking-[0.12em] text-white overflow-hidden group transition-all duration-200 shadow-[0_2px_10px_rgba(15,23,42,0.2)] hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}
          onClick={() => { if (E) { flushPendingChanges(); document.dispatchEvent(new CustomEvent('saveDemographicsEvent', { detail: localValues })); setIsEditingDemographics(false); } else { document.dispatchEvent(new CustomEvent('submitClinicalUpdateEvent')); } }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <CheckCircle2 className="w-3.5 h-3.5 text-white/80"/>
          <span>{E ? 'Save Changes' : 'Submit Update'}</span>
        </button>
      </div>
    </div>
  );
}