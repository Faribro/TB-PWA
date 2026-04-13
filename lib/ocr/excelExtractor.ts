import * as XLSX from 'xlsx'
import type { HybridExtractionResult } from './hybridExtractor'
import type { ExtractedRow } from './geminiExtractor'

// Column name aliases to find Name / Age / Mobile
// regardless of how the source spreadsheet labels them
const NAME_ALIASES = [
  'name', 'patient name', 'inmate name', 'full name',
  'patient_name', 'inmate_name', 'naam', 'नाम'
]
const AGE_ALIASES = [
  'age', 'age (years)', 'patient age', 'age_years',
  'aayu', 'उम्र', 'age in years'
]
const MOBILE_ALIASES = [
  'mobile', 'phone', 'contact', 'mobile no', 'mobile number',
  'phone number', 'contact no', 'mob', 'mob no', 'फोन'
]

function findColumn(
  headers: string[],
  aliases: string[]
): number {
  const lower = headers.map((h: any) => h?.toString().toLowerCase().trim() || '')
  for (const alias of aliases) {
    const idx = lower.indexOf(alias)
    if (idx !== -1) return idx
  }
  // Fuzzy: partial match
  for (const alias of aliases) {
    const idx = lower.findIndex((h: string) => h?.includes(alias))
    if (idx !== -1) return idx
  }
  return -1
}

export async function extractFromSpreadsheet(
  buffer: Buffer,
  filename: string
): Promise<any> {
  // Parse workbook from buffer
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellText: true,
    cellDates: true
  })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel file contains no sheets')
  }

  const worksheet = workbook.Sheets[sheetName]

  // Convert to array of arrays (raw, no header assumption)
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,     // returns array of arrays
    defval: '',    // empty cells = ''
    blankrows: false
  })

  if (rawData.length < 2) {
    throw new Error(
      'Spreadsheet has fewer than 2 rows (need header + data)'
    )
  }

  // Scan for the actual header row (sometimes Excel files have titles/merged rows at the top)
  let headerRowIndex = 0;
  let nameCol = -1;
  let ageCol = -1;
  let mobileCol = -1;
  let headerRow: string[] = [];

  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const candidateRow = rawData[i].map((h: any) => h?.toString().trim() ?? '');
    const foundNameCol = findColumn(candidateRow, NAME_ALIASES);
    if (foundNameCol !== -1) {
      headerRowIndex = i;
      headerRow = candidateRow;
      nameCol = foundNameCol;
      ageCol = findColumn(candidateRow, AGE_ALIASES);
      mobileCol = findColumn(candidateRow, MOBILE_ALIASES);
      break;
    }
  }

  if (nameCol === -1) {
    throw new Error(
      `Could not find Name column in the first 15 rows. First row found: ${rawData.length > 0 ? rawData[0].join(', ') : 'Empty file'}`
    );
  }

  const dataRows = rawData.slice(headerRowIndex + 1);

  // Build ExtractedRow array
  const rows = dataRows
    .filter((row: any) => row[nameCol]?.toString().trim())  // skip empty name rows
    .map((row: any, index: number) => {
      const rawName = row[nameCol]?.toString().trim() ?? ''
      const rawAge  = ageCol !== -1
        ? row[ageCol]?.toString().trim()
        : undefined
      const rawMob  = mobileCol !== -1
        ? row[mobileCol]?.toString().trim()
        : undefined

      // Sanitize age — must be numeric 1–120
      const age = rawAge
        ? parseInt(rawAge.replace(/\\D/g, ''), 10)
        : undefined
      const sanitizedAge =
        age && age > 0 && age <= 120 ? age : null

      // Sanitize mobile — Indian 10-digit
      const sanitizedMobile = rawMob
        ? rawMob.replace(/\\D/g, '').slice(-10)
        : null

      return {
        sno:              index + 1,
        name:             rawName,
        father_name:      null,
        age:              sanitizedAge,
        ward:             null,
        address:          null,
        mobile:           sanitizedMobile,
        confidence_score: 1.0,     // deterministic digital source
      } as ExtractedRow
    })

  if (rows.length === 0) {
    throw new Error('No valid patient rows found in spreadsheet')
  }

  return {
    rows,
    confidence: 1.0,
    engine: 'excel',
    cost: 0,
    latencyMs: 0,
    modelVersion: 'xlsx'
  }
}
