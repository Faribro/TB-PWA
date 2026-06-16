/**
 * lib/reconciliation/registerContextValidator.ts
 *
 * Production-grade register context validation for scope enforcement.
 * Prevents wrong-state/wrong-facility/wrong-date registers from entering reconciliation.
 */

import type { NormalizedExtractedRow } from './sessionTypes';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface RegisterContext {
  state: string | null;
  district: string | null;
  facility: string | null;
  screeningDate: string | null;
}

export interface SessionContext {
  screeningState: string | null;
  screeningDistrict: string | null;
  facilityName: string | null;
  screeningDate: string | null;
}

export interface ContextMismatch {
  field: 'state' | 'district' | 'facility' | 'screeningDate';
  registerValue: string;
  sessionValue: string;
  rowNumbers: number[];
}

export interface ValidationResult {
  isValid: boolean;
  mismatches: ContextMismatch[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════
// Normalization Helpers
// ═══════════════════════════════════════════════════════

/**
 * Normalize location string: uppercase, trim, collapse whitespace, remove special chars
 */
function normalizeLocation(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  return value
    .toString()
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const str = value.toString().trim();
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try native parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════
// Context Extraction
// ═══════════════════════════════════════════════════════

/**
 * Extract register context from parsed rows.
 * Returns majority-vote context and flags mixed-context rows.
 */
export function extractRegisterContext(
  rows: NormalizedExtractedRow[]
): {
  context: RegisterContext;
  mixedContextRows: Array<{ sno: number; field: string; value: string }>;
} {
  if (rows.length === 0) {
    return {
      context: { state: null, district: null, facility: null, screeningDate: null },
      mixedContextRows: [],
    };
  }

  // Count occurrences of each value per field
  const stateCounts = new Map<string, number[]>();
  const districtCounts = new Map<string, number[]>();
  const facilityCounts = new Map<string, number[]>();
  const dateCounts = new Map<string, number[]>();

  for (const row of rows) {
    const state = normalizeLocation(row.state);
    const district = normalizeLocation(row.district);
    const facility = normalizeLocation(row.facility);
    const date = normalizeDate(row.screening_date);

    if (state) {
      if (!stateCounts.has(state)) stateCounts.set(state, []);
      stateCounts.get(state)!.push(row.sno);
    }
    if (district) {
      if (!districtCounts.has(district)) districtCounts.set(district, []);
      districtCounts.get(district)!.push(row.sno);
    }
    if (facility) {
      if (!facilityCounts.has(facility)) facilityCounts.set(facility, []);
      facilityCounts.get(facility)!.push(row.sno);
    }
    if (date) {
      if (!dateCounts.has(date)) dateCounts.set(date, []);
      dateCounts.get(date)!.push(row.sno);
    }
  }

  // Get majority value (most common)
  const getMajority = (counts: Map<string, number[]>) => {
    if (counts.size === 0) return null;
    let maxCount = 0;
    let majority: string | null = null;
    for (const [value, snos] of counts.entries()) {
      if (snos.length > maxCount) {
        maxCount = snos.length;
        majority = value;
      }
    }
    return majority;
  };

  const context: RegisterContext = {
    state: getMajority(stateCounts),
    district: getMajority(districtCounts),
    facility: getMajority(facilityCounts),
    screeningDate: getMajority(dateCounts),
  };

  // Detect mixed-context rows (rows that disagree with majority)
  const mixedContextRows: Array<{ sno: number; field: string; value: string }> = [];

  for (const row of rows) {
    const state = normalizeLocation(row.state);
    const district = normalizeLocation(row.district);
    const facility = normalizeLocation(row.facility);
    const date = normalizeDate(row.screening_date);

    if (state && context.state && state !== context.state) {
      mixedContextRows.push({ sno: row.sno, field: 'state', value: state });
    }
    if (district && context.district && district !== context.district) {
      mixedContextRows.push({ sno: row.sno, field: 'district', value: district });
    }
    if (facility && context.facility && facility !== context.facility) {
      mixedContextRows.push({ sno: row.sno, field: 'facility', value: facility });
    }
    if (date && context.screeningDate && date !== context.screeningDate) {
      mixedContextRows.push({ sno: row.sno, field: 'screeningDate', value: date });
    }
  }

  return { context, mixedContextRows };
}

// ═══════════════════════════════════════════════════════
// Context Validation
// ═══════════════════════════════════════════════════════

/**
 * Validate register context against session context.
 * Returns structured mismatches for frontend consumption.
 */
export function validateRegisterContext(
  registerContext: RegisterContext,
  sessionContext: SessionContext
): ValidationResult {
  const mismatches: ContextMismatch[] = [];
  const warnings: string[] = [];

  // Normalize session context
  const normalizedSession = {
    state: normalizeLocation(sessionContext.screeningState),
    district: normalizeLocation(sessionContext.screeningDistrict),
    facility: normalizeLocation(sessionContext.facilityName),
    date: normalizeDate(sessionContext.screeningDate),
  };

  // Validate state
  if (registerContext.state && normalizedSession.state) {
    if (registerContext.state !== normalizedSession.state) {
      mismatches.push({
        field: 'state',
        registerValue: registerContext.state,
        sessionValue: normalizedSession.state,
        rowNumbers: [],
      });
    }
  } else if (registerContext.state && !normalizedSession.state) {
    warnings.push('Register has state context but session does not specify state filter');
  } else if (!registerContext.state && normalizedSession.state) {
    warnings.push('Session specifies state filter but register has no state column');
  }

  // Validate district
  if (registerContext.district && normalizedSession.district) {
    if (registerContext.district !== normalizedSession.district) {
      mismatches.push({
        field: 'district',
        registerValue: registerContext.district,
        sessionValue: normalizedSession.district,
        rowNumbers: [],
      });
    }
  } else if (registerContext.district && !normalizedSession.district) {
    warnings.push('Register has district context but session does not specify district filter');
  } else if (!registerContext.district && normalizedSession.district) {
    warnings.push('Session specifies district filter but register has no district column');
  }

  // Validate facility
  if (registerContext.facility && normalizedSession.facility) {
    if (registerContext.facility !== normalizedSession.facility) {
      mismatches.push({
        field: 'facility',
        registerValue: registerContext.facility,
        sessionValue: normalizedSession.facility,
        rowNumbers: [],
      });
    }
  } else if (registerContext.facility && !normalizedSession.facility) {
    warnings.push('Register has facility context but session does not specify facility filter');
  } else if (!registerContext.facility && normalizedSession.facility) {
    warnings.push('Session specifies facility filter but register has no facility column');
  }

  // Validate screening date (REQUIRED)
  if (registerContext.screeningDate && normalizedSession.date) {
    if (registerContext.screeningDate !== normalizedSession.date) {
      mismatches.push({
        field: 'screeningDate',
        registerValue: registerContext.screeningDate,
        sessionValue: normalizedSession.date,
        rowNumbers: [],
      });
    }
  } else if (!registerContext.screeningDate && normalizedSession.date) {
    warnings.push('Session specifies screening date but register has no date column');
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════
// Error Response Builder
// ═══════════════════════════════════════════════════════

export interface ContextValidationError {
  error: string;
  code: 'CONTEXT_MISMATCH' | 'MIXED_CONTEXT';
  mismatches: ContextMismatch[];
  mixedContextRows?: Array<{ sno: number; field: string; value: string }>;
  warnings: string[];
}

/**
 * Build structured error response for API
 */
export function buildValidationErrorResponse(
  validation: ValidationResult,
  mixedContextRows: Array<{ sno: number; field: string; value: string }>
): ContextValidationError {
  const primaryMismatch = validation.mismatches[0];
  
  let errorMessage = 'Register context does not match selected scope';
  if (primaryMismatch) {
    const fieldLabel = {
      state: 'State',
      district: 'District',
      facility: 'Facility',
      screeningDate: 'Screening Date',
    }[primaryMismatch.field];
    
    errorMessage = `Register ${fieldLabel.toLowerCase()} (${primaryMismatch.registerValue}) does not match selected ${fieldLabel.toLowerCase()} (${primaryMismatch.sessionValue})`;
  }

  return {
    error: errorMessage,
    code: mixedContextRows.length > 0 ? 'MIXED_CONTEXT' : 'CONTEXT_MISMATCH',
    mismatches: validation.mismatches,
    mixedContextRows: mixedContextRows.length > 0 ? mixedContextRows : undefined,
    warnings: validation.warnings,
  };
}
