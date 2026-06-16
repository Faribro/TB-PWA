/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KOBO WEBHOOK - PRODUCTION-SAFE INGESTION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Architecture:
 * - Supabase is the single source of truth
 * - Next.js is the only ingestion entry point
 * - Idempotent upserts using kobo_uuid as conflict key
 * - Sheets sync disabled by default (use outbox pattern instead)
 * - Fast webhook response (<2s)
 * - Structured logging for production debugging
 * 
 * Flow:
 * 1. Validate request (secret + JSON)
 * 2. Normalize payload to Supabase schema
 * 3. Idempotent upsert to Supabase
 * 4. Return success/error response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { normalizeState, normalizeDistrict } from '@/lib/normalization/state';
import { syncToSheetsAsync } from '@/lib/sheetsSync';
import { invalidatePatientCaches } from '@/lib/cache-version';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const KOBO_WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET;
const ENABLE_SHEETS_SYNC = process.env.ENABLE_SHEETS_SYNC !== 'false'; // Default: true (production)
const GOOGLE_SCRIPT_WEBHOOK_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

const KOBO_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://kf.kobotoolbox.org',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-kobo-webhook-secret',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get field value with fallback keys (handles Kobo field name variations)
 */
function getField(obj: Record<string, unknown>, keys: string[]): unknown {
  if (!obj) return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

/**
 * Normalize date to YYYY-MM-DD format (UTC)
 * Handles ISO timestamps, dd/mm/yyyy, and other formats
 */
function normalizeDateToYYYYMMDD(dateValue: unknown): string | null {
  if (!dateValue) return null;
  
  try {
    const dateStr = String(dateValue).trim();
    if (!dateStr) return null;
    
    // Try parsing as ISO date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Return YYYY-MM-DD in UTC
      return date.toISOString().split('T')[0];
    }
    
    // Try dd/mm/yyyy format
    const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month}-${day}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize Kobo payload to Supabase patients schema
 * Maps 35-column Kobo structure to exact DB columns
 */
function normalizeKoboPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const startTime = Date.now();
  
  // Extract UUID (required)
  const rawUuid = payload['_uuid'] ?? payload['uuid'];
  const kobo_uuid = rawUuid ? String(rawUuid).replace(/^uuid:/i, '').trim() : null;
  
  if (!kobo_uuid) {
    throw new Error('Missing required field: kobo_uuid');
  }

  // Normalize payload with explicit fallbacks
  const normalized = {
    // Identity
    kobo_uuid,
    unique_id: getField(payload, [
      'grp_screening/Unique_ID',
      'Unique_ID',
      'unique_id'
    ]) as string | null,
    
    // Staff & Submission
    staff_name: getField(payload, [
      'grp_screening/staff_name',
      'staff_name',
      'grp_screening/Name_of_the_Staff',
      'Name_of_the_Staff',
      'username',
      '_submitted_by'
    ]) as string | null,
    
    submitted_on: payload['_submission_time'] 
      ? new Date(String(payload['_submission_time'])).toISOString()
      : new Date().toISOString(),
    
    // Location (with normalization)
    screening_state: normalizeState(getField(payload, [
      'grp_screening/screening_state',
      'screening_state',
      'grp_screening/State',
      'State'
    ]) as string | null).normalizedName,
    
    screening_district: normalizeDistrict(getField(payload, [
      'grp_screening/screening_district',
      'screening_district',
      'grp_screening/District',
      'District'
    ]) as string | null),
    
    // Facility
    facility_name: getField(payload, [
      'grp_screening/facility_code',
      'facility_code',
      'grp_screening/facility_name',
      'facility_name'
    ]) as string | null,
    
    facility_type: getField(payload, [
      'grp_screening/facility_type',
      'facility_type',
      'grp_screening/Facility_type',
      'Facility_type'
    ]) as string | null,
    
    // Screening (normalize to YYYY-MM-DD)
    screening_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_screening/screening_date',
      'screening_date',
      'grp_screening/Date_of_Screening_CH_x_ray_dd_mm_yy',
      'Date_of_Screening_CH_x_ray_dd_mm_yy'
    ])),
    
    // Patient Demographics
    inmate_name: getField(payload, [
      'grp_identity/inmate_name',
      'inmate_name',
      'grp_identity/Inmate_Name',
      'Inmate_Name'
    ]) as string | null,
    
    inmate_type: getField(payload, [
      'grp_identity/inmate_type',
      'inmate_type',
      'grp_identity/Inmate_type_Under_Trial_Convicted_Other',
      'Inmate_type_Under_Trial_Convicted_Other'
    ]) as string | null,
    
    father_husband_name: getField(payload, [
      'grp_identity/father_husband_name',
      'father_husband_name',
      'grp_identity/Father_Husband_s_Name',
      'Father_Husband_s_Name'
    ]) as string | null,
    
    date_of_birth: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_demo/date_of_birth',
      'date_of_birth',
      'grp_demo/Date_of_Birth',
      'Date_of_Birth'
    ])),
    
    age: getField(payload, [
      'grp_demo/age',
      'age'
    ]) as number | null,
    
    sex: getField(payload, [
      'grp_demo/sex',
      'sex',
      'grp_demo/Sex_Male_Female_TG',
      'Sex_Male_Female_TG'
    ]) as string | null,
    
    contact_number: getField(payload, [
      'grp_demo/contact_number',
      'contact_number',
      'grp_demo/Contact_Number',
      'Contact_Number'
    ]) as string | null,
    
    // Address (composite)
    address: [
      getField(payload, ['grp_address/address_block_house', 'address_block_house']),
      getField(payload, ['grp_address/address_street', 'address_street']),
      getField(payload, ['grp_address/address_city', 'address_city']),
      getField(payload, ['grp_address/address_district', 'address_district']),
      getField(payload, ['grp_address/address_state', 'address_state']),
      getField(payload, ['grp_address/address_pin_code', 'address_pin_code'])
    ].filter(Boolean).join(', ') || null,
    
    // TB Screening
    xray_result: getField(payload, [
      'grp_tb/xray_result',
      'xray_result',
      'grp_tb/Chest_x_ray_Result_Active_Lat',
      'Chest_x_ray_Result_Active_Lat'
    ]) as string | null,
    
    symptoms_10s: getField(payload, [
      'grp_tb/symptoms_10s',
      'symptoms_10s',
      'grp_tb/_10s_Symptoms_Present_You_can',
      '_10s_Symptoms_Present_You_can'
    ]) as string | null,
    
    tb_past_history: getField(payload, [
      'grp_tb/tb_past_history',
      'tb_past_history',
      'grp_tb/Whether_any_past_history_of_TB_Y_N',
      'Whether_any_past_history_of_TB_Y_N'
    ]) as string | null,
    
    // Referral & Diagnosis (normalize dates)
    referral_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_referral/referral_date',
      'referral_date',
      'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy',
      'Date_of_referral_for_ion_sputum_dd_mm_yy'
    ])),
    
    referred_facility: getField(payload, [
      'grp_referral/referred_facility',
      'referred_facility',
      'grp_referral/Name_of_facility_whe_me_of_all_facilities',
      'Name_of_facility_whe_me_of_all_facilities'
    ]) as string | null,
    
    tb_diagnosed: getField(payload, [
      'grp_referral/tb_diagnosed',
      'tb_diagnosed',
      'grp_referral/TB_diagnosed',
      'TB_diagnosed'
    ]) as string | null,
    
    tb_diagnosis_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_referral/tb_diagnosis_date',
      'tb_diagnosis_date',
      'grp_referral/Date_of_TB_Diagnosed_dd_mm_yy',
      'Date_of_TB_Diagnosed_dd_mm_yy'
    ])),
    
    tb_type: getField(payload, [
      'grp_referral/tb_type',
      'tb_type',
      'grp_referral/Type_of_TB_Diagnosed_P_EP',
      'Type_of_TB_Diagnosed_P_EP'
    ]) as string | null,
    
    // Treatment (normalize dates)
    att_start_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_referral/att_start_date',
      'att_start_date',
      'grp_referral/Date_of_starting_ATT_dd_mm_yyyy',
      'Date_of_starting_ATT_dd_mm_yyyy'
    ])),
    
    att_completion_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_referral/att_completion_date',
      'att_completion_date',
      'grp_referral/Date_of_Treatment_Completion_dd_mm_yyyy',
      'Date_of_Treatment_Completion_dd_mm_yyyy'
    ])),
    
    // HIV/ART
    hiv_status: getField(payload, [
      'grp_hiv/hiv_status',
      'hiv_status',
      'grp_hiv/HIV_Status_Positive_Negative_',
      'HIV_Status_Positive_Negative_'
    ]) as string | null,
    
    art_status: getField(payload, [
      'grp_hiv/art_status_at_referral',
      'art_status_at_referral',
      'grp_hiv/Status_at_the_time_o_at_time_of_referral',
      'Status_at_the_time_o_at_time_of_referral'
    ]) as string | null,
    
    art_number: getField(payload, [
      'grp_hiv/art_number',
      'art_number',
      'grp_hiv/ART_Number_if_on_ART_the_time_of_referral',
      'ART_Number_if_on_ART_the_time_of_referral'
    ]) as string | null,
    
    // Registration
    nikshay_abha_id: getField(payload, [
      'grp_reg/nikshay_abha_id',
      'nikshay_abha_id',
      'grp_reg/NIKSHAY_ABHA_ID',
      'NIKSHAY_ABHA_ID'
    ]) as string | null,
    
    registration_date: normalizeDateToYYYYMMDD(getField(payload, [
      'grp_reg/nikshay_registration_date',
      'nikshay_registration_date',
      'grp_reg/Date_of_registration_dd_mm_yyyy',
      'Date_of_registration_dd_mm_yyyy'
    ])),
    
    // Remarks
    remarks: getField(payload, [
      'grp_reg/remarks',
      'remarks',
      'grp_reg/Remarks',
      'Remarks'
    ]) as string | null,
    
    // Timestamps
    updated_at: new Date().toISOString(),
  };

  console.log(`[webhook] Normalized payload in ${Date.now() - startTime}ms`);
  return normalized;
}

