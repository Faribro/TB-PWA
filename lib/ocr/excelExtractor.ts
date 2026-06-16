/**
 * lib/ocr/excelExtractor.ts
 *
 * Production-grade Excel/CSV parser for register reconciliation.
 * Produces NormalizedExtractedRow[] — source-agnostic output that feeds
 * directly into the scoped matching pipeline.
 *
 * Features:
 * - Robust header alias matching (English, Hindi, common abbreviations)
 * - Deterministic row fingerprinting for duplicate detection
 * - In-file duplicate flagging (not silently dropped)
 * - Mobile/age sanitization with Indian format awareness
 * - Name normalization (uppercase, whitespace collapse, trim)
 * - Raw input snapshot preserved for audit
 */

import * as XLSX from 'xlsx';
import type {
  NormalizedExtractedRow,
  ExtractionParseResult,
} from '@/lib/reconciliation/sessionTypes';

// ═══════════════════════════════════════════════════════
// Header Alias Dictionaries
// ═══════════════════════════════════════════════════════

const NAME_ALIASES = [
  'name', 'patient name', 'inmate name', 'full name',
  'patient_name', 'inmate_name', 'naam', 'नाम',
  'prisoner name', 'detainee name', 'person name',
];
const FATHER_ALIASES = [
  'father name', 'father_name', 'father husband name',
  'father_husband_name', 's/o', 'w/o', 'd/o',
  'father/husband', 'guardian', 'pita', 'पिता',
];
const AGE_ALIASES = [
  'age', 'age (years)', 'patient age', 'age_years',
  'aayu', 'उम्र', 'age in years', 'umar',
];
const MOBILE_ALIASES = [
  'mobile', 'phone', 'contact', 'mobile no', 'mobile number',
  'phone number', 'contact no', 'mob', 'mob no', 'फोन',
  'contact_number', 'mobile_number', 'phone_no',
];
const WARD_ALIASES = [
  'ward', 'barrack', 'block', 'section', 'facility',
  'ward_name', 'cell', 'unit', 'ward no',
];
const ADDRESS_ALIASES = [
  'address', 'addr', 'home address', 'permanent address',
  'pata', 'पता', 'residential address',
];
const STATE_ALIASES = [
  'state', 'state name', 'screening state', 'screening_state',
  'state_name', 'location state', 'state/province',
];
const DISTRICT_ALIASES = [
  'district', 'district name', 'screening district', 'screening_district',
  'district_name', 'location district', 'tehsil', 'taluka',
];
const FACILITY_ALIASES = [
  'facility', 'facility name', 'facility_name', 'prison name',
  'jail name', 'institution', 'center', 'centre',
];
const SCREENING_DATE_ALIASES = [
  'screening date', 'screening_date', 'date', 'date of screening',
  'examination date', 'test date', 'screening day',
];

// ═══════════════════════════════════════════════════════
// Column Finder
// ═══════════════════════════════════════════════════════

function findColumn(headers: string[], aliases: string[]): number {
  const lower = headers.map((h: any) => h?.toString().toLowerCase().trim() || '');

  // Exact match first
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }

  // Fuzzy: partial/contains match
  for (const alias of aliases) {
    const idx = lower.findIndex((h: string) => h?.includes(alias));
    if (idx !== -1) return idx;
  }

  return -1;
}

// ═══════════════════════════════════════════════════════
// Normalization Helpers
// ═══════════════════════════════════════════════════════

/**
 * Normalize a name: trim, uppercase, collapse whitespace, strip diacritics.
 */
function normalizeName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')       // collapse multi-spaces
    .replace(/[^\w\s]/g, '');   // strip non-word chars except spaces
  return trimmed.length >= 2 ? trimmed : null;
}

/**
 * Normalize mobile to 10-digit Indian format.
 */
function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.toString().replace(/\D/g, '');
  // Extract last 10 digits
  const last10 = digits.slice(-10);
  if (last10.length === 10 && /^[6-9]/.test(last10)) {
    return last10;
  }
  return null;
}

/**
 * Normalize date to YYYY-MM-DD format.
 * Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
 */
