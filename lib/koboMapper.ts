/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🚀 TB INDUSTRIAL ENGINE - KOBO DATA NORMALIZATION ENGINE v2.3
 * - Ported from Google Apps Script with exact 4-way fallback logic
 * - Handles highly variable KoboToolbox key names
 * - Maps to clean Supabase patients table schema
 * ═══════════════════════════════════════════════════════════════════════════
 */

// =============================================================================
// 1. MAPPING DICTIONARIES (Exact port from Apps Script)
// =============================================================================

export const STATE_CODE_MAP: Record<string, string> = {
  // PRIMARY: What Kobo sends (with underscores)
  "chandigarh": "CH",
  "dd___dnh": "DD",
  "goa": "GA",
  "gujarat": "GJ",
  "jammu_and_kashmir": "JK",
  "ladakh": "LD",
  "madhya_pradesh": "MP",
  "maharashtra": "MH",
  "manipur": "MN",
  "mizoram": "MZ",
  "mumbai": "MB",
  "uttarakhand": "UK",

  // FALLBACK: With spaces (manual entry compatibility)
  "dd & dnh": "DD",
  "dd and dnh": "DD",
  "jammu and kashmir": "JK",
  "madhya pradesh": "MP",

  // FALLBACK: Short codes
  "ch": "CH",
  "dd": "DD",
  "ga": "GA",
  "gj": "GJ",
  "jk": "JK",
  "ld": "LD",
  "mp": "MP",
  "mh": "MH",
  "mn": "MN",
  "mz": "MZ",
  "mb": "MB",
  "uk": "UK"
};

export const FACILITY_NAME_MAP: Record<string, string> = {
  'SJ': 'Sub Jail', 'CJ': 'Central Jail', 'DJ': 'District Jail', 'SPJ': 'Special Jail', 'OJ': 'Open Jail',
  'BJ': 'Borstal Jail', 'WJ': 'Women Jail', 'OTJ': 'Other Jail', 'OT': 'Others', 'SS': 'Shakti Sadan',
  'SG': 'Swadhar Greh', 'UH': 'Ujjawala Home', 'NN': 'Nari Niketan', 'OSC': 'One Stope Center',
  'OSRH': 'Other State Run Home', 'JHCCI': 'Juvenile Homes & CCI', 'DDRC': 'DDRC/DDAC/Pvt. DAC',
  'Central Jail': 'Central Jail', 'District Jail': 'District Jail', 'Sub Jail': 'Sub Jail',
  'Special Jail': 'Special Jail', 'Open Jail': 'Open Jail', 'Borstal Jail': 'Borstal Jail',
  'Women Jail': 'Women Jail', 'Other Jail': 'Other Jail', 'Others': 'Others', 'Shakti Sadan': 'Shakti Sadan',
  'Swadhar Greh': 'Swadhar Greh', 'Ujjawala Home': 'Ujjawala Home', 'Nari Niketan': 'Nari Niketan',
  'One Stope Center': 'One Stope Center', 'Other State Run Home': 'Other State Run Home',
  'Juvenile Homes & CCI': 'Juvenile Homes & CCI', 'DDRC/DDAC/Pvt. DAC': 'DDRC/DDAC/Pvt. DAC'
};

export const FACILITY_CODE_MAP: Record<string, string> = {
  'Central Jail': 'CJ', 'District Jail': 'DJ', 'Sub Jail': 'SJ', 'Special Jail': 'SPJ', 'Open Jail': 'OJ',
  'Borstal Jail': 'BJ', 'Women Jail': 'WJ', 'Other Jail': 'OTJ', 'Others': 'OT', 'Shakti Sadan': 'SS',
  'Swadhar Greh': 'SG', 'Ujjawala Home': 'UH', 'Nari Niketan': 'NN', 'One Stope Center': 'OSC',
  'Other State Run Home': 'OSRH', 'Juvenile Homes & CCI': 'JHCCI', 'DDRC/DDAC/Pvt. DAC': 'DDRC'
};

export const FACILITY_TYPE_MAP: Record<string, string> = {
  'prison': 'Prison', 'other_closed_setting': 'Other Closed Setting', 'jh_cci': 'JH-CCI', 'ddrc': 'DDRC'
};

export const STATE_MAPPING: Record<string, string> = {
  'chandigarh': 'Chandigarh', 'dd___dnh': 'DD & DNH', 'goa': 'Goa', 'gujarat': 'Gujarat',
  'jammu_and_kashmir': 'Jammu and Kashmir', 'ladakh': 'Ladakh', 'madhya_pradesh': 'Madhya Pradesh',
  'maharashtra': 'Maharashtra', 'mumbai': 'Mumbai', 'uttarakhand': 'Uttarakhand',
  'mizoram': 'Mizoram', 'manipur': 'Manipur'
};

