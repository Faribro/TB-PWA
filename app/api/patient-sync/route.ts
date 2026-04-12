import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionScope } from '@/lib/session-scope';
import { updatePatientInSheets, PatientRecord } from '@/lib/sheetsSync';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);



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

    // Get timestamp constraint if provided by client
    const clientTimestamp = updates.client_timestamp;
    delete supabaseUpdates.client_timestamp; // Remove from specific fields

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
      .select();

    if (supabaseError) {
      console.error('[patient-sync] Supabase error:', supabaseError);
      
      // Handle optimistic locking conflict code
      if (supabaseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conflict: record updated by another process' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update Supabase', details: supabaseError.message },
        { status: 500 }
      );
    }

    // Check if any rows were updated
    if (!supabaseData || supabaseData.length === 0) {
      console.error('[patient-sync] No rows updated - patient not found, access denied, or update conflict');
      return NextResponse.json(
        { error: 'Conflict or access denied', details: 'No matching patient record or record updated by another process' },
        { status: 409 } // Changed to 409 to reflect potential lock conflict
      );
    }

    const updatedPatient = supabaseData[0];

    console.log('[patient-sync] Supabase success, updated patient:', updatedPatient?.id);

    // Step B: Sync to Google Sheets via direct API
    let googleSheetsResult: { success: boolean; message: string; data?: any } = { 
      success: false, 
      message: 'Google Sheets not configured' 
    };
    
    const sheetsLookupId = koboUuid || updatedPatient.kobo_uuid || updatedPatient.unique_id;
    
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY && sheetsLookupId) {
      try {
        console.log('[patient-sync] Syncing to Google Sheets via API:', sheetsLookupId);
        
        const patientRecord: PatientRecord = {
          ...updatedPatient,
          kobo_uuid: sheetsLookupId
        };
        
        const syncResult = await updatePatientInSheets(patientRecord);
        
        googleSheetsResult = {
          success: syncResult.success,
          message: syncResult.message,
          data: { rowsUpdated: syncResult.rowsAppended || 0 }
        };
        
        if (syncResult.success) {
          console.log('[patient-sync] ✅ Google Sheets sync successful');
        } else {
          console.error('[patient-sync] ❌ Google Sheets sync failed:', syncResult.error);
        }
      } catch (error: any) {
        console.error('[patient-sync] ❌ Google Sheets API error:', error);
        googleSheetsResult = {
          success: false,
          message: `API error: ${error.message}`
        };
      }
    }

    // Update Supabase with sync status
    const syncStatusUpdate: any = {};
    
    if (googleSheetsResult.success) {
      syncStatusUpdate.synced_to_sheets = true;
      syncStatusUpdate.sheets_synced_at = new Date().toISOString();
      syncStatusUpdate.sheets_sync_error = null;
      console.log('✅ Marking patient as synced');
    } else if (process.env.GOOGLE_SHEET_ID && sheetsLookupId) {
      syncStatusUpdate.synced_to_sheets = false;
      syncStatusUpdate.sheets_sync_error = googleSheetsResult.message;
      console.log('❌ Marking patient as unsynced - will retry later');
    }

    // Apply sync status update if needed
    if (Object.keys(syncStatusUpdate).length > 0) {
      const { error: syncUpdateError } = await supabase
        .from('patients')
        .update(syncStatusUpdate)
        .eq('id', patientId);

      if (syncUpdateError) {
        console.error('❌ Failed to update sync status:', syncUpdateError);
      }
    }

    // Build warnings array
    const warnings: string[] = [];
    if (!sheetsLookupId) {
      warnings.push('No Kobo UUID available for Google Sheets lookup. Patient may not exist in sheet yet.');
    } else if (!googleSheetsResult.success) {
      warnings.push('Google Sheets sync failed — data saved to Supabase only. Re-sync manually.');
    }
    
    // Return success even if webhook fails (Supabase is the source of truth)
    return NextResponse.json({
      success: true,
      message: 'Patient data updated',
      supabase: {
        success: true,
        data: updatedPatient
      },
      googleSheets: googleSheetsResult,
      warnings
    });

  } catch (error: any) {
    console.error('Patient sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
