import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { getSessionScope } from '@/lib/session-scope';
import { updatePatientInSheets } from '@/lib/sheetsSync';
import { sanitizePatientUpdate } from '@/lib/db/sanitizePatientUpdate';

const FIELD_MAPPING: Record<string, string | null> = {
  inmate_name: 'inmate_name',
  age: 'age',
  sex: 'sex',
  contact_number: 'contact_number',
  address: 'address',
  facility_name: 'facility_name',
  dob: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  screening_date: 'screening_date',
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
  'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
  'TB diagnosed (Y/N)': 'tb_diagnosed',
  'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
  'Type of TB Diagnosed (P/EP)': 'tb_type',
  'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
  'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
  'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
  'Status at the time of referral (Pre ART/On ART)': 'art_status',
  'ART Number (if on ART at the time of referral)': 'art_number',
  'NIKSHAY/ABHA ID': 'nikshay_abha_id',
  'Date of registration (dd/mm/yyyy)': 'registration_date',
  Remarks: 'remarks',
  closure_reason: 'closure_reason',
  'Serial Number': null,
  KoboUUID: null,
  KoboID: null,
};

export async function POST(request: NextRequest) {
  try {
    // Auth
    let isServiceRoleAuth = false;
    let scope: { state: string | null; district: string | null; role: string };

    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceRoleAuth = true;
      scope = { state: null, district: null, role: 'service' };
    } else {
      try {
        scope = await getSessionScope();
      } catch {
        return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { patientId, updates } = body;

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'MISSING_PATIENT_ID' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'MISSING_UPDATES' }, { status: 400 });
    }

    const sanitized = sanitizePatientUpdate(updates);

    // Map form field names → DB column names
    const dbUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sanitized)) {
      const col = FIELD_MAPPING[key];
      if (col === null) continue;
      if (value !== undefined && value !== null && value !== '') {
        dbUpdates[col ?? key] = value;
      }
    }

    const supabase = getSupabaseClient();

    // Ownership check (done once, outside any retry)
    const { data: existing, error: fetchError } = await supabase
      .from('patients')
      .select('id, screening_state, sheets_sync_attempts')
      .eq('id', patientId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'PATIENT_NOT_FOUND' }, { status: 404 });
    }

    if (!isServiceRoleAuth && scope.state && existing.screening_state !== scope.state) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED_STATE_ACCESS' }, { status: 403 });
    }

    // Write to Supabase
    const { data: updatedPatient, error: dbError } = await supabase
      .from('patients')
      .update({ ...dbUpdates, synced_to_sheets: false, sheets_sync_attempts: 0 })
      .eq('id', patientId)
      .select()
      .single();

    if (dbError || !updatedPatient) {
      console.error('[patient-sync] DB write failed:', dbError);
      return NextResponse.json(
        { success: false, error: 'DB_WRITE_FAILED', detail: dbError?.message },
        { status: 500 }
      );
    }

    // Fire-and-forget Sheets sync
    updatePatientInSheets(updatedPatient)
      .then(async (result) => {
        const syncUpdate = result.success
          ? { synced_to_sheets: true, sheets_synced_at: new Date().toISOString(), sheets_sync_error: null }
          : {
              sheets_sync_attempts: (existing.sheets_sync_attempts ?? 0) + 1,
              sheets_sync_error: result.error,
            };
        await supabase.from('patients').update(syncUpdate).eq('id', patientId);
      })
      .catch((err) => console.error('[patient-sync] Sheets sync error:', err));

    return NextResponse.json({ success: true, patient: updatedPatient, syncStatus: 'queued' });
  } catch (error: unknown) {
    console.error('[patient-sync] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
