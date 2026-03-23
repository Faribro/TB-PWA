import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

/**
 * Map Supabase snake_case fields to Google Sheets verbose column names
 */
function mapSupabaseToSheets(updates: Record<string, any>): Record<string, any> {
  const mapping: Record<string, string> = {
    // Core identifiers
    unique_id: 'Unique ID',
    kobo_uuid: 'KoboUUID(hidden)',
    
    // Patient demographics
    inmate_name: 'Inmate Name',
    age: 'Age',
    gender: 'Gender',
    sex: 'Gender',
    date_of_birth: 'Date of Birth',
    
    // Facility information
    facility_name: 'Facility Name',
    facility_type: 'Facility Type',
    screening_state: 'Screening State',
    screening_district: 'Screening District',
    
    // Dates
    screening_date: 'Screening Date',
    submitted_on: 'Submitted On',
    referral_date: 'Referral Date',
    att_start_date: 'Date of starting ATT (dd/mm/yyyy)',
    att_completion_date: 'ATT Completion Date',
    
    // Clinical data
    tb_diagnosed: 'TB Diagnosed',
    chest_x_ray_result: 'Chest X-Ray Result',
    xray_result: 'X-Ray Result',
    symptoms_present: 'Symptoms Present',
    symptoms_10s: 'Symptoms Present',
    sputum_test_result: 'Sputum Test Result',
    hiv_status: 'HIV Status',
    
    // Contact information
    contact_number: 'Contact Number',
    address: 'Address',
    
    // Treatment tracking
    current_phase: 'Current Phase',
    is_active: 'Is Active',
    
    // Additional fields
    remarks: 'Remarks',
    follow_up_notes: 'Follow-up Notes',
    
    // GPS coordinates
    gps_latitude: 'GPS Latitude',
    gps_longitude: 'GPS Longitude',
    latitude: 'GPS Latitude',
    longitude: 'GPS Longitude',
    
    // Referral tracking
    referred_to: 'Referred To',
    referred_facility: 'Referred To',
    referral_status: 'Referral Status',
    
    // Treatment details
    treatment_regimen: 'Treatment Regimen',
    treatment_outcome: 'Treatment Outcome',
    
    // Risk factors
    diabetes: 'Diabetes',
    
    // Metadata
    data_source: 'Data Source',
  };

  const mapped: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    // Skip internal fields that shouldn't sync to Sheets
    if (['id', 'created_at', 'updated_at', 'last_updated'].includes(key)) {
      continue;
    }
    
    // Use mapped name if available, otherwise use original key
    const sheetColumnName = mapping[key] || key;
    mapped[sheetColumnName] = value;
  }

  return mapped;
}

export async function POST(req: NextRequest) {
  try {
    const { uniqueId, updates } = await req.json();

    if (!uniqueId) {
      return NextResponse.json(
        { error: 'Missing uniqueId parameter' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Missing updates parameter' },
        { status: 400 }
      );
    }

    console.log(`[Update Patient] Updating patient ${uniqueId} in Supabase...`);

    // 1. SYNC: Update Supabase immediately
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('unique_id', uniqueId)
      .select()
      .single();

    if (error) {
      console.error('[Update Patient] Supabase update failed:', error);
      throw error;
    }

    console.log(`[Update Patient] ✅ Supabase updated successfully`);

    // 2. ASYNC: Trigger Google Sheets reverse sync (non-blocking)
    syncToGoogleSheets(uniqueId, updates).catch(err => {
      console.error('[Update Patient] ⚠️ Sheets sync failed (non-critical):', err.message);
      logFailedSync(uniqueId, updates, err.message);
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Update Patient] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update patient' },
      { status: 500 }
    );
  }
}

async function syncToGoogleSheets(uniqueId: string, updates: Record<string, any>) {
  const GOOGLE_APPSCRIPT_URL = process.env.GOOGLE_APPSCRIPT_URL;
  
  if (!GOOGLE_APPSCRIPT_URL) {
    console.warn('[Sheets Sync] ⚠️ GOOGLE_APPSCRIPT_URL not configured, skipping Sheets sync');
    return;
  }

  console.log(`[Sheets Sync] Syncing patient ${uniqueId} to Google Sheets...`);

  // Map Supabase fields to Google Sheets column names
  const mappedUpdates = mapSupabaseToSheets(updates);

  const payload = {
    action: 'update_patient',
    uniqueId,
    updates: mappedUpdates
  };

  console.log(`[Sheets Sync] Payload:`, JSON.stringify(payload, null, 2));

  const response = await fetch(GOOGLE_APPSCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-kobo-webhook-secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Sheets sync failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json().catch(() => ({ success: true }));
  console.log(`[Sheets Sync] ✅ Google Sheets updated successfully:`, result);
}

async function logFailedSync(uniqueId: string, updates: Record<string, any>, error: string) {
  try {
    await supabase.from('sync_failures').insert({
      unique_id: uniqueId,
      updates: JSON.stringify(updates),
      error_message: error,
      created_at: new Date().toISOString()
    });
    console.log(`[Sheets Sync] ⚠️ Logged failed sync for ${uniqueId}`);
  } catch (logError) {
    console.error('[Sheets Sync] Failed to log sync failure:', logError);
  }
}
