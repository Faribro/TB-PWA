import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionScope } from '@/lib/session-scope';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Google Apps Script Web App URL (set this in your .env.local)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL || '';

// Definitive list of 32 Google Sheet column headers (EXACT match required)
const GOOGLE_SHEET_HEADERS = [
  'Serial Number',
  'KoboUUID',
  'KoboID',
  'Name of the staff',
  'State',
  'District',
  'Name of the facility',
  'Type of facility',
  'Type of inmate',
  'Name of the inmate',
  'Father/Husband Name',
  'Age',
  'Sex',
  'Date of Birth (dd/mm/yyyy)',
  'Contact Number',
  'Address',
  'Date of Screening (dd/mm/yyyy)',
  'Chest X-ray Result',
  '10s Symptoms Present',
  'Past TB History',
  'Date of referral for TB Examination (sputum) (dd/mm/yy)',
  'Name of facility where referred to (Give code/name of all facilities)',
  'TB diagnosed (Y/N)',
  'Date of TB Diagnosed (dd/mm/yy)',
  'Type of TB Diagnosed (P/EP)',
  'Date of starting ATT (dd/mm/yyyy)',
  'Date of Treatment Completion (dd/mm/yyyy)',
  'HIV Status (Positive/Negative/Unknown)',
  'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]',
  'ART Number (if on ART at the time of referral)',
  'NIKSHAY/ABHA ID',
  'Date of registration (dd/mm/yyyy)',
  'Remarks'
];

