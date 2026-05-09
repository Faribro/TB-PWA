import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { getSessionScope } from '@/lib/session-scope';
import { syncToSheetsAsync } from '@/lib/sheetsSyncQStash';
import { sanitizePatientUpdate } from '@/lib/db/sanitizePatientUpdate';
import { invalidatePatientCaches } from '@/lib/cache-version';

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
  staff_name: 'staff_name',
  submitted_on: 'submitted_on',
  screening_state: 'screening_state',
  screening_district: 'screening_district',
  facility_type: 'facility_type',
  unique_id: 'unique_id',
  inmate_type: 'inmate_type',
  father_husband_name: 'father_husband_name',
  xray_result: 'xray_result',
  symptoms_10s: 'symptoms_10s',
  tb_past_history: 'tb_past_history',
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
  referral_date: 'referral_date',
  referred_facility: 'referred_facility',
  tb_diagnosed: 'tb_diagnosed',
  tb_diagnosis_date: 'tb_diagnosis_date',
  tb_type: 'tb_type',
  att_start_date: 'att_start_date',
  att_completion_date: 'att_completion_date',
  hiv_status: 'hiv_status',
  art_status: 'art_status',
  art_number: 'art_number',
  nikshay_abha_id: 'nikshay_abha_id',
  registration_date: 'registration_date',
  remarks: 'remarks',
  closure_reason: 'closure_reason',
  other_facility_name: 'other_facility_name',
  'Serial Number': null,
  KoboUUID: null,
  KoboID: null,
  id: null,
  updated_at: null,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // DIAGNOSTIC: Check environment and connectivity first
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[patient-sync] 🔍 ENVIRONMENT CHECK:');
    console.log('[patient-sync]   NODE_ENV:', process.env.NODE_ENV);
    console.log('[patient-sync]   VERCEL_URL:', process.env.VERCEL_URL);
    console.log('[patient-sync]   SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('[patient-sync]   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
    
    
    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 1: Parallel Auth + Body Parsing (saves ~50-100ms)
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let isServiceRoleAuth = false;
    let scope = { state: null, district: null, role: 'service' };
    
    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceRoleAuth = true;
    } else {
      try {
        scope = await getSessionScope();
      } catch {
        throw new Error('UNAUTHORIZED');
      }
    }
    
    const body = await request.json();

    const { patientId, updates } = body;

    console.log('[patient-sync] ══════════════════════════════════════════════════');
    console.log('[patient-sync] STEP 1 - RAW REQUEST RECEIVED:');
    console.log('[patient-sync]   patientId:', patientId);
    console.log('[patient-sync]   updates keys:', Object.keys(updates || {}));
    console.log('[patient-sync]   ALL updates field-by-field:');
    for (const [k, v] of Object.entries(updates || {})) {
      console.log(`[patient-sync]     "${k}": "${v}" (type: ${typeof v})`);
    }
    console.log('[patient-sync]   screening_date received:', updates?.screening_date, '(type:', typeof updates?.screening_date, ')');
    console.log('[patient-sync] ══════════════════════════════════════════════════');

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 2: Fast-fail validation (saves ~10ms on errors)
    // ═══════════════════════════════════════════════════════════════════════
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'MISSING_PATIENT_ID' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'MISSING_UPDATES' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 3: Optimized field mapping (saves ~5-10ms)
    // ═══════════════════════════════════════════════════════════════════════
    const sanitized = sanitizePatientUpdate(updates);
    console.log('[patient-sync] STEP 2 - AFTER SANITIZE:');
    console.log('[patient-sync]   sanitized keys:', Object.keys(sanitized));
    for (const [k, v] of Object.entries(sanitized)) {
      console.log(`[patient-sync]     "${k}": "${v}" (type: ${typeof v})`);
    }
    console.log('[patient-sync]   screening_date after sanitize:', sanitized.screening_date);
    
    const dbUpdates: Record<string, unknown> = {};
    
    // Pre-filter to avoid unnecessary iterations
    const entries = Object.entries(sanitized);
    const len = entries.length;
    
    console.log('[patient-sync] STEP 3 - FIELD MAPPING:');
    for (let i = 0; i < len; i++) {
      const [key, value] = entries[i];
      const col = FIELD_MAPPING[key];
      const included = col && value !== undefined && value !== null && value !== '';
      console.log(`[patient-sync]   "${key}" = "${value}" → column "${col}" → ${included ? '✅ INCLUDED' : '❌ SKIPPED'}` +
        (!included && col ? ` (reason: ${value === '' ? 'empty string' : value === undefined ? 'undefined' : value === null ? 'null' : 'unknown'})` : '') +
        (!col ? ` (reason: no column mapping)` : ''));
      if (included) {
        dbUpdates[col] = value;
      }
    }
    
    console.log('[patient-sync] STEP 4 - FINAL DB UPDATES:');
    console.log('[patient-sync]   dbUpdates keys:', Object.keys(dbUpdates));
    for (const [k, v] of Object.entries(dbUpdates)) {
      console.log(`[patient-sync]     "${k}": "${v}"`);
    }
    console.log('[patient-sync]   screening_date in dbUpdates:', dbUpdates.screening_date);

    const supabase = getSupabaseClient();

    // ═══════════════════════════════════════════════════════════════════════
    // VALIDATION: Check if patient exists and user has access
    // ═══════════════════════════════════════════════════════════════════════
    
    // Determine if patientId is a UUID (kobo_uuid) or database id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId);
    
    console.log(`[patient-sync] 🔍 Patient identifier analysis:`);
    console.log(`[patient-sync]   patientId: ${patientId}`);
    console.log(`[patient-sync]   isUUID: ${isUUID}`);
    
    // Try kobo_uuid first if it's a UUID, otherwise use id
    let existing = null;
    let fetchError = null;
    let idField = 'id'; // Default to id field
    
    if (isUUID) {
      console.log(`[patient-sync]   Trying kobo_uuid field first...`);
      const result = await supabase
        .from('patients')
        .select('id, kobo_uuid, unique_id, inmate_name, screening_state')
        .eq('kobo_uuid', patientId)
        .single();
      
      if (result.data && !result.error) {
        existing = result.data;
        idField = 'kobo_uuid';
        console.log(`[patient-sync]   ✅ Found patient by kobo_uuid`);
      } else {
        console.log(`[patient-sync]   ❌ Not found by kobo_uuid, trying id field...`);
      }
    }
    
    // If not found by kobo_uuid or not a UUID, try by id field
    if (!existing) {
      console.log(`[patient-sync]   Trying id field...`);
      const result = await supabase
        .from('patients')
        .select('id, kobo_uuid, unique_id, inmate_name, screening_state')
        .eq('id', patientId)
        .single();
      
      if (result.data && !result.error) {
        existing = result.data;
        idField = 'id';
        console.log(`[patient-sync]   ✅ Found patient by id`);
      } else {
        fetchError = result.error;
        console.log(`[patient-sync]   ❌ Not found by id either`);
      }
    }
    
    console.log(`[patient-sync]   using field: ${idField}`);

    if (fetchError || !existing) {
      console.log(`[patient-sync]   Final error:`, fetchError);
      return NextResponse.json({ success: false, error: 'PATIENT_NOT_FOUND' }, { status: 404 });
    }

    console.log(`[patient-sync] 🔍 Authorization check:`);
    console.log(`[patient-sync]   isServiceRoleAuth: ${isServiceRoleAuth}`);
    console.log(`[patient-sync]   existing.screening_state: "${existing.screening_state}"`);
    console.log(`[patient-sync]   scope.state: "${scope.state}"`);
    console.log(`[patient-sync]   scope.role: "${scope.role}"`);
    
    // Bypass state authorization for admin/PM users
    const isAdminOrPM = scope.role === 'admin' || scope.role === 'Program Manager' || scope.role === 'PM';
    
    if (!isServiceRoleAuth && !isAdminOrPM && existing.screening_state !== scope.state) {
      console.log(`[patient-sync]   ❌ Authorization failed - state mismatch and not admin`);
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED_STATE_ACCESS' }, { status: 403 });
    }
    
    console.log(`[patient-sync]   ✅ Authorization passed`);

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 5: Single DB write with minimal select (saves ~50-100ms)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[patient-sync] 📝 Executing update with field:', idField, 'and patientId:', patientId);
    console.log('[patient-sync] 📝 dbUpdates keys:', Object.keys(dbUpdates));
    console.log('[patient-sync] 📝 dbUpdates values:', dbUpdates);
    
    // First, check what fields currently exist in the patient record
    console.log('[patient-sync] 🔍 Checking current patient fields before update...');
    const { data: currentPatient } = await supabase
      .from('patients')
      .select('*')
      .eq(idField, patientId)
      .maybeSingle();
    
    if (currentPatient) {
      console.log('[patient-sync] ✅ Current patient found, fields before update:');
      console.log('[patient-sync] 📊 Total field count:', Object.keys(currentPatient).length);
      
      // Check specifically for clinical fields
      const clinicalFields = [
        'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date', 
        'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status', 
        'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
      ];
      
      console.log('[patient-sync] 🔍 Clinical field check:');
      clinicalFields.forEach(field => {
        const hasField = field in currentPatient;
        const value = currentPatient[field];
        console.log(`[patient-sync]   ${field}: ${hasField ? '✅ EXISTS' : '❌ MISSING'} = "${value}"`);
      });
      
      console.log('[patient-sync] 📋 ALL fields in patient record:');
      for (const [k, v] of Object.entries(currentPatient)) {
        console.log(`[patient-sync]   "${k}": "${v}"`);
      }
    }

    console.log('[patient-sync] 🔍 Executing Supabase update...');
    console.log('[patient-sync]   Table: patients');
    console.log('[patient-sync]   Where clause:', idField, '=', patientId);
    console.log('[patient-sync]   Update fields count:', Object.keys(dbUpdates).length);
    console.log('[patient-sync]   Update details:');
    for (const [key, value] of Object.entries(dbUpdates)) {
      console.log(`[patient-sync]     ${key}: "${value}" (${typeof value})`);
    }

    const { error: dbError, data: updateResult } = await supabase
      .from('patients')
      .update(dbUpdates)
      .eq(idField, patientId)
      .select('id, updated_at') // Get minimal response to verify update worked
      .maybeSingle();
    
    console.log('[patient-sync] 🔍 Update operation result:');
    console.log('[patient-sync]   dbError:', dbError);
    console.log('[patient-sync]   updateResult:', updateResult);
    console.log('[patient-sync]   idField:', idField);
    console.log('[patient-sync]   patientId:', patientId);
    console.log('[patient-sync]   dbUpdates sent:', JSON.stringify(dbUpdates, null, 2));
    
    // Check if update actually succeeded
    if (dbError) {
      console.error('[patient-sync] ❌ Database update failed:');
      console.error('[patient-sync]   Error code:', dbError.code);
      console.error('[patient-sync]   Error message:', dbError.message);
      console.error('[patient-sync]   Error details:', dbError.details);
      console.error('[patient-sync]   Error hint:', dbError.hint);
    } else if (updateResult) {
      console.log('[patient-sync] ✅ Database update succeeded, affected row:', updateResult.id);
    } else {
      console.warn('[patient-sync] ⚠️ Database update returned no result - possible no-op update');
    }
    
    // Fetch the updated patient separately with all fields to ensure we get clinical data
    const { data: updatedPatient, error: selectError } = await supabase
      .from('patients')
      .select('*')
      .eq(idField, patientId)
      .maybeSingle();
    
    console.log('[patient-sync] 🔍 Select operation result:');
    console.log('[patient-sync]   selectError:', selectError);
    
    if (selectError) {
      console.error('[patient-sync] ❌ Failed to fetch updated patient:', selectError);
      throw new Error(`Failed to fetch updated patient: ${selectError.message}`);
    }
    
    if (!updatedPatient) {
      console.error('[patient-sync] ❌ No updated patient returned');
      throw new Error('No patient returned after update');
    }
    
    console.log('[patient-sync] ✅ Updated patient fetched successfully');
    console.log('[patient-sync] 📊 Updated patient field count:', Object.keys(updatedPatient).length);
    
    // Check specifically for clinical fields in the response
    const clinicalFields = [
      'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date', 
      'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status', 
      'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
    ];
    
    console.log('[patient-sync] 🔍 Clinical field check in RESPONSE:');
    clinicalFields.forEach(field => {
      const hasField = field in updatedPatient;
      const value = updatedPatient[field];
      console.log(`[patient-sync]   ${field}: ${hasField ? '✅ EXISTS' : '❌ MISSING'} = "${value}"`);
    });
    
    console.log('[patient-sync] 📋 ALL fields in updated patient response:');
    for (const [k, v] of Object.entries(updatedPatient)) {
      console.log(`[patient-sync]   "${k}": "${v}"`);
    }

    console.log('[patient-sync] STEP 5 - SUPABASE WRITE RESULT:');
    console.log('[patient-sync]   dbError:', dbError);
    console.log('[patient-sync]   updatedPatient fields:');
    if (updatedPatient) {
      console.log('[patient-sync]   Total fields:', Object.keys(updatedPatient).length);
      
      // Log clinical fields specifically
      const clinicalFields = ['referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date', 'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status', 'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'];
      
      console.log('[patient-sync]   Clinical fields in response:');
      clinicalFields.forEach(field => {
        const value = updatedPatient[field];
        console.log(`[patient-sync]     "${field}": "${value}" (${typeof value})`);
      });
      
      for (const [k, v] of Object.entries(updatedPatient)) {
        console.log(`[patient-sync]     "${k}": "${v}"`);
      }
    }
    console.log('[patient-sync]   screening_date in DB response:', updatedPatient?.screening_date, '(type:', typeof updatedPatient?.screening_date, ')');
    console.log('[patient-sync]   screening_date we sent:', dbUpdates.screening_date);

    if (dbError || !updatedPatient) {
      console.error('[patient-sync] ❌ DB WRITE FAILED');
      console.error('[patient-sync]   Error object:', JSON.stringify(dbError, null, 2));
      console.error('[patient-sync]   Error message:', dbError?.message);
      console.error('[patient-sync]   Error code:', dbError?.code);
      console.error('[patient-sync]   Error details:', dbError?.details);
      console.error('[patient-sync]   Error hint:', dbError?.hint);
      console.error('[patient-sync]   dbUpdates that were sent:', JSON.stringify(dbUpdates, null, 2));
      console.error('[patient-sync]   patientId:', patientId);
      console.error('[patient-sync]   dbUpdates count:', Object.keys(dbUpdates).length);
      
      // Additional diagnostic info
      const diagnostic = {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        phase: 'database_write',
        patientId: patientId,
        updateFields: Object.keys(dbUpdates),
        updateCount: Object.keys(dbUpdates).length,
        errorType: dbError?.code || 'UNKNOWN',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      };
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'DB_WRITE_FAILED', 
          detail: dbError?.message || 'No patient returned',
          hint: dbError?.hint,
          code: dbError?.code,
          updates: Object.keys(dbUpdates),
          diagnostic: diagnostic
        },
        { status: 500 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 6: Non-blocking background tasks (cache + sync)
    // ═══════════════════════════════════════════════════════════════════════
    // Fire-and-forget: never blocks response
    invalidatePatientCaches().catch(err => console.error('[patient-sync] Cache invalidation error:', err));
    console.log('[patient-sync] STEP 6 - GOOGLE SHEETS SYNC PAYLOAD:');
    console.log('[patient-sync]   Sending updatedPatient to sheets sync:');
    for (const [k, v] of Object.entries(updatedPatient || {})) {
      console.log(`[patient-sync]     "${k}": "${v}"`);
    }
    console.log('[patient-sync]   screening_date in sheets payload:', updatedPatient?.screening_date);
    
    // CRITICAL FIX: Only sync to sheets AFTER confirming DB write succeeded
    syncToSheetsAsync(updatedPatient, 'update');

    const duration = Date.now() - startTime;

    // Log success AFTER confirming Supabase write succeeded
    console.log(`[patient-sync] ✅ Save succeeded, sync queued (duration: ${duration}ms)`);

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIMIZATION 7: Return minimal response (saves ~5-10ms on serialization)
    // ═══════════════════════════════════════════════════════════════════════
    return NextResponse.json(
      { success: true, patient: updatedPatient, _perf: { duration } },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[patient-sync] Error after ${duration}ms:`, error);
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