export const CHEST_XRAY_MAPPING: Record<string, string> = {
  'suspected tb case': 'Suspected TB CASE',
  'abnormal': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
  'normal': 'NORMAL',
  'suspected_tb_case': 'Suspected TB CASE',
  'not_detected': 'NORMAL',
  'not-detected': 'NORMAL',
  'a': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
  'active': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
  'l': 'NORMAL',
  'latent': 'NORMAL'
};

export const TB_TYPE_MAPPING: Record<string, string> = {
  'pulmonary': 'Pulmonary', 'extrapulmonary': 'Extrapulmonary',
  'Pulmonary_tuberculosis_(PTB)': 'Pulmonary', 'Extrapulmonary_tuberculosis_(EPTB)': 'Extrapulmonary'
};

export const INMATE_TYPE_MAP: Record<string, string> = {
  'under_trial': 'Under Trial', 'convicted': 'Convicted', 'other': 'Other'
};

export const SEX_MAPPING: Record<string, string> = {
  'male': 'Male', 'female': 'Female', 'tg': 'TG'
};

export const REFERRED_FACILITY_MAP: Record<string, string> = {
  'dmc_designated_microscopy_centre': 'DMC-Designated Microscopy Centre',
  'tdc_tb_diagnostic_centre': 'TDC-TB Diagnostic Centre', 'cbnaat': 'CBNAAT',
  'dst_drug_susceptibility_testing': 'DST-Drug Susceptibility Testing',
  'radiology': 'Radiology', 'histopathology': 'Histopathology', 'art_centre': 'ART Centre',
  'pvt____others': 'Pvt. & Others', 'others': 'Others'
};

export const SYMPTOMS_CODE_MAPPING: Record<string, string> = {
  'no_symptomps': 'No Symptoms',
  'cough_of_any_duration': 'Cough of any duration',
  'haemoptysis': 'Haemoptysis',
  'chest_pain': 'Chest Pain',
  'fever': 'Fever',
  'night_sweats': 'Night Sweats',
  'loss_of_appetite': 'Loss of Appetite',
  'weight_loss': 'Weight Loss',
  'weight_loss_2': 'Weight Loss',
  'dyspnoea': 'Dyspnoea',
  'dyspnea': 'Dyspnoea',
  'fatigue': 'Fatigue',
  'reduced_physical_activity': 'Reduced Physical Activity',
  'lymph_nodes': 'Lymph Nodes',
  'no_symptoms': 'No Symptoms',
  'anorexia': 'Loss of Appetite',
  'others': 'Others',
  'others:_specify': 'Others',
  'others: specify': 'Others',

  'cough of any duration': 'Cough of any duration',
  'chest pain': 'Chest Pain',
  'night sweats': 'Night Sweats',
  'loss of appetite': 'Loss of Appetite',
  'weight loss': 'Weight Loss',
  'reduced physical activity': 'Reduced Physical Activity',
  'lymph nodes': 'Lymph Nodes',
  'no symptoms': 'No Symptoms',

  'cough': 'Cough of any duration',
  'rpa': 'Reduced Physical Activity',
  'wl': 'Weight Loss',
  'cp': 'Chest Pain'
};

export const YES_NO_MAPPING: Record<string, string> = {
  'yes': 'Yes', 'no': 'No', '1': 'Yes', '0': 'No', 'unknown': 'Unknown'
};

export const HIV_MAPPING: Record<string, string> = {
  'positive': 'Positive', 'negative': 'Negative', 'unknown': 'Unknown'
};

export const ART_STATUS_MAPPING: Record<string, string> = {
  'pre_art': 'Pre ART', 'on_art': 'On ART'
};

// =============================================================================
// 2. UTILITY FUNCTIONS (Exact port from Apps Script)
// =============================================================================

/**
 * 🔍 4-WAY FALLBACK HELPER - Checks multiple possible object keys and returns first valid value
 * This is the core function that handles Kobo's variable key names
 */
function getField(obj: any, keys: string[]): string {
  if (!obj) return "";
  for (let i = 0; i < keys.length; i++) {
    if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
      return String(obj[keys[i]]);
    }
  }
  return "";
}

/**
 * 📅 Format ISO timestamp to IST format (Exact port from Apps Script)
 */
