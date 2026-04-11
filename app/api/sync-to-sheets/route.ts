import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { appendPatientToSheets, updatePatientInSheets, PatientRecord } from '@/lib/sheetsSync';

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE → GOOGLE SHEETS AUTO-SYNC API
// ═══════════════════════════════════════════════════════════════════════════
// Triggered by Supabase Database Webhook on INSERT/UPDATE to patients table
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  const startTime = Date.now();
  
  try {
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
      recordId: payload.record?.id,
      oldRecordId: payload.old_record?.id
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Extract patient record
    // ═══════════════════════════════════════════════════════════════════════
    // Supabase webhook payload structure:
    // {
    //   type: 'INSERT' | 'UPDATE' | 'DELETE',
    //   table: 'patients',
    //   record: { ...patient data },
    //   old_record: { ...old patient data } (for UPDATE only)
    // }
    
    const webhookType = payload.type;
    const patient: PatientRecord = payload.record;
    
    if (!patient || !patient.id) {
      console.error('[sync-to-sheets] Missing patient record in payload');
      return NextResponse.json(
        { error: 'Missing patient record' },
        { status: 400 }
      );
    }

    // Skip if already synced (safety check)
    if (patient.synced_to_sheets === true) {
      console.log('[sync-to-sheets] Patient already synced, skipping:', patient.id);
      return NextResponse.json({
        success: true,
        message: 'Patient already synced',
        skipped: true
      });
    }

    console.log('[sync-to-sheets] Processing patient:', {
      id: patient.id,
      koboUuid: patient.kobo_uuid,
      uniqueId: patient.unique_id,
      name: patient.inmate_name,
      webhookType
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Sync to Google Sheets with retry logic
    // ═══════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Update Supabase sync status
    // ═══════════════════════════════════════════════════════════════════════
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
        attempts: updateData.sheets_sync_attempts
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Return response
    // ═══════════════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;

    if (syncSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Patient synced to Google Sheets',
        data: {
          patientId: patient.id,
          koboUuid: patient.kobo_uuid,
          rowsAppended: syncResult?.rowsAppended || 1,
          attempts: attempt,
          duration: `${duration}ms`
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to sync to Google Sheets after max retries',
        error: lastError,
        data: {
          patientId: patient.id,
          attempts: attempt,
          duration: `${duration}ms`
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[sync-to-sheets] Unhandled error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      duration: `${duration}ms`
    }, { status: 500 });
  }
}

/**
 * Manual retry endpoint for failed syncs
 * PUT /api/sync-to-sheets
 * Body: { patientId: string }
 */
export async function PUT(req: NextRequest) {
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
