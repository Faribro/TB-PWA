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
const MAX_RETRY_ATTEMPTS = 1; // Single attempt only (no retries)
const RETRY_DELAY_MS = 500;
const BATCH_SIZE = 3; // Process 3 records in parallel (faster)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync patient via Google Apps Script webhook (fallback method)
 */
async function syncPatientViaWebhook(patient: any): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  console.log('[backfill] Webhook sync attempt:', {
    hasUrl: !!webhookUrl,
    patientId: patient.id,
    koboUuid: patient.kobo_uuid
  });
  
  if (!webhookUrl) {
    return { success: false, error: 'GOOGLE_SCRIPT_WEBHOOK_URL not configured' };
  }

  try {
    // Format payload for Google Apps Script batch handler
    const payload = {
      batch: [patient],
      batch_id: `backfill-${patient.id || Date.now()}`
    };
    
    console.log('[backfill] Sending to webhook:', webhookUrl.substring(0, 50) + '...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('[backfill] Webhook response:', { status: response.status, body: text.substring(0, 200) });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}: ${text}` };
    }

    const result = JSON.parse(text);
    
    if (result.status !== 'success' || result.appended_count === 0) {
      return { 
        success: false, 
        error: result.error || `No records appended (duplicates: ${result.duplicate_count || 0})` 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[backfill] Webhook error:', error);
    return { success: false, error: error.message };
  }
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
      // Try Google Sheets API first (if properly configured)
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey && serviceAccountKey.trim().length > 0) {
        try {
          const patientRecord: PatientRecord = patient;
          const syncResult = await appendPatientToSheets(patientRecord);
          
          if (syncResult.success) {
            return { success: true };
          } else {
            lastError = syncResult.error;
          }
        } catch (apiError: any) {
          console.log('[backfill] API sync failed, trying webhook fallback:', apiError.message);
          lastError = apiError.message;
        }
      }
      
      // Fallback to webhook (always try if API failed or not configured)
      const webhookResult = await syncPatientViaWebhook(patient);
      if (webhookResult.success) {
        return { success: true };
      } else {
        lastError = webhookResult.error;
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

    // Check for query parameters
    const body = await req.json().catch(() => ({}));
    const retryStuck = body.retry_stuck === true;
    const limit = Math.min(body.limit || 200, 200); // Max 200 per batch

    console.log('[backfill] Starting backfill process...', { retryStuck, limit });
    console.log('[backfill] Environment check:', {
      hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasWebhookUrl: !!process.env.GOOGLE_SCRIPT_WEBHOOK_URL,
      webhookUrl: process.env.GOOGLE_SCRIPT_WEBHOOK_URL?.substring(0, 50) + '...'
    });

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
      .limit(Math.min(limit, 1)); // Max 1 record per API call

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
    // STEP 3: Process patients in parallel batches (faster, no rate limit)
    // ═══════════════════════════════════════════════════════════════════════
    const results = {
      total: patients.length,
      synced: 0,
      failed: 0,
      failures: [] as Array<{ id: number; inmate_name: string; error: string }>
    };

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < patients.length; i += BATCH_SIZE) {
      const batch = patients.slice(i, i + BATCH_SIZE);
      
      console.log(`[backfill] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(patients.length / BATCH_SIZE)}`);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (patient: any) => {
          try {
            // Sync to Google Sheets via API
            const syncResult = await syncPatientViaAPI(patient);

            // Update Supabase sync status
            const currentAttempts = patient.sheets_sync_attempts || 0;
            const updateData: any = {
              synced_to_sheets: syncResult.success,
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
                id: Number(patient.id),
                inmate_name: patient.inmate_name || 'Unknown',
                error: syncResult.error || 'Unknown error'
              });
            }

            // Update Supabase
            await supabase
              .from('patients')
              .update(updateData)
              .eq('id', patient.id);

          } catch (error: any) {
            console.error(`[backfill] Error processing patient ${patient.id}:`, error);
            results.failed++;
            results.failures.push({
              id: Number(patient.id),
              inmate_name: patient.inmate_name || 'Unknown',
              error: error.message
            });
          }
        })
      );
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