function formatSubmissionTimestamp(isoTimestamp: string): string {
  if (!isoTimestamp) return '';
  try {
    // 1. Clean the string and ensure it is treated as UTC (Zulu time)
    let cleanIso = isoTimestamp.replace(' ', 'T');
    if (cleanIso.indexOf('Z') === -1 && cleanIso.indexOf('+') === -1) {
      cleanIso += 'Z';
    }

    const date = new Date(cleanIso);
    if (isNaN(date.getTime())) return isoTimestamp;

    // 2. Format to IST display format
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    };
    
    return `Submitted on ${date.toLocaleDateString('en-IN', options)}`;
  } catch (e) {
    console.error('Timestamp Error: ' + e);
    return isoTimestamp;
  }
}

/**
 * 📅 Convert date string to DD/MM/YYYY format (for display/export only)
 */
function toDDMMYYYY(v: string | number): string {
  if (!v) return '';
  const str = String(v);
  
  // Check if already in DD/MM/YYYY format
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return str;
  
  // Parse YYYY-MM-DD format
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  
  return str;
}

/**
 * 📅 Convert date string to ISO format YYYY-MM-DD (for Supabase DATE columns)
 */
function toISODate(raw: string | number | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  
  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  
  // DD/MM/YYYY or DD/MM/YY format
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3].length === 2 
      ? '20' + dmyMatch[3] 
      : dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // "Submitted on DD/MM/YY at H:MM AM/PM IST" format
  const submittedMatch = s.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
  );
  if (submittedMatch) {
    const day = submittedMatch[1].padStart(2, '0');
    const month = submittedMatch[2].padStart(2, '0');
    const year = submittedMatch[3].length === 2 
      ? '20' + submittedMatch[3] 
      : submittedMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try native Date parsing as last resort
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }
  
  return null;
}

/**
 * 📅 Parse submitted_on timestamp to ISO format with IST timezone
 */
function parseSubmittedOn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  
  // Already ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  
  // "Submitted on DD/MM/YY at H:MM AM/PM IST" format
  const m = s.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    let hours = parseInt(m[4]);
    const mins = m[5];
    const ampm = m[6].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const hh = String(hours).padStart(2, '0');
    // IST = UTC+5:30
    return `${year}-${month}-${day}T${hh}:${mins}:00+05:30`;
  }
  
  // Try native Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  
  return null;
}

/**
 * 📝 Convert to proper case (First letter capital)
 */
function toProperCase(s: string): string {
  if (!s) return '';
  return String(s).toLowerCase().replace(/\b(\w)/g, (m) => m.toUpperCase());
}

/**
 * 🏥️ Extract GPS coordinates from _geolocation array
 */
function extractCoordinates(geolocation: any): { latitude: number | null; longitude: number | null } {
  const geo = Array.isArray(geolocation) ? geolocation : [];
  return {
    latitude: geo[0] != null ? parseFloat(String(geo[0])) : null,
    longitude: geo[1] != null ? parseFloat(String(geo[1])) : null
  };
}

/**
 * 🩺 Process symptoms with complex mapping logic
 */
function processSymptoms(symptomsRaw: any, mappings: any): string {
  if (!symptomsRaw || symptomsRaw === '') {
    return "";
  }

  const symptoms: string[] = [];
  
  if (typeof symptomsRaw === 'string') {
    const symStr = symptomsRaw.trim();
    
    if (symStr.indexOf(',') > -1) {
      // Handle comma-separated symptoms
      const parts = symStr.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        const keyUnderscore = trimmed.toLowerCase().replace(/\s+/g, '_');
        const keyDirect = trimmed.toLowerCase();
        
        if (mappings.symptomsCodeMapping[keyUnderscore]) {
          symptoms.push(mappings.symptomsCodeMapping[keyUnderscore]);
        } else if (mappings.symptomsCodeMapping[keyDirect]) {
          symptoms.push(mappings.symptomsCodeMapping[keyDirect]);
        } else {
          symptoms.push(trimmed);
        }
      }
    } else if (symStr.indexOf('_') > -1 && symStr.indexOf(' ') > -1) {
      // Handle space-separated symptoms with underscores
      const codes = symStr.split(/\s+/);
      for (const code of codes) {
        const key = code.toLowerCase().trim();
        symptoms.push(mappings.symptomsCodeMapping[key] || code);
      }
    } else {
      // Handle single symptom
      const keyUnderscore = symStr.toLowerCase().replace(/\s+/g, '_');
      const keyDirect = symStr.toLowerCase().trim();
      
      if (mappings.symptomsCodeMapping[keyUnderscore]) {
        symptoms.push(mappings.symptomsCodeMapping[keyUnderscore]);
      } else if (mappings.symptomsCodeMapping[keyDirect]) {
        symptoms.push(mappings.symptomsCodeMapping[keyDirect]);
      } else {
        symptoms.push(symStr);
      }
    }
  } else if (Array.isArray(symptomsRaw)) {
    // Handle array of symptoms
    for (const item of symptomsRaw) {
      const strItem = String(item).trim();
      const keyUnderscore = strItem.toLowerCase().replace(/\s+/g, '_');
      const keyDirect = strItem.toLowerCase().trim();
      
      if (mappings.symptomsCodeMapping[keyUnderscore]) {
        symptoms.push(mappings.symptomsCodeMapping[keyUnderscore]);
      } else if (mappings.symptomsCodeMapping[keyDirect]) {
        symptoms.push(mappings.symptomsCodeMapping[keyDirect]);
      } else {
        symptoms.push(strItem);
      }
    }
  }

  // Remove duplicates and join
  const uniqueSymptoms = [...new Set(symptoms)].filter(s => s && s.trim());
  return uniqueSymptoms.join(", ");
}

