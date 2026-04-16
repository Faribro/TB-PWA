import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

// Explicit blacklist of columns that should NEVER be sent to Supabase
const BLACKLISTED_COLUMNS = new Set(['alcohol', 'smoking']);

// Cache for valid column names (refreshed per request)
let validColumnsCache: Set<string> | null = null;

/**
 * Fetch valid column names from Supabase patients table
 */
async function getValidColumns(): Promise<Set<string>> {
  if (validColumnsCache) {
    return validColumnsCache;
  }

  try {
    // Fetch table schema from information_schema
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'patients' })
      .single();

    if (error) {
      console.warn('[Schema Fetch] RPC failed, using direct query:', error.message);
      
      // Fallback: Try to fetch a single record
      const { data: sampleData, error: sampleError } = await supabase
        .from('patients')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('[Schema Fetch] Sample query failed:', sampleError);
        return getHardcodedColumns();
      }

      if (sampleData && sampleData.length > 0) {
        const columns = new Set(Object.keys(sampleData[0]));
        validColumnsCache = columns;
        console.log(`[Schema Fetch] Loaded ${columns.size} columns from sample record`);
        return columns;
      }
    }

    // If table is empty, use hardcoded schema
    console.warn('[Schema Fetch] Table is empty, using hardcoded schema');
    return getHardcodedColumns();
  } catch (error) {
    console.error('[Schema Fetch] Unexpected error:', error);
    return getHardcodedColumns();
  }
}

/**
 * Hardcoded column list for when schema detection fails
 */
function getHardcodedColumns(): Set<string> {
  const columns = new Set([
    'id', 'kobo_uuid', 'kobo_id', 'unique_id', 'serial_number',
    'inmate_name', 'age', 'sex', 'date_of_birth', 'father_husband_name', 'inmate_type',
    'facility_name', 'facility_type', 'screening_state', 'screening_district', 'staff_name',
    'screening_date', 'submitted_on', 'submission_time',
    'referral_date', 'att_start_date', 'att_completion_date', 'tb_diagnosis_date', 'registration_date',
    'tb_diagnosed', 'tb_type', 'chest_x_ray_result', 'xray_result',
    'symptoms_10s', 'symptoms_present', 'tb_past_history', 'referred_facility',
    'hiv_status', 'art_status', 'art_number',
    'contact_number', 'address',
    'nikshay_abha_id', 'nikshay_id',
    'remarks', 'follow_up_notes',
    'gps_latitude', 'gps_longitude', 'latitude', 'longitude',
    'is_active', 'current_phase',
    'created_at', 'updated_at', 'last_updated'
  ]);
  
  validColumnsCache = columns;
  console.log(`[Schema Fetch] Using hardcoded schema with ${columns.size} columns`);
  return columns;
}

/**
 * Filter object to only include keys that exist in Supabase schema
 * Also removes blacklisted columns
 */
function filterToValidColumns(
  obj: Record<string, any>,
  validColumns: Set<string>
): Record<string, any> {
  const filtered: Record<string, any> = {};
  const strippedColumns: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    // Explicit blacklist check
    if (BLACKLISTED_COLUMNS.has(key)) {
      strippedColumns.push(`${key} (blacklisted)`);
      continue;
    }

    if (validColumns.has(key)) {
      filtered[key] = value;
    } else {
      strippedColumns.push(key);
    }
  }

  if (strippedColumns.length > 0) {
    console.warn(`[Schema Filter] Stripping columns: ${strippedColumns.join(', ')}`);
  }

  return filtered;
}

