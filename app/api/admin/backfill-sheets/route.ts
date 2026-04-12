import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { appendPatientToSheets, PatientRecord } from '@/lib/sheetsSync';

// ═══════════════════════════════════════════════════════════════════════════
// ONE-TIME BACKFILL SCRIPT - SYNC UNSYNCED PATIENTS VIA GOOGLE APPS SCRIPT
// ═══════════════════════════════════════════════════════════════════════════
// Uses the same webhook as PATH 3 (patient-sync) which already has permissions
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 500;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync patient via Google Sheets API
 */
async function syncPatientViaAPI(patient: any): Promise<{ success: boolean; error?: string }> {
  let attempt = 0;
  let lastError: string | undefined;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    attempt++;
    
    try {
      const patientRecord: PatientRecord = patient;
      const syncResult = await appendPatientToSheets(patientRecord);
      
      if (syncResult.success) {
        return { success: true };
      } else {
        lastError = syncResult.error;
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    } catch (error: any) {
      lastError = error.message;
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return { success: false, error: lastError || 'Unknown error after max retries' };
}

/**
 * Backfill endpoint
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Validate admin secret
    // ═══════════════════════════════════════════════════════════════════════
    const adminSecret = req.headers.get('x-admin-secret');
    
    if (!adminSecret || adminSecret !== SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin secret' },
        { status: 401 }
      );
    }

    // Check for retry-stuck query parameter
    const url = new URL(req.url);
    const retryStuck = url.searchParams.get('retry-stuck') === 'true';

    console.log('[backfill] Starting backfill process...', { retryStuck });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Query unsynced patients
    // ═══════════════════════════════════════════════════════════════════════
    let query = supabase
      .from('patients')
      .select('*')
      .or('synced_to_sheets.is.null,synced_to_sheets.eq.false');
    
    // If retry-stuck=true, include stuck records (3+ attempts)
    // Otherwise, only include records with < 3 attempts
    if (!retryStuck) {
      query = query.lt('sheets_sync_attempts', 3);
    }
    
    const { data: patients, error: queryError } = await query
      .order('created_at', { ascending: true })
      .limit(200);

    if (queryError) {
      console.error('[backfill] Query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to query patients', details: queryError.message },
        { status: 500 }
      );
    }

    if (!patients || patients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unsynced patients found',
        total: 0,
        synced: 0,
        failed: 0,
        failures: []
      });
    }

    console.log(`[backfill] Found ${patients.length} unsynced patients`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Process each patient with rate limiting
    // ═══════════════════════════════════════════════════════════════════════
    const results = {
      total: patients.length,
      synced: 0,
      failed: 0,
      failures: [] as Array<{ id: number; inmate_name: string; error: string }>
    };

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i] as PatientRecord;
      
      console.log(`[backfill] Processing ${i + 1}/${patients.length}: ${patient.inmate_name} (ID: ${patient.id})`);

      try {
        // Sync to Google Sheets via API
        const syncResult = await syncPatientViaAPI(patient);

        // Update Supabase sync status
        const currentAttempts = patient.sheets_sync_attempts || 0;
        const updateData: any = {
          synced_to_sheets: syncResult.success,
          // Reset attempts to 1 if this was a stuck record retry, otherwise increment
          sheets_sync_attempts: (retryStuck && syncResult.success) ? 0 : currentAttempts + 1
        };

        if (syncResult.success) {
          updateData.sheets_sync_error = null;
          updateData.sheets_synced_at = new Date().toISOString();
          results.synced++;
        } else {
          updateData.sheets_sync_error = syncResult.error;
          results.failed++;
          results.failures.push({
            id: patient.id as number,
            inmate_name: patient.inmate_name || 'Unknown',
            error: syncResult.error || 'Unknown error'
          });
        }

        // Update Supabase
        const { error: updateError } = await supabase
          .from('patients')
          .update(updateData)
          .eq('id', patient.id);

        if (updateError) {
          console.error(`[backfill] Failed to update patient ${patient.id}:`, updateError);
        }

        // Rate limiting delay (except for last patient)
        if (i < patients.length - 1) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }

      } catch (error: any) {
        console.error(`[backfill] Error processing patient ${patient.id}:`, error);
        results.failed++;
        results.failures.push({
          id: patient.id as number,
          inmate_name: patient.inmate_name || 'Unknown',
          error: error.message
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Return results
    // ═══════════════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;
    
    console.log('[backfill] Backfill complete:', {
      total: results.total,
      synced: results.synced,
      failed: results.failed,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${results.synced}/${results.total} synced`,
      ...results,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    console.error('[backfill] Unhandled error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}