// =============================================================================
// 3. MAIN MAPPING FUNCTION (Exact port from processSingleRow_)
// =============================================================================

export interface MappedPatientData {
  staff_name: string;
  submitted_on: string;
  state: string;
  district: string;
  facility_name: string;
  facility_type: string;
  screening_date: string | null;
  unique_id: string;
  inmate_name: string;
  inmate_type: string;
  father_husband_name: string;
  date_of_birth: string | null;
  age: string;
  sex: string;
  contact_number: string;
  address: string;
  chest_xray_result: string;
  symptoms_10s: string;
  tb_past_history: string;
  referral_date: string | null;
  referred_facility: string;
  tb_diagnosed: string;
  tb_diagnosis_date: string | null;
  tb_type: string;
  att_start_date: string | null;
  att_completion_date: string | null;
  hiv_status: string;
  art_status_at_referral: string;
  art_number: string;
  nikshay_abha_id: string;
  nikshay_registration_date: string | null;
  remarks: string;
  kobo_uuid: string;
  kobo_id: string;
  serial_number: string;
  latitude: number | null;
  longitude: number | null;
  microplan_block: string;
  symptom_cough_2weeks: boolean;
  symptom_fever: boolean;
  symptom_night_sweats: boolean;
  symptom_weight_loss: boolean;
  symptom_haemoptysis: boolean;
  symptom_chest_pain: boolean;
  symptom_breathlessness: boolean;
  symptom_lymphadenopathy: boolean;
  symptom_loss_of_appetite: boolean;
  symptom_other: boolean;
  symptom_other_detail: string;
  xray_done: boolean;
  cbnaat_done: boolean;
  cbnaat_result: string;
  referred_for_diagnosis: boolean;
  dr_tb: boolean;
  att_started: boolean;
  treatment_regimen: string;
  dots_provider: string;
  treatment_status: string;
}

export interface FacilityCounters {
  [key: string]: number;
}

/**
 * 🗺️ MAIN KOBO → SUPABASE MAPPER
 * Takes raw Kobo JSON submission and returns clean, structured object
 * Uses exact 4-way fallback logic for every field
 */