// Robust field mapping: Google Sheets verbose keys → Supabase snake_case
function mapSheetRowToSupabase(row: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {
    // Core identifiers - Handle BOTH old Google Sheets format AND new snake_case format
    kobo_uuid: row['KoboUUID(hidden)'] || row['kobo_uuid'] || row['_uuid'] || row['uuid'] || null,
    unique_id: row['Unique ID'] || row['unique_id'] || null,
    
    // Patient demographics
    inmate_name: row['Inmate Name'] || row['inmate_name'] || null,
    age: row['Age'] || row['age'] || null,
    sex: row['Sex (Male/Female/TG)'] || row['sex'] || row['gender'] || null,
    date_of_birth: row['Date of Birth'] || row['date_of_birth'] || null,
    father_husband_name: row["Father /Husband's Name"] || row['father_husband_name'] || null,
    inmate_type: row['Inmate type (Under Trial/Convicted/Other)'] || row['inmate_type'] || null,
    
    // Facility information
    facility_name: row['Facility Name'] || row['facility_name'] || null,
    facility_type: row['Facility type'] || row['facility_type'] || null,
    screening_state: row['State'] || row['screening_state'] || null,
    screening_district: row['District'] || row['screening_district'] || null,
    staff_name: row['Name of the Staff'] || row['staff_name'] || null,
    
    // Dates
    screening_date: row['Date of Screening - CH-x ray (dd/mm/yy)'] || row['screening_date'] || null,
    submitted_on: row['Submitted On'] || row['submitted_on'] || row['_submission_time'] || null,
    referral_date: row['Date of referral for TB Examination (sputum) (dd/mm/yy)'] || row['referral_date'] || null,
    att_start_date: row['Date of starting ATT (dd/mm/yyyy)'] || row['att_start_date'] || null,
    att_completion_date: row['Date of Treatment Completion (dd/mm/yyyy)'] || row['att_completion_date'] || null,
    tb_diagnosis_date: row['Date of TB Diagnosed (dd/mm/yy)'] || row['tb_diagnosis_date'] || null,
    registration_date: row['Date of registration (dd/mm/yyyy)'] || row['registration_date'] || null,
    
    // Clinical data
    tb_diagnosed: row['TB diagnosed (Y/N)'] || row['tb_diagnosed'] || null,
    tb_type: row['Type of TB Diagnosed (P/EP)'] || row['tb_type'] || null,
    chest_x_ray_result: row['Chest x ray Result (Abnormal/Normal/Not-detected)'] || row['xray_result'] || row['chest_x_ray_result'] || null,
    xray_result: row['Chest x ray Result (Abnormal/Normal/Not-detected)'] || row['xray_result'] || null,
    symptoms_10s: row['10s Symptoms Present? (You can select more than one symptoms)'] || row['symptoms_10s'] || row['symptoms_present'] || null,
    symptoms_present: row['10s Symptoms Present? (You can select more than one symptoms)'] || row['symptoms_present'] || null,
    tb_past_history: row['Whether any past history of TB? (Y/N)'] || row['tb_past_history'] || null,
    referred_facility: row['Name of facility where referred to (Give code/name of all facilities)'] || row['referred_facility'] || null,
    
    // HIV/ART data
    hiv_status: row['HIV Status (Positive/Negative/Unknown)'] || row['hiv_status'] || null,
    art_status: row['Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]'] || row['art_status'] || null,
    art_number: row['ART Number (if on ART at the time of referral)'] || row['art_number'] || null,
    
    // Contact information
    contact_number: row['Contact Number'] || row['contact_number'] || null,
    address: row['Address'] || row['address'] || null,
    
    // Registration
    nikshay_abha_id: row['NIKSHAY/ABHA ID'] || row['nikshay_abha_id'] || null,
    
    // Additional fields
    remarks: row['Remarks'] || row['remarks'] || null,
    
    // GPS coordinates - FIXED: Handle Google Sheets column names
    gps_latitude: row['Latitude'] || row['gps_latitude'] || row['_gps_latitude'] || null,
    gps_longitude: row['Longitude'] || row['gps_longitude'] || row['_gps_longitude'] || null,
    
    // Serial Number
    serial_number: row['Serial Number'] || row['serial_number'] || null,
    
    // Metadata
    updated_at: new Date().toISOString(),
  };

  // EXPLICIT BLACKLIST: Remove alcohol and smoking if they somehow got added
  delete mapped.alcohol;
  delete mapped.smoking;

  return mapped;
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

    // FAST PATH: Skip schema detection, use hardcoded columns
    const validColumns = getHardcodedColumns();

    // Map and filter in one pass
    const validData = body
      .map(mapSheetRowToSupabase)
      .map(row => filterToValidColumns(row, validColumns))
      .filter(row => row.kobo_uuid); // Only keep rows with UUID

    const invalidCount = body.length - validData.length;

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

    console.log(`[Sheets Sync] Upserting ${validData.length} records`);

    // Direct upsert without audit logging
    const { error } = await supabase
      .from('patients')
      .upsert(validData, {
        onConflict: 'kobo_uuid',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('[Sheets Sync] Supabase upsert failed:', error.message);
      return NextResponse.json(
        { 
          error: 'Database Error', 
          message: error.message,
        },
        { status: 500 }
      );
    }

    console.log(`[Sheets Sync] ✅ Successfully synced ${validData.length} records`);

    return NextResponse.json(
      {
        success: true,
        message: 'Records synced successfully',
        stats: {
          received: body.length,
          synced: validData.length,
          invalid: invalidCount,
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
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .limit(1);
    
    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase connection failed',
          error: error.message,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        status: 'ok',
        endpoint: '/api/sync/sheets-to-supabase',
        supabase_connected: true,
        test_query_success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