export async function POST(request: NextRequest) {
  try {
    // Auth + ownership check with Service Role Key bypass for server-to-server calls
    let scope;
    let isServiceRoleAuth = false;
    
    // Check for Service Role Key in Authorization header (server-to-server bypass)
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      // Service role authentication - bypass session check
      isServiceRoleAuth = true;
      scope = { state: null, district: null, role: 'service' }; // No ownership restrictions
      console.log('[patient-sync] Service role authentication - bypassing session check');
    } else {
      // Regular user authentication
      try {
        scope = await getSessionScope();
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { patientId, koboUuid, updates } = body;

    console.log('[patient-sync] Request received:', { patientId, koboUuid, updateKeys: Object.keys(updates) });

    if (!patientId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId and updates' },
        { status: 400 }
      );
    }

    // Step A: Update Supabase (handle all fields dynamically)
    const supabaseUpdates: any = {};

    // Map form fields to database columns (using ACTUAL Supabase column names)
    const fieldMapping: Record<string, string> = {
      'inmate_name': 'inmate_name',
      'age': 'age',
      'sex': 'sex',
      'contact_number': 'contact_number',
      'address': 'address',
      'facility_name': 'facility_name',
      'dob': 'date_of_birth',
      'date_of_birth': 'date_of_birth',
      'screening_date': 'screening_date',
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
      'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
      'TB diagnosed (Y/N)': 'tb_diagnosed',
      'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
      'Type of TB Diagnosed (P/EP)': 'tb_type',
      'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
      'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
      'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
      'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]': 'art_status',
      'ART Number (if on ART at the time of referral)': 'art_number',
      'NIKSHAY/ABHA ID': 'nikshay_abha_id',
      'Date of registration (dd/mm/yyyy)': 'registration_date',
      'Remarks': 'remarks',
      'closure_reason': 'closure_reason',
      // Google Sheets identifiers - skip for Supabase
      'Serial Number': null,
      'KoboUUID': null,
      'KoboID': null
    };

    // Map updates to database columns (skip null mappings)
    Object.keys(updates).forEach(key => {
      const dbColumn = fieldMapping[key];
      
      // Skip if mapping is explicitly null (Google Sheets only fields)
      if (dbColumn === null) {
        return;
      }
      
      // Use mapped column or original key
      const columnName = dbColumn || key;
      
      if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
        supabaseUpdates[columnName] = updates[key];
      }
    });

    console.log('[patient-sync] Supabase updates:', supabaseUpdates);

    let updateQuery = supabase
      .from('patients')
      .update(supabaseUpdates)
      .eq('id', patientId);

    // Ownership guard: non-admins can only update patients in their own state
    // Skip ownership check for service role authentication
    if (!isServiceRoleAuth && scope.state) {
      updateQuery = updateQuery.eq('screening_state', scope.state);
    }

    const { data: supabaseData, error: supabaseError } = await updateQuery
      .select()
      .single();

    if (supabaseError) {
      console.error('[patient-sync] Supabase error:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to update Supabase', details: supabaseError.message },
        { status: 500 }
      );
    }

    console.log('[patient-sync] Supabase success, updated patient:', supabaseData?.id);

    // Step B: Forward to Google Apps Script (with timeout handling)
    let googleSheetsResult: { success: boolean; message: string; data?: any } = { 
      success: false, 
      message: 'Webhook not configured' 
    };
    
    if (GOOGLE_SCRIPT_URL && koboUuid) {
      try {
        // FUZZY KEY NORMALIZATION: Sanitize and filter keys
        const normalizedUpdates: Record<string, any> = {};
        
        Object.keys(updates).forEach(key => {
          // Step 1: Trim whitespace
          const trimmedKey = key.trim();
          
          // Step 2: Fuzzy match - treat (dd/mm/yyyy) and (dd/mm/yy) as identical
          let matchedKey = trimmedKey;
          
          // Check if key exists in allowed headers (exact match first)
          if (GOOGLE_SHEET_HEADERS.includes(trimmedKey)) {
            matchedKey = trimmedKey;
          } else {
            // Try fuzzy matching for date format variations
            const fuzzyMatch = GOOGLE_SHEET_HEADERS.find(header => {
              const normalizedHeader = header.replace(/\(dd\/mm\/yyyy\)/g, '(dd/mm/yy)').replace(/\(dd\/mm\/yy\)/g, '(dd/mm/yyyy)');
              const normalizedKey = trimmedKey.replace(/\(dd\/mm\/yyyy\)/g, '(dd/mm/yy)').replace(/\(dd\/mm\/yy\)/g, '(dd/mm/yyyy)');
              return normalizedHeader === normalizedKey || header === trimmedKey;
            });
            
            if (fuzzyMatch) {
              matchedKey = fuzzyMatch; // Use the exact header name from sheet
            } else {
              // Step 3: Skip keys not in the 32-column list (local UI state)
              console.log(`⚠️ Skipping key not in Google Sheet headers: "${trimmedKey}"`);
              return;
            }
          }
          
          // Only add non-empty values
          if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
            normalizedUpdates[matchedKey] = updates[key];
          }
        });

        const webhookPayload = {
          action: 'update_patient',
          uuid: koboUuid,
          updates: normalizedUpdates
        };

        // CRITICAL DEBUG LOG: Print exact payload being sent
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚀 SENDING TO GOOGLE SHEETS:');
        console.log('UUID:', koboUuid);
        console.log('Payload Keys:', Object.keys(normalizedUpdates));
        console.log('Full Payload:', JSON.stringify(webhookPayload, null, 2));
        console.log('═══════════════════════════════════════════════════════════');

        const webhookResponse = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        const responseText = await webhookResponse.text();
        console.log('📥 Google Sheets Response:', responseText);

        if (webhookResponse.ok) {
          try {
            const webhookData = JSON.parse(responseText);
            
            // Extract actual row count from response
            const rowsUpdated = webhookData.rowsUpdated || webhookData.updated || 0;
            const actualSuccess = webhookData.success !== false && rowsUpdated >= 0;
            
            googleSheetsResult = {
              success: actualSuccess,
              message: webhookData.message || `Google Sheets ${rowsUpdated > 0 ? 'updated' : 'processed'}: ${rowsUpdated} row(s)`,
              data: {
                ...webhookData,
                rowsUpdated // Normalize the field name
              }
            };
            
            // Log warning if no rows were updated
            if (rowsUpdated === 0) {
              console.warn('⚠️ Google Sheets returned 0 rows updated - UUID may not exist in sheet');
            }
          } catch {
            // Non-JSON response (likely plain text success message)
            googleSheetsResult = {
              success: true,
              message: responseText || 'Google Sheets updated successfully',
              data: { response: responseText, rowsUpdated: 1 }
            };
          }
        } else {
          console.error('❌ Google Sheets Error:', webhookResponse.status, responseText);
          googleSheetsResult = {
            success: false,
            message: `Webhook failed (${webhookResponse.status}): ${responseText}`
          };
        }
      } catch (webhookError: any) {
        console.error('❌ Google Sheets webhook failed:', webhookError);
        googleSheetsResult = {
          success: false,
          message: webhookError.name === 'TimeoutError' 
            ? 'Webhook timeout (Google Sheets may still update)' 
            : `Webhook error: ${webhookError.message}`
        };
      }
    }

    // Return success even if webhook fails (Supabase is the source of truth)
    return NextResponse.json({
      success: true,
      message: 'Patient data updated',
      supabase: {
        success: true,
        data: supabaseData
      },
      googleSheets: googleSheetsResult,
      warnings: googleSheetsResult.success
        ? []
        : ['Google Sheets sync failed — data saved to Supabase only. Re-sync manually.']
    });

  } catch (error: any) {
    console.error('Patient sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
