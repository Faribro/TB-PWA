import { google } from 'googleapis';

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC UTILITY
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Patient Linelist_TB';

// Exact 35-column order matching Google Sheets headers
const COLUMN_ORDER = [
  'staff_name',
  'submitted_on',
  'screening_state',
  'screening_district',
  'facility_name',
  'facility_type',
  'screening_date',
  'unique_id',
  'inmate_name',
  'inmate_type',
  'father_husband_name',
  'date_of_birth',
  'age',
  'sex',
  'contact_number',
  'address',
  'xray_result',
  'symptoms_10s',
  'tb_past_history',
  'referral_date',
  'referred_facility',
  'tb_diagnosed',
  'tb_diagnosis_date',
  'tb_type',
  'att_start_date',
  'att_completion_date',
  'hiv_status',
  'art_status',
  'art_number',
  'nikshay_abha_id',
  'registration_date',
  'remarks',
  'kobo_uuid',
  'kobo_id',
  'serial_number'
] as const;

export interface PatientRecord {
  id?: string;
  staff_name?: string | null;
  submitted_on?: string | null;
  screening_state?: string | null;
  screening_district?: string | null;
  facility_name?: string | null;
  facility_type?: string | null;
  screening_date?: string | null;
  unique_id?: string | null;
  inmate_name?: string | null;
  inmate_type?: string | null;
  father_husband_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  sex?: string | null;
  contact_number?: string | null;
  address?: string | null;
  xray_result?: string | null;
  symptoms_10s?: string | null;
  tb_past_history?: string | null;
  referral_date?: string | null;
  referred_facility?: string | null;
  tb_diagnosed?: string | null;
  tb_diagnosis_date?: string | null;
  tb_type?: string | null;
  att_start_date?: string | null;
  att_completion_date?: string | null;
  hiv_status?: string | null;
  art_status?: string | null;
  art_number?: string | null;
  nikshay_abha_id?: string | null;
  registration_date?: string | null;
  remarks?: string | null;
  kobo_uuid?: string | null;
  kobo_id?: string | null;
  serial_number?: string | null;
  [key: string]: any;
}

export interface SheetsSyncResult {
  success: boolean;
  message: string;
  rowsAppended?: number;
  error?: string;
}

/**
 * Initialize Google Sheets API client
 */
function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (error) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON format');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Format date to dd/mm/yyyy for Google Sheets
 */
function formatDateForSheets(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format submitted_on timestamp to dd/mm/yy at HH:MM AM/PM
 */
function formatSubmittedOn(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
}

/**
 * Map Supabase patient record to Google Sheets row (35 columns)
 */
function mapPatientToSheetRow(patient: PatientRecord): any[] {
  const row: any[] = [];
  
  for (const column of COLUMN_ORDER) {
    let value = patient[column];
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      row.push('');
      continue;
    }
    
    // Special formatting for dates
    if (column === 'submitted_on') {
      row.push(formatSubmittedOn(String(value)));
    } else if (
      column === 'screening_date' ||
      column === 'date_of_birth' ||
      column === 'referral_date' ||
      column === 'tb_diagnosis_date' ||
      column === 'att_start_date' ||
      column === 'att_completion_date' ||
      column === 'registration_date'
    ) {
      row.push(formatDateForSheets(String(value)));
    } else {
      // Convert to string, handle numbers
      row.push(String(value));
    }
  }
  
  return row;
}

/**
 * Append patient record to Google Sheets
 */
export async function appendPatientToSheets(
  patient: PatientRecord
): Promise<SheetsSyncResult> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    const sheets = getGoogleSheetsClient();
    const row = mapPatientToSheetRow(patient);

    console.log('[sheetsSync] Appending row to Google Sheets:', {
      spreadsheetId,
      sheetName: SHEET_NAME,
      patientId: patient.id,
      koboUuid: patient.kobo_uuid,
      uniqueId: patient.unique_id,
      rowLength: row.length
    });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:AI`, // A to AI = 35 columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });

    const updatedRows = response.data.updates?.updatedRows || 0;

    console.log('[sheetsSync] ✅ Successfully appended to Google Sheets:', {
      updatedRows,
      updatedRange: response.data.updates?.updatedRange
    });

    return {
      success: true,
      message: `Row appended successfully`,
      rowsAppended: updatedRows
    };

  } catch (error: any) {
    console.error('[sheetsSync] ❌ Error appending to Google Sheets:', error);
    
    return {
      success: false,
      message: 'Failed to append to Google Sheets',
      error: error.message || String(error)
    };
  }
}

/**
 * Update existing row in Google Sheets by kobo_uuid
 */
export async function updatePatientInSheets(
  patient: PatientRecord
): Promise<SheetsSyncResult> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    const sheets = getGoogleSheetsClient();
    
    // Find row by kobo_uuid (column 33, index AG)
    const searchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!AG:AG` // kobo_uuid column
    });

    const rows = searchResponse.data.values || [];
    const koboUuid = patient.kobo_uuid;
    
    if (!koboUuid) {
      // If no kobo_uuid, append as new row
      return appendPatientToSheets(patient);
    }

    const rowIndex = rows.findIndex(row => row[0] === koboUuid);

    if (rowIndex === -1) {
      // Row not found, append as new
      console.log('[sheetsSync] kobo_uuid not found, appending new row');
      return appendPatientToSheets(patient);
    }

    // Update existing row (rowIndex is 0-based, sheet rows are 1-based + header)
    const sheetRowNumber = rowIndex + 2; // +1 for 0-index, +1 for header
    const row = mapPatientToSheetRow(patient);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A${sheetRowNumber}:AI${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log('[sheetsSync] ✅ Successfully updated row in Google Sheets:', {
      rowNumber: sheetRowNumber,
      koboUuid
    });

    return {
      success: true,
      message: `Row ${sheetRowNumber} updated successfully`,
      rowsAppended: 1
    };

  } catch (error: any) {
    console.error('[sheetsSync] ❌ Error updating Google Sheets:', error);
    
    return {
      success: false,
      message: 'Failed to update Google Sheets',
      error: error.message || String(error)
    };
  }
}

/**
 * Batch append multiple patients to Google Sheets
 */
export async function batchAppendPatientsToSheets(
  patients: PatientRecord[]
): Promise<SheetsSyncResult> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    if (patients.length === 0) {
      return {
        success: true,
        message: 'No patients to sync',
        rowsAppended: 0
      };
    }

    const sheets = getGoogleSheetsClient();
    const rows = patients.map(patient => mapPatientToSheetRow(patient));

    console.log('[sheetsSync] Batch appending to Google Sheets:', {
      spreadsheetId,
      sheetName: SHEET_NAME,
      patientCount: patients.length
    });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:AI`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows
      }
    });

    const updatedRows = response.data.updates?.updatedRows || 0;

    console.log('[sheetsSync] ✅ Batch append successful:', {
      updatedRows,
      updatedRange: response.data.updates?.updatedRange
    });

    return {
      success: true,
      message: `${updatedRows} rows appended successfully`,
      rowsAppended: updatedRows
    };

  } catch (error: any) {
    console.error('[sheetsSync] ❌ Batch append error:', error);
    
    return {
      success: false,
      message: 'Failed to batch append to Google Sheets',
      error: error.message || String(error)
    };
  }
}