function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.toString().trim();
  
  // Try parsing as Excel date serial
  if (/^\d+$/.test(str)) {
    const excelDate = parseInt(str, 10);
    if (excelDate > 0 && excelDate < 100000) {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyy) {
    const [, d, m, y] = ddmmyy;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try native Date parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Sanitize age to integer 1-120.
 */
function sanitizeAge(raw: any): number | null {
  if (raw == null || raw === '') return null;
  const parsed = parseInt(raw.toString().replace(/\D/g, ''), 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 120) return null;
  return parsed;
}

/**
 * Build a deterministic fingerprint for duplicate detection.
 * Format: NORMALIZEDNAME|AGE|MOBILE
 */
function buildFingerprint(
  normalizedName: string | null,
  age: number | null,
  normalizedMobile: string | null,
): string {
  const parts = [
    normalizedName || '_',
    age?.toString() || '_',
    normalizedMobile || '_',
  ];
  return parts.join('|');
}

// ═══════════════════════════════════════════════════════
// Main Extractor
// ═══════════════════════════════════════════════════════

export async function extractFromSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionParseResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Parse workbook from buffer
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellText: true,
    cellDates: true,
  });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file contains no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (raw, no header assumption)
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,     // returns array of arrays
    defval: '',    // empty cells = ''
    blankrows: false,
  });

  if (rawData.length < 2) {
    throw new Error(
      'Spreadsheet has fewer than 2 rows (need header + data)',
    );
  }

  // Scan for the actual header row (handles merged/title rows at top)
  let headerRowIndex = 0;
  let nameCol = -1;
  let fatherCol = -1;
  let ageCol = -1;
  let mobileCol = -1;
  let wardCol = -1;
  let addressCol = -1;
  let stateCol = -1;
  let districtCol = -1;
  let facilityCol = -1;
  let screeningDateCol = -1;

  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const candidateRow = rawData[i].map((h: any) =>
      h?.toString().trim() ?? '',
    );
    const foundNameCol = findColumn(candidateRow, NAME_ALIASES);
    if (foundNameCol !== -1) {
      headerRowIndex = i;
      nameCol = foundNameCol;
      fatherCol = findColumn(candidateRow, FATHER_ALIASES);
      ageCol = findColumn(candidateRow, AGE_ALIASES);
      mobileCol = findColumn(candidateRow, MOBILE_ALIASES);
      wardCol = findColumn(candidateRow, WARD_ALIASES);
      addressCol = findColumn(candidateRow, ADDRESS_ALIASES);
      stateCol = findColumn(candidateRow, STATE_ALIASES);
      districtCol = findColumn(candidateRow, DISTRICT_ALIASES);
      facilityCol = findColumn(candidateRow, FACILITY_ALIASES);
      screeningDateCol = findColumn(candidateRow, SCREENING_DATE_ALIASES);
      break;
    }
  }

  if (nameCol === -1) {
    throw new Error(
      `Could not find Name column in the first 15 rows. ` +
      `First row: ${rawData.length > 0 ? rawData[0].join(', ') : 'Empty file'}`,
    );
  }

  const dataRows = rawData.slice(headerRowIndex + 1);

  // Track fingerprints for in-file duplicate detection
  const fingerprintMap = new Map<string, number>(); // fingerprint → first sno
  let invalidCount = 0;
  let duplicatesInFile = 0;

  // Build NormalizedExtractedRow array
  const rows: NormalizedExtractedRow[] = [];
  let snoCounter = 0;

  for (const row of dataRows) {
    const rawName = row[nameCol]?.toString().trim() ?? '';
    if (!rawName || rawName.length < 2) {
      invalidCount++;
      continue;
    }

    snoCounter++;
    const sno = snoCounter;

    const rawFather = fatherCol !== -1
      ? row[fatherCol]?.toString().trim() || null
      : null;
    const rawAge = ageCol !== -1
      ? row[ageCol]?.toString().trim() || null
      : null;
    const rawMobile = mobileCol !== -1
      ? row[mobileCol]?.toString().trim() || null
      : null;
    const rawWard = wardCol !== -1
      ? row[wardCol]?.toString().trim() || null
      : null;
    const rawAddress = addressCol !== -1
      ? row[addressCol]?.toString().trim() || null
      : null;
    const rawState = stateCol !== -1
      ? row[stateCol]?.toString().trim() || null
      : null;
    const rawDistrict = districtCol !== -1
      ? row[districtCol]?.toString().trim() || null
      : null;
    const rawFacility = facilityCol !== -1
      ? row[facilityCol]?.toString().trim() || null
      : null;
    const rawScreeningDate = screeningDateCol !== -1
      ? row[screeningDateCol]?.toString().trim() || null
      : null;

    // Normalize fields
    const normalizedNameVal = normalizeName(rawName);
    const age = sanitizeAge(rawAge);
    const normalizedMobileVal = normalizeMobile(rawMobile);
    const fingerprint = buildFingerprint(normalizedNameVal, age, normalizedMobileVal);

    // Check for duplicate within file
    let isDuplicateInFile = false;
    let duplicateOfSno: number | null = null;
    const existingFpSno = fingerprintMap.get(fingerprint);

    if (existingFpSno != null) {
      isDuplicateInFile = true;
      duplicateOfSno = existingFpSno;
      duplicatesInFile++;
    } else {
      fingerprintMap.set(fingerprint, sno);
    }

    rows.push({
      sno,
      name: rawName,
      normalizedName: normalizedNameVal,
      father_name: rawFather
        ? rawFather.toUpperCase().replace(/\s+/g, ' ').trim()
        : null,
      age,
      mobile: rawMobile,
      normalizedMobile: normalizedMobileVal,
      ward: rawWard?.toUpperCase() || null,
      address: rawAddress?.toUpperCase() || null,
      state: rawState?.toUpperCase() || null,
      district: rawDistrict?.toUpperCase() || null,
      facility: rawFacility?.toUpperCase() || null,
      screening_date: normalizeDate(rawScreeningDate),
      confidence_score: 1.0, // deterministic digital source
      rowFingerprint: fingerprint,
      rawInputSnapshot: {
        name: rawName,
        father_name: rawFather,
        age: rawAge,
        mobile: rawMobile,
        ward: rawWard,
        address: rawAddress,
        state: rawState,
        district: rawDistrict,
        facility: rawFacility,
        screening_date: rawScreeningDate,
      },
      isDuplicateInFile,
      duplicateOfSno,
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid patient rows found in spreadsheet');
  }

  // Build warnings
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} row(s) skipped due to missing/invalid name`);
  }
  if (duplicatesInFile > 0) {
    warnings.push(
      `${duplicatesInFile} duplicate row(s) detected within the uploaded file`,
    );
  }
  if (fatherCol === -1) {
    warnings.push('Father/Husband name column not detected');
  }
  if (mobileCol === -1) {
    warnings.push('Mobile number column not detected');
  }
  if (ageCol === -1) {
    warnings.push('Age column not detected');
  }

  return {
    rows,
    summary: {
      totalRowsParsed: dataRows.length,
      validRows: rows.length,
      invalidRows: invalidCount,
      duplicatesInFile,
    },
    engine: 'excel',
    sourceType: 'spreadsheet',
    latencyMs: Date.now() - startTime,
    warnings,
  };
}
