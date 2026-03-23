/**
 * PII Shield - Data Sanitizer
 * Strips personally identifiable information before sending data to AI APIs
 * Complies with data privacy regulations and prevents PII leakage
 */

interface SanitizedDistrict {
  district: string;
  state: string;
  screened: number;
  diagnosed: number;
  breachCount: number;
  breachRate: number;
  facilityCount?: number;
}

interface SanitizedPatient {
  id: number;
  screening_district: string;
  screening_state: string;
  screening_date: string;
  current_phase: string;
  tb_diagnosed: string | null;
  xray_result: string;
  age?: number;
  sex?: string;
}

/**
 * PII fields that must be stripped from all data
 */
const PII_FIELDS = [
  // Personal identifiers
  'inmate_name',
  'unique_id',
  'kobo_uuid',
  'nikshay_id',
  'art_number',
  'abha_id',
  
  // Contact information
  'contact_number',
  'phone',
  'mobile',
  'email',
  'address',
  'father_name',
  'mother_name',
  'guardian_name',
  
  // Precise location data
  'gps_coordinates',
  'latitude',
  'longitude',
  'facility_address',
  'exact_location',
  
  // Staff identifiers
  'staff_name',
  'staff_id',
  'submitted_by',
  'created_by',
  'updated_by',
];

/**
 * Sanitize district-level aggregated data for AI analysis
 * Only returns aggregated metrics and broad geographic names
 */
export function sanitizeDistrictData(districts: any[]): SanitizedDistrict[] {
  if (!Array.isArray(districts)) return [];
  
  return districts.map(d => ({
    district: d.district || 'Unknown',
    state: d.state || d.screening_state || 'Unknown',
    screened: Number(d.screened) || 0,
    diagnosed: Number(d.diagnosed) || 0,
    breachCount: Number(d.breachCount) || 0,
    breachRate: Number(d.breachRate) || 0,
    facilityCount: Number(d.facilityCount) || 0,
  }));
}

/**
 * Sanitize patient-level data for AI analysis
 * Strips all PII while preserving clinical and operational data
 */
export function sanitizePatientData(patients: any[]): SanitizedPatient[] {
  if (!Array.isArray(patients)) return [];
  
  return patients.map(p => {
    const sanitized: SanitizedPatient = {
      id: p.id,
      screening_district: p.screening_district || 'Unknown',
      screening_state: p.screening_state || 'Unknown',
      screening_date: p.screening_date || p.submitted_on || '',
      current_phase: p.current_phase || 'Unknown',
      tb_diagnosed: p.tb_diagnosed,
      xray_result: p.xray_result || p.chest_x_ray_result || 'Unknown',
    };
    
    // Only include age/sex if present (demographic aggregates, not identifiers)
    if (p.age) sanitized.age = Number(p.age);
    if (p.sex) sanitized.sex = p.sex;
    
    return sanitized;
  });
}

/**
 * Generic sanitizer - removes all PII fields from any object
 */
export function stripPII<T extends Record<string, any>>(data: T): Partial<T> {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip PII fields
    if (PII_FIELDS.includes(key.toLowerCase())) continue;
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = stripPII(value);
    } 
    // Recursively sanitize arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? stripPII(item) : item
      );
    } 
    // Keep non-PII primitive values
    else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Master sanitizer for AI API calls
 * Automatically detects data type and applies appropriate sanitization
 */
export function sanitizeForAI(data: any): any {
  if (!data) return null;
  
  // Handle arrays
  if (Array.isArray(data)) {
    // Detect if it's district data (has aggregated metrics)
    if (data.length > 0 && 'breachCount' in data[0]) {
      return sanitizeDistrictData(data);
    }
    // Detect if it's patient data (has screening_date)
    if (data.length > 0 && 'screening_date' in data[0]) {
      return sanitizePatientData(data);
    }
    // Generic array sanitization
    return data.map(item => stripPII(item));
  }
  
  // Handle single objects
  return stripPII(data);
}

/**
 * Validate that data is properly sanitized
 * Returns true if no PII fields are detected
 */
export function validateSanitization(data: any): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  const checkObject = (obj: any, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if key is a PII field
      if (PII_FIELDS.includes(key.toLowerCase())) {
        violations.push(currentPath);
      }
      
      // Recursively check nested objects
      if (value && typeof value === 'object') {
        checkObject(value, currentPath);
      }
    }
  };
  
  if (Array.isArray(data)) {
    data.forEach((item, index) => checkObject(item, `[${index}]`));
  } else {
    checkObject(data);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Log sanitization metrics for monitoring
 */
export function logSanitizationMetrics(
  originalSize: number,
  sanitizedSize: number,
  dataType: string
) {
  const reduction = ((originalSize - sanitizedSize) / originalSize * 100).toFixed(1);
  
  console.log(`[PII Shield] ${dataType} sanitized:`, {
    originalFields: originalSize,
    sanitizedFields: sanitizedSize,
    reduction: `${reduction}%`,
    timestamp: new Date().toISOString(),
  });
}