/**
 * Idempotent upsert to Supabase with retry logic
 */
async function upsertPatient(
  data: Record<string, unknown>,
  maxAttempts = 3
): Promise<{ success: boolean; error?: string; operation?: string }> {
  const supabase = getSupabaseClient();
  const kobo_uuid = data.kobo_uuid as string;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error, status } = await supabase
        .from('patients')
        .upsert(data, { onConflict: 'kobo_uuid' });

      if (!error) {
        const operation = status === 201 ? 'inserted' : 'updated';
        console.log(`[webhook] Supabase ${operation}: ${kobo_uuid}`);
        
        // Invalidate all patient-related caches (versioned keys)
        await invalidatePatientCaches();
        console.log('[webhook] ✅ Cache invalidated');
        
        return { success: true, operation };
      }

      console.error(`[webhook] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      if (attempt === maxAttempts) {
        return { success: false, error: error.message };
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] Attempt ${attempt}/${maxAttempts} exception:`, msg);
      
      if (attempt === maxAttempts) {
        return { success: false, error: msg };
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}



/**
 * Create structured JSON response
 */
function jsonResponse(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { 
    status, 
    headers: KOBO_CORS_HEADERS 
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Health check endpoint
 */
export async function GET() {
  return jsonResponse({
    status: 'ok',
    service: 'SAMADHAAN Kobo Webhook',
    timestamp: new Date().toISOString(),
    architecture: 'Supabase-first',
    sheets_sync: ENABLE_SHEETS_SYNC ? 'enabled' : 'disabled',
  }, 200);
}

/**
 * Main webhook receiver
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. VALIDATE SECRET
    // ─────────────────────────────────────────────────────────────────────
    if (!KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] KOBO_WEBHOOK_SECRET not configured');
      return jsonResponse({ 
        success: false,
        stage: 'config',
        error: 'Server configuration error' 
      }, 500);
    }

    const secret = req.headers.get('x-kobo-webhook-secret') 
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    if (!secret || secret !== KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] Unauthorized: invalid secret');
      return jsonResponse({ 
        success: false,
        stage: 'auth',
        error: 'Unauthorized' 
      }, 401);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. PARSE & VALIDATE BODY
    // ─────────────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      console.error('[webhook] Invalid JSON body');
      return jsonResponse({ 
        success: false,
        stage: 'parse',
        error: 'Invalid JSON body' 
      }, 400);
    }

    const uuid = body['_uuid'] ?? body['uuid'];
    if (!uuid) {
      console.error('[webhook] Missing _uuid field');
      return jsonResponse({ 
        success: false,
        stage: 'validation',
        error: 'Missing required field: _uuid' 
      }, 400);
    }

    console.log(`[webhook] Received: ${uuid}`);

    // ─────────────────────────────────────────────────────────────────────
    // 3. NORMALIZE PAYLOAD
    // ─────────────────────────────────────────────────────────────────────
    let normalized: Record<string, unknown>;
    try {
      normalized = normalizeKoboPayload(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Normalization failed';
      console.error('[webhook] Normalization error:', message);
      return jsonResponse({ 
        success: false,
        stage: 'normalization',
        error: message 
      }, 400);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. UPSERT TO SUPABASE (PRIMARY WRITE)
    // ─────────────────────────────────────────────────────────────────────
    const upsertResult = await upsertPatient(normalized, 3);

    if (!upsertResult.success) {
      console.error('[webhook] Supabase upsert failed:', upsertResult.error);
      
      // Return 200 to prevent Kobo retry spam on permanent failures
      return jsonResponse({ 
        success: false,
        stage: 'supabase',
        kobo_uuid: String(uuid),
        error: upsertResult.error,
        duration_ms: Date.now() - startTime
      }, 200);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. FIRE-AND-FORGET SHEETS MIRROR SYNC (NON-BLOCKING)
    // ─────────────────────────────────────────────────────────────────────
    if (ENABLE_SHEETS_SYNC) {
      syncToSheetsAsync(normalized, upsertResult.operation === 'inserted' ? 'insert' : 'update');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────────────────
    const duration = Date.now() - startTime;
    console.log(`[webhook] Success: ${uuid} (${duration}ms)`);

    return jsonResponse({
      success: true,
      kobo_uuid: String(uuid),
      operation: upsertResult.operation,
      duration_ms: duration
    }, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const duration = Date.now() - startTime;
    
    console.error('[webhook] Unhandled error:', message);
    
    return jsonResponse({ 
      success: false,
      stage: 'internal',
      error: 'Internal server error',
      message,
      duration_ms: duration
    }, 500);
  }
}

/**
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204, 
    headers: KOBO_CORS_HEADERS 
  });
}
