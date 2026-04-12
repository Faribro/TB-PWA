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
    // Auth + ownership check
    let scope;
    let isServiceRoleAuth = false;
    
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceRoleAuth = true;
      scope = { state: null, district: null, role: 'service' };
      console.log('[patient-sync] Service role authentication');
    } else {
      try {
        scope = await getSessionScope();
      } catch {
        return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { patientId, koboUuid, updates } = body;

    console.log('[patient-sync] Request received:', { patientId, koboUuid, updateKeys: Object.keys(updates) });

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PATIENT_ID' },
        { status: 400 }
      );
    }

    if (!updates) {
      return NextResponse.json(
        { success: false, error: 'MISSING_UPDATES' },
        { status: 400 }
      );
    }

    // Map form fields to database columns
    const supabaseUpdates: any = {};
    const fieldMapping: Record<string, string | null> = {
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
      'Serial Number': null,
      'KoboUUID': null,
      'KoboID': null
    };

    Object.keys(updates).forEach(key => {
      const dbColumn = fieldMapping[key];
      if (dbColumn === null) return;
      const columnName = dbColumn || key;
      if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
        supabaseUpdates[columnName] = updates[key];
      }
    });

    // STEP 1: Write to Supabase (blocking — source of truth)
    let updateQuery = supabase
      .from('patients')
      .update({
        ...supabaseUpdates,
        updated_at: new Date().toISOString(),
        synced_to_sheets: false,   // mark as needing sync
        sheets_sync_attempts: 0    // reset retry counter
      })
      .eq('id', patientId);

    if (!isServiceRoleAuth && scope.state) {
      updateQuery = updateQuery.eq('screening_state', scope.state);
    }

    const { data: updatedPatient, error: dbError } = await updateQuery.select().single();

    if (dbError) {
      console.error('[patient-sync] Supabase error:', dbError);
      return NextResponse.json(
        { success: false, error: 'DB_WRITE_FAILED', detail: dbError.message },
        { status: 500 }
      );
    }

    if (!updatedPatient) {
      return NextResponse.json(
        { success: false, error: 'PATIENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    console.log('[patient-sync] Supabase success:', updatedPatient.id);

    // STEP 2: Respond to client IMMEDIATELY
    const response = NextResponse.json({
      success: true,
      patient: updatedPatient,
      syncStatus: 'queued'  // tells client Sheets sync is in-flight
    });

    // STEP 3: Fire-and-forget Sheets sync (non-blocking)
    const sheetsSync = updatePatientInSheets(updatedPatient).then(async (result) => {
      if (result.success) {
        await supabase
          .from('patients')
          .update({
            synced_to_sheets: true,
            sheets_synced_at: new Date().toISOString(),
            sheets_sync_error: null
          })
          .eq('id', patientId)
      } else {
        await supabase
          .from('patients')
          .update({
            sheets_sync_attempts: (updatedPatient.sheets_sync_attempts ?? 0) + 1,
            sheets_sync_error: result.error
          })
          .eq('id', patientId)
      }
    }).catch((err) => {
      console.error('[patient-sync] Sheets fire-and-forget error:', err)
    })

    // On Vercel: context.waitUntil(sheetsSync) would be ideal
    // For now, just let it run in background

    return response

  } catch (error: any) {
    console.error('Patient sync error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', details: error.message },
      { status: 500 }
    );
  }
}
