import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

// Robust field mapping: Google Sheets verbose keys → Supabase snake_case
function mapSheetRowToSupabase(row: Record<string, any>): Record<string, any> {
  return {
    // Core identifiers
    kobo_uuid: row['KoboUUID(hidden)'] || row['kobo_uuid'] || row['_uuid'] || null,
    unique_id: row['Unique ID'] || row['unique_id'] || null,
    
    // Patient demographics
    inmate_name: row['Inmate Name'] || row['inmate_name'] || null,
    age: row['Age'] || row['age'] || null,
    gender: row['Gender'] || row['gender'] || null,
    
    // Facility information
    facility_name: row['Facility Name'] || row['facility_name'] || null,
    facility_type: row['Facility Type'] || row['facility_type'] || null,
    screening_state: row['Screening State'] || row['State'] || row['screening_state'] || null,
    screening_district: row['Screening District'] || row['District'] || row['screening_district'] || null,
    
    // Dates
    screening_date: row['Screening Date'] || row['screening_date'] || null,
    submitted_on: row['Submitted On'] || row['submitted_on'] || row['_submission_time'] || null,
    referral_date: row['Referral Date'] || row['referral_date'] || null,
    att_start_date: row['ATT Start Date'] || row['att_start_date'] || null,
    att_completion_date: row['ATT Completion Date'] || row['att_completion_date'] || null,
    
    // Clinical data
    tb_diagnosed: row['TB Diagnosed'] || row['tb_diagnosed'] || null,
    chest_x_ray_result: row['Chest X-Ray Result'] || row['X-Ray Result'] || row['chest_x_ray_result'] || row['xray_result'] || null,
    xray_result: row['X-Ray Result'] || row['xray_result'] || row['chest_x_ray_result'] || null,
    symptoms_present: row['Symptoms Present'] || row['symptoms_present'] || null,
    sputum_test_result: row['Sputum Test Result'] || row['sputum_test_result'] || null,
    hiv_status: row['HIV Status'] || row['hiv_status'] || null,
    
    // Contact information
    contact_number: row['Contact Number'] || row['contact_number'] || null,
    address: row['Address'] || row['address'] || null,
    
    // Treatment tracking
    current_phase: row['Current Phase'] || row['current_phase'] || null,
    is_active: row['Is Active'] !== undefined ? row['Is Active'] : (row['is_active'] !== undefined ? row['is_active'] : true),
    
    // Additional fields
    remarks: row['Remarks'] || row['remarks'] || null,
    follow_up_notes: row['Follow-up Notes'] || row['follow_up_notes'] || null,
    
    // GPS coordinates
    gps_latitude: row['GPS Latitude'] || row['gps_latitude'] || row['_gps_latitude'] || null,
    gps_longitude: row['GPS Longitude'] || row['gps_longitude'] || row['_gps_longitude'] || null,
    
    // Referral tracking
    referred_to: row['Referred To'] || row['referred_to'] || null,
    referral_status: row['Referral Status'] || row['referral_status'] || null,
    
    // Treatment details
    treatment_regimen: row['Treatment Regimen'] || row['treatment_regimen'] || null,
    treatment_outcome: row['Treatment Outcome'] || row['treatment_outcome'] || null,
    
    // Risk factors
    diabetes: row['Diabetes'] || row['diabetes'] || null,
    smoking: row['Smoking'] || row['smoking'] || null,
    alcohol: row['Alcohol'] || row['alcohol'] || null,
    
    // Metadata
    data_source: row['Data Source'] || row['data_source'] || 'google_sheets',
    last_updated: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    // Security: Verify webhook secret
    const secret = req.headers.get('x-kobo-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('[Sheets Sync] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse payload
    const body = await req.json();
    
    // Validate payload is an array
    if (!Array.isArray(body)) {
      console.error('[Sheets Sync] Bad Request: Payload must be an array');
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payload must be an array of patient records' },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      console.warn('[Sheets Sync] Empty payload received');
      return NextResponse.json(
        { success: true, message: 'No records to sync', count: 0 },
        { status: 200 }
      );
    }

    console.log(`[Sheets Sync] Received ${body.length} records from Google Sheets`);

    // Map all rows to Supabase schema
    const mappedData = body.map(mapSheetRowToSupabase);

    // Filter out rows without kobo_uuid (required for upsert)
    const validData = mappedData.filter(row => row.kobo_uuid);
    const invalidCount = mappedData.length - validData.length;

    if (invalidCount > 0) {
      console.warn(`[Sheets Sync] Skipping ${invalidCount} rows without kobo_uuid`);
    }

    if (validData.length === 0) {
      console.error('[Sheets Sync] No valid records to sync (all missing kobo_uuid)');
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid records with kobo_uuid found' },
        { status: 400 }
      );
    }

    // Industrial upsert: Insert or update based on kobo_uuid
    const { data, error, count } = await supabase
      .from('patients')
      .upsert(validData, {
        onConflict: 'kobo_uuid',
        ignoreDuplicates: false, // Update existing records
      })
      .select();

    if (error) {
      console.error('[Sheets Sync] Supabase upsert failed:', error);
      return NextResponse.json(
        { 
          error: 'Database Error', 
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    console.log(`[Sheets Sync] Successfully synced ${validData.length} records to Supabase`);

    // Return success only after Supabase write is confirmed
    return NextResponse.json(
      {
        success: true,
        message: 'Records synced successfully',
        stats: {
          received: body.length,
          valid: validData.length,
          invalid: invalidCount,
          synced: validData.length,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Sheets Sync] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      endpoint: '/api/sync/sheets-to-supabase',
      method: 'POST',
      description: 'Receives bulk patient data from Google Sheets and syncs to Supabase',
      authentication: 'x-kobo-webhook-secret header required',
      payload: 'Array of patient objects',
    },
    { status: 200 }
  );
}