export function mapKoboPayloadToSupabase(
  payload: any,
  facilityCounters: FacilityCounters = {}
): MappedPatientData {
  // Initialize mappings object (same structure as Apps Script)
  const mappings = {
    facilityNameMap: FACILITY_NAME_MAP,
    facilityCodeMap: FACILITY_CODE_MAP,
    facilityTypeMapping: FACILITY_TYPE_MAP,
    stateMapping: STATE_MAPPING,
    chestXrayMapping: CHEST_XRAY_MAPPING,
    tbTypeMapping: TB_TYPE_MAPPING,
    inmateTypeMapping: INMATE_TYPE_MAP,
    sexMapping: SEX_MAPPING,
    referredFacilityMapping: REFERRED_FACILITY_MAP,
    symptomsCodeMapping: SYMPTOMS_CODE_MAPPING,
    yesNoMapping: YES_NO_MAPPING,
    hivMapping: HIV_MAPPING,
    artStatusMapping: ART_STATUS_MAPPING
  };

  // Column 0: Staff Name (4-way fallback)
  const staffName = getField(payload, [
    'grp_screening/staff_name', 
    'staff_name', 
    'grp_screening/Name_of_the_Staff', 
    'Name_of_the_Staff'
  ]) || getField(payload, ['username', '_submitted_by']) || "System Entry";

  // Column 1: Formatted Timestamp
  const submittedOn = formatSubmissionTimestamp(getField(payload, ['_submission_time']));

  // Column 2: State (4-way fallback)
  const stateRaw = getField(payload, [
    'grp_screening/screening_state', 
    'screening_state', 
    'grp_screening/State', 
    'State'
  ]);
  const stateNorm = String(stateRaw || "").toLowerCase().trim();
  const stateDisplay = mappings.stateMapping[stateNorm] || stateRaw;

  // Column 3: District (4-way fallback)
  const districtRaw = getField(payload, [
    'grp_screening/screening_district', 
    'screening_district', 
    'grp_screening/District', 
    'District'
  ]);

  // Column 4: Facility Name (4-way fallback)
  const facilityRaw = getField(payload, [
    'grp_screening/facility_code', 
    'facility_code', 
    'grp_screening/facility_name', 
    'facility_name'
  ]);
  const facilityLabel = mappings.facilityNameMap[facilityRaw] || 
    mappings.facilityNameMap[String(facilityRaw).toUpperCase()] || 
    facilityRaw || "Unknown";

  // Column 5: Facility Type (4-way fallback)
  const facilityTypeRaw = String(getField(payload, [
    'grp_screening/facility_type', 
    'facility_type', 
    'grp_screening/Facility_type', 
    'Facility_type'
  ])).toLowerCase();
  const facilityType = mappings.facilityTypeMapping[facilityTypeRaw] || facilityTypeRaw;

  // Column 6: Screening Date (4-way fallback) - ISO format for Supabase
  const screeningDate = toISODate(getField(payload, [
    'grp_screening/screening_date', 
    'screening_date', 
    'grp_screening/Date_of_Screening_CH_x_ray_dd_mm_yy', 
    'Date_of_Screening_CH_x_ray_dd_mm_yy'
  ]));

  // Column 7: Unique ID - Use UUID-based approach to avoid counter reset issues
  const stateStr = String(stateRaw || "").toLowerCase().trim();
  const stateCode = STATE_CODE_MAP[stateStr] || STATE_CODE_MAP[stateStr.replace(/\s+/g, '_')] || STATE_CODE_MAP[stateStr.substring(0, 2)] || 'XX';
  const districtCode = String(districtRaw || "XX").substring(0, 2).toUpperCase();
  const facilityCode = mappings.facilityCodeMap[facilityLabel] || 'UNK';

  // Generate unique ID with timestamp + random suffix (avoids counter reset on cold starts)
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const uniqueId = `${stateCode}-${districtCode}-${facilityCode}-${timestamp}-${random}`;

  // Column 8: Inmate Name (4-way fallback)
  const inmateName = toProperCase(getField(payload, [
    'grp_identity/inmate_name', 
    'inmate_name', 
    'grp_identity/Inmate_Name', 
    'Inmate_Name'
  ]));

  // Column 9: Inmate Type (4-way fallback)
  const inmateType = mappings.inmateTypeMapping[getField(payload, [
    'grp_identity/inmate_type', 
    'inmate_type', 
    'grp_identity/Inmate_type_Under_Trial_Convicted_Other', 
    'Inmate_type_Under_Trial_Convicted_Other'
  ])] || "Other";

  // Column 10: Father/Husband Name (4-way fallback)
  const fatherHusbandName = toProperCase(getField(payload, [
    'grp_identity/father_husband_name', 
    'father_husband_name', 
    'grp_identity/Father_Husband_s_Name', 
    'Father_Husband_s_Name'
  ]));

  // Column 11: Date of Birth (4-way fallback) - ISO format for Supabase
  const dateOfBirth = toISODate(getField(payload, [
    'grp_demo/date_of_birth', 
    'date_of_birth', 
    'grp_demo/Date_of_Birth', 
    'Date_of_Birth'
  ]));

  // Column 12: Age (4-way fallback)
  const age = getField(payload, ['grp_demo/age', 'age']);

  // Column 13: Sex (4-way fallback)
  const sexRaw = String(getField(payload, [
    'grp_demo/sex', 
    'sex', 
    'grp_demo/Sex_Male_Female_TG', 
    'Sex_Male_Female_TG'
  ])).toLowerCase();
  const sex = mappings.sexMapping[sexRaw] || sexRaw;

  // Column 14: Contact Number (4-way fallback)
  const contactNumber = getField(payload, [
    'grp_demo/contact_number', 
    'contact_number', 
    'grp_demo/Contact_Number', 
    'Contact_Number'
  ]);

  // Column 15: Address (4-way fallback for each component)
  const addressComponents = [
    getField(payload, ['grp_address/address_block_house', 'address_block_house', 'grp_address/Block_House_no', 'Block_House_no']),
    getField(payload, ['grp_address/address_street', 'address_street', 'grp_address/Street_Locality_Name', 'Street_Locality_Name']),
    getField(payload, ['grp_address/address_city', 'address_city', 'grp_address/City', 'City']),
    getField(payload, ['grp_address/address_district', 'address_district', 'grp_address/inmate_district_india', 'inmate_district_india']),
    getField(payload, ['grp_address/address_state', 'address_state', 'grp_address/inmate_state_india', 'inmate_state_india']),
    getField(payload, ['grp_address/address_country', 'address_country', 'grp_address/inmate_country', 'inmate_country']),
    getField(payload, ['grp_address/address_pin_code', 'address_pin_code', 'grp_address/Pin_Code', 'Pin_Code'])
  ].filter(Boolean);
  const address = addressComponents.join(", ");

  // Column 16: X-Ray Result (4-way fallback)
  const chestXrayRaw = getField(payload, [
    'grp_tb/xray_result', 
    'xray_result', 
    'grp_tb/Chest_x_ray_Result_Active_Lat', 
    'Chest_x_ray_Result_Active_Lat'
  ]).toString().trim();
  const chestXrayResult = mappings.chestXrayMapping[chestXrayRaw.toLowerCase()] || chestXrayRaw;

  // Column 17: Symptoms (4-way fallback)
  const symptomsRaw = getField(payload, [
    'grp_tb/symptoms_10s', 
    'symptoms_10s', 
    'grp_tb/_10s_Symptoms_Present_You_can', 
    '_10s_Symptoms_Present_You_can'
  ]);
  const symptoms = processSymptoms(symptomsRaw, mappings);

  // Column 18: TB Past History (4-way fallback)
  const tbPastHistory = mappings.yesNoMapping[getField(payload, [
    'grp_tb/tb_past_history', 
    'tb_past_history', 
    'grp_tb/Whether_any_past_history_of_TB_Y_N', 
    'Whether_any_past_history_of_TB_Y_N'
  ])] || "No";

  // Column 19: Referral Date (4-way fallback) - ISO format for Supabase
  const referralDate = toISODate(getField(payload, [
    'grp_referral/referral_date', 
    'referral_date', 
    'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy', 
    'Date_of_referral_for_ion_sputum_dd_mm_yy'
  ]));

  // Column 20: Referred Facility (4-way fallback)
  const referredFacility = mappings.referredFacilityMapping[getField(payload, [
    'grp_referral/referred_facility', 
    'referred_facility', 
    'grp_referral/Name_of_facility_whe_me_of_all_facilities', 
    'Name_of_facility_whe_me_of_all_facilities'
  ])] || "";

  // Column 21: TB Diagnosed (4-way fallback)
  const tbDiagnosed = mappings.yesNoMapping[getField(payload, [
    'grp_referral/tb_diagnosed', 
    'tb_diagnosed', 
    'grp_referral/TB_diagnosed', 
    'TB_diagnosed'
  ])] || "No";

  // Column 22: Diagnosis Date (4-way fallback) - ISO format for Supabase
  const tbDiagnosisDate = toISODate(getField(payload, [
    'grp_referral/tb_diagnosis_date', 
    'tb_diagnosis_date', 
    'grp_referral/Date_of_TB_Diagnosed_dd_mm_yy', 
    'Date_of_TB_Diagnosed_dd_mm_yy'
  ]));

  // Column 23: TB Type (4-way fallback)
  const tbType = mappings.tbTypeMapping[getField(payload, [
    'grp_referral/tb_type', 
    'tb_type', 
    'grp_referral/Type_of_TB_Diagnosed_P_EP', 
    'Type_of_TB_Diagnosed_P_EP'
  ])] || "";

  // Column 24: ATT Start Date (4-way fallback) - ISO format for Supabase
  const attStartDate = toISODate(getField(payload, [
    'grp_referral/att_start_date', 
    'att_start_date', 
    'grp_referral/Date_of_starting_ATT_dd_mm_yyyy', 
    'Date_of_starting_ATT_dd_mm_yyyy'
  ]));

  // Column 25: ATT Completion Date (4-way fallback) - ISO format for Supabase
  const attCompletionDate = toISODate(getField(payload, [
    'grp_referral/att_completion_date', 
    'att_completion_date', 
    'grp_referral/Date_of_Treatment_Completion_dd_mm_yyyy', 
    'Date_of_Treatment_Completion_dd_mm_yyyy'
  ]));

  // Column 26: HIV Status (4-way fallback)
  const hivStatus = mappings.hivMapping[getField(payload, [
    'grp_hiv/hiv_status', 
    'hiv_status', 
    'grp_hiv/HIV_Status_Positive_Negative_', 
    'HIV_Status_Positive_Negative_'
  ])] || "Unknown";

  // Column 27: ART Status (4-way fallback)
  const artStatus = mappings.artStatusMapping[getField(payload, [
    'grp_hiv/art_status_at_referral', 
    'art_status_at_referral', 
    'grp_hiv/Status_at_the_time_o_at_time_of_referral', 
    'Status_at_the_time_o_at_time_of_referral'
  ])] || "";

  // Column 28: ART Number (4-way fallback)
  const artNumber = String(getField(payload, [
    'grp_hiv/art_number', 
    'art_number', 
    'grp_hiv/ART_Number_if_on_ART_the_time_of_referral', 
    'ART_Number_if_on_ART_the_time_of_referral'
  ])).toUpperCase();

  // Column 29: Nikshay ID (4-way fallback)
  const nikshayAbhaId = String(getField(payload, [
    'grp_reg/nikshay_abha_id', 
    'nikshay_abha_id', 
    'grp_reg/NIKSHAY_ABHA_ID', 
    'NIKSHAY_ABHA_ID'
  ])).toUpperCase();

  // Column 30: Nikshay Registration Date (4-way fallback) - ISO format for Supabase
  const nikshayRegistrationDate = toISODate(getField(payload, [
    'grp_reg/nikshay_registration_date', 
    'nikshay_registration_date', 
    'grp_reg/Date_of_registration_dd_mm_yyyy', 
    'Date_of_registration_dd_mm_yyyy'
  ]));

  // Column 31: Remarks (4-way fallback)
  const remarks = getField(payload, [
    'grp_reg/remarks', 
    'remarks', 
    'grp_reg/Remarks', 
    'Remarks'
  ]);

  // Column 32: KoboUUID
  const koboUuid = payload._uuid || payload.uuid || "";

  // Column 33: KoboID
  const koboId = payload._id || payload.id || "";

  // Column 34: Serial Number (4-way fallback)
  const serialNumber = getField(payload, [
    'grp_screening/Serial_Number', 
    'Serial_Number', 
    'grp_screening/SERIAL_NUMBER', 
    'SERIAL_NUMBER'
  ]);

  // Handle boolean mapping helper
  const parseBool = (v: any): boolean => {
    const s = String(v).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'selected';
  };

  // Additional fields from original Webhook mapping
  const microplanBlock = getField(payload, ['grp_screening/Microplan_Block', 'Microplan_Block']);
  const cbnaatResult = getField(payload, ['grp_tb/CBNAAT_Result', 'CBNAAT_Result']);
  const treatmentRegimen = getField(payload, ['grp_treatment/Treatment_Regimen', 'Treatment_Regimen']);
  const dotsProvider = getField(payload, ['grp_treatment/DOTS_Provider', 'DOTS_Provider']);
  const treatmentStatus = getField(payload, ['grp_treatment/Treatment_Status', 'Treatment_Status']);
  const symptomOtherDetail = getField(payload, ['grp_tb/Symptom_Other_Detail', 'Symptom_Other_Detail']);

  const symptomCough2weeks = parseBool(getField(payload, ['grp_tb/Symptom_Cough_2weeks', 'Symptom_Cough_2weeks']));
  const symptomFever = parseBool(getField(payload, ['grp_tb/Symptom_Fever', 'Symptom_Fever']));
  const symptomNightSweats = parseBool(getField(payload, ['grp_tb/Symptom_Night_Sweats', 'Symptom_Night_Sweats']));
  const symptomWeightLoss = parseBool(getField(payload, ['grp_tb/Symptom_Weight_Loss', 'Symptom_Weight_Loss']));
  const symptomHaemoptysis = parseBool(getField(payload, ['grp_tb/Symptom_Haemoptysis', 'Symptom_Haemoptysis']));
  const symptomChestPain = parseBool(getField(payload, ['grp_tb/Symptom_Chest_Pain', 'Symptom_Chest_Pain']));
  const symptomBreathlessness = parseBool(getField(payload, ['grp_tb/Symptom_Breathlessness', 'Symptom_Breathlessness']));
  const symptomLymphadenopathy = parseBool(getField(payload, ['grp_tb/Symptom_Lymphadenopathy', 'Symptom_Lymphadenopathy']));
  const symptomLossOfAppetite = parseBool(getField(payload, ['grp_tb/Symptom_Loss_of_Appetite', 'Symptom_Loss_of_Appetite']));
  const symptomOther = parseBool(getField(payload, ['grp_tb/Symptom_Other', 'Symptom_Other']));
  const xrayDone = parseBool(getField(payload, ['grp_tb/Xray_Done', 'Xray_Done']));
  const cbnaatDone = parseBool(getField(payload, ['grp_tb/CBNAAT_Done', 'CBNAAT_Done']));
  const referredForDiagnosis = parseBool(getField(payload, ['grp_referral/Referred_for_Diagnosis', 'Referred_for_Diagnosis']));
  const drTb = parseBool(getField(payload, ['grp_treatment/DR_TB', 'DR_TB']));
  const attStarted = parseBool(getField(payload, ['grp_treatment/ATT_Started', 'ATT_Started']));

  // Column 35-36: GPS coordinates (from _geolocation)
  const geo = Array.isArray(payload._geolocation) ? payload._geolocation : [];
  const latitude = geo[0] != null ? parseFloat(String(geo[0])) : null;
  const longitude = geo[1] != null ? parseFloat(String(geo[1])) : null;

  return {
    staff_name: staffName,
    submitted_on: submittedOn,
    state: stateDisplay,
    district: districtRaw,
    facility_name: facilityLabel,
    facility_type: facilityType,
    screening_date: screeningDate,
    unique_id: uniqueId,
    inmate_name: inmateName,
    inmate_type: inmateType,
    father_husband_name: fatherHusbandName,
    date_of_birth: dateOfBirth,
    age: age,
    sex: sex,
    contact_number: contactNumber,
    address: address,
    xray_result: chestXrayResult,  // Fixed: was chest_xray_result
    symptoms_10s: symptoms,
    tb_past_history: tbPastHistory,
    referral_date: referralDate,
    referred_facility: referredFacility,
    tb_diagnosed: tbDiagnosed,
    tb_diagnosis_date: tbDiagnosisDate,
    tb_type: tbType,
    att_start_date: attStartDate,
    att_completion_date: attCompletionDate,
    hiv_status: hivStatus,
    art_status: artStatus,  // Fixed: was art_status_at_referral
    art_number: artNumber,
    nikshay_abha_id: nikshayAbhaId,
    nikshay_registration_date: nikshayRegistrationDate,
    remarks: remarks,
    kobo_uuid: koboUuid,
    kobo_id: koboId,
    serial_number: serialNumber,
    latitude,
    longitude,
    microplan_block: microplanBlock,
    symptom_cough_2weeks: symptomCough2weeks,
    symptom_fever: symptomFever,
    symptom_night_sweats: symptomNightSweats,
    symptom_weight_loss: symptomWeightLoss,
    symptom_haemoptysis: symptomHaemoptysis,
    symptom_chest_pain: symptomChestPain,
    symptom_breathlessness: symptomBreathlessness,
    symptom_lymphadenopathy: symptomLymphadenopathy,
    symptom_loss_of_appetite: symptomLossOfAppetite,
    symptom_other: symptomOther,
    symptom_other_detail: symptomOtherDetail,
    xray_done: xrayDone,
    cbnaat_done: cbnaatDone,
    cbnaat_result: cbnaatResult,
    referred_for_diagnosis: referredForDiagnosis,
    dr_tb: drTb,
    att_started: attStarted,
    treatment_regimen: treatmentRegimen,
    dots_provider: dotsProvider,
    treatment_status: treatmentStatus
  };
}

// =============================================================================
// 4. EXPORTED MAPPINGS FOR REFERENCE
// =============================================================================

export const ALL_MAPPINGS = {
  facilityNameMap: FACILITY_NAME_MAP,
  facilityCodeMap: FACILITY_CODE_MAP,
  facilityTypeMap: FACILITY_TYPE_MAP,
  stateMapping: STATE_MAPPING,
  chestXrayMapping: CHEST_XRAY_MAPPING,
  tbTypeMapping: TB_TYPE_MAPPING,
  inmateTypeMap: INMATE_TYPE_MAP,
  sexMapping: SEX_MAPPING,
  referredFacilityMap: REFERRED_FACILITY_MAP,
  symptomsCodeMapping: SYMPTOMS_CODE_MAPPING,
  yesNoMapping: YES_NO_MAPPING,
  hivMapping: HIV_MAPPING,
  artStatusMapping: ART_STATUS_MAPPING,
  stateCodeMap: STATE_CODE_MAP
};
