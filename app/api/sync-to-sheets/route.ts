import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { appendPatientToSheets, updatePatientInSheets, PatientRecord } from '@/lib/sheetsSync';

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE → GOOGLE SHEETS AUTO-SYNC API
// ═══════════════════════════════════════════════════════════════════════════
// Triggered by Supabase Database Webhook on INSERT/UPDATE to patients table
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Get Supabase client at request time (not build time)
 */
function getSupabaseClient() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Health check endpoint
 */
export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return NextResponse.json({
    status: 'ok',
    service: 'SAMADHAAN Sheets Sync Webhook',
    timestamp: new Date().toISOString(),
    config: {
      supabaseConfigured: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY,
      webhookSecretConfigured: !!WEBHOOK_SECRET,
      googleSheetsConfigured: !!process.env.GOOGLE_SHEET_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    }
  });
}

/**
 * Webhook receiver from Supabase Database Webhook
 */
export async function POST(req: NextRequest) {
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Validate webhook secret
  // ═══════════════════════════════════════════════════════════════════════
  const secret = req.headers.get('x-webhook-secret') 
    || req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!WEBHOOK_SECRET) {
    console.error('[sync-to-sheets] SUPABASE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  if (!secret || secret !== WEBHOOK_SECRET) {
    console.error('[sync-to-sheets] Unauthorized webhook attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Parse webhook payload
  // ═══════════════════════════════════════════════════════════════════════
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  console.log('[sync-to-sheets] Webhook received:', {
    type: payload.type,
    table: payload.table,
    recordId: payload.record?.id
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Return 200 IMMEDIATELY (Supabase pg_net 5s timeout)
  // ═══════════════════════════════════════════════════════════════════════
  const response = NextResponse.json({ status: 'queued' }, { status: 200 });

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Process in background using waitUntil
  // ═══════════════════════════════════════════════════════════════════════
  const ctx = (req as any)[Symbol.for('vercel.request.context')];
  if (ctx?.waitUntil) {
    ctx.waitUntil(processSheetSync(payload));
  } else {
    // Fallback for local dev (non-blocking)
    processSheetSync(payload).catch(err => {
      console.error('[sync-to-sheets] Background processing error:', err);
    });
  }

  return response;
}

/**
 * Background processing function for sheet sync
 */
async function processSheetSync(payload: any): Promise<void> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  try {
    // Extract patient record
    const webhookType = payload.type;
    const patient: PatientRecord = payload.record;
    
    if (!patient || !patient.id) {
      console.error('[sync-to-sheets] Missing patient record in payload');
      return;
    }

    // Skip if already synced (safety check)
    if (patient.synced_to_sheets === true) {
      console.log('[sync-to-sheets] Patient already synced, skipping:', patient.id);
      return;
    }

    console.log('[sync-to-sheets] Processing patient:', {
      id: patient.id,
      koboUuid: patient.kobo_uuid,
      uniqueId: patient.unique_id,
      name: patient.inmate_name,
      webhookType
    });

    // Sync to Google Sheets with retry logic
    let syncResult;
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < MAX_RETRY_ATTEMPTS) {
      attempt++;
      
      console.log(`[sync-to-sheets] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      try {
        // Use update if patient has kobo_uuid (might already exist in sheet)
        // Otherwise append as new row
        if (webhookType === 'UPDATE' && patient.kobo_uuid) {
          syncResult = await updatePatientInSheets(patient);
        } else {
          syncResult = await appendPatientToSheets(patient);
        }

        if (syncResult.success) {
          console.log(`[sync-to-sheets] ✅ Sync successful on attempt ${attempt}`);
          break;
        } else {
          lastError = syncResult.error;
          console.error(`[sync-to-sheets] ❌ Attempt ${attempt} failed:`, syncResult.error);
          
          if (attempt < MAX_RETRY_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
          }
        }
      } catch (error: any) {
        lastError = error.message;
        console.error(`[sync-to-sheets] ❌ Attempt ${attempt} exception:`, error);
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    // Update Supabase sync status
    const syncSuccess = syncResult?.success || false;
    const currentAttempts = patient.sheets_sync_attempts || 0;

    const updateData: any = {
      synced_to_sheets: syncSuccess,
      sheets_sync_attempts: currentAttempts + attempt
    };

    if (syncSuccess) {
      updateData.sheets_sync_error = null;
      updateData.sheets_synced_at = new Date().toISOString();
    } else {
      updateData.sheets_sync_error = lastError || 'Unknown error after max retries';
    }

    const { error: updateError } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patient.id);

    if (updateError) {
      console.error('[sync-to-sheets] Failed to update sync status in Supabase:', updateError);
    } else {
      console.log('[sync-to-sheets] Updated sync status in Supabase:', {
        patientId: patient.id,
        synced: syncSuccess,
        attempts: updateData.sheets_sync_attempts,
        duration: `${Date.now() - startTime}ms`
      });
    }
  } catch (error: any) {
    console.error('[sync-to-sheets] Background processing error:', error);
  }
}

/**
 * Manual retry endpoint for failed syncs
 * PUT /api/sync-to-sheets
 * Body: { patientId: string }
 */
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    const { patientId } = await req.json();
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId' },
        { status: 400 }
      );
    }

    // Fetch patient from Supabase
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Attempt sync
    const syncResult = patient.kobo_uuid
      ? await updatePatientInSheets(patient)
      : await appendPatientToSheets(patient);

    // Update Supabase
    const updateData: any = {
      synced_to_sheets: syncResult.success,
      sheets_sync_attempts: (patient.sheets_sync_attempts || 0) + 1
    };

    if (syncResult.success) {
      updateData.sheets_sync_error = null;
      updateData.sheets_synced_at = new Date().toISOString();
    } else {
      updateData.sheets_sync_error = syncResult.error;
    }

    await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId);

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.message,
      data: {
        patientId,
        attempts: updateData.sheets_sync_attempts
      }
    });

  } catch (error: any) {
    console.error('[sync-to-sheets] Manual retry error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
